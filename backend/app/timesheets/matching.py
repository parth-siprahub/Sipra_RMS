"""Multi-tier employee matching engine for Jira/AWS identity resolution.

Matching tiers (in order):
1. Exact match against employee_system_mappings table
2. Exact match fallback against employees.jira_username / aws_email / rms_name
3. Username-to-name conversion (e.g. "harinath.sirigiri" -> "Harinath Sirigiri")
4. Normalized substring matching
5. Token-set overlap matching
6. rapidfuzz token_set_ratio >= 90% (auto-links Display Names, e.g. "Rajesh Sai Krishna V")
7. Levenshtein distance (suggestions only, never auto-linked)
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional

try:
    from rapidfuzz import fuzz as _rf_fuzz
    _RAPIDFUZZ_AVAILABLE = True
except ImportError:  # pragma: no cover
    _rf_fuzz = None  # type: ignore[assignment]
    _RAPIDFUZZ_AVAILABLE = False

# Minimum rapidfuzz token_set_ratio score (0–100) for auto-linking a Display Name
_RF_AUTO_LINK_THRESHOLD = 90

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

class Confidence(str, Enum):
    """Match confidence level."""
    EXACT = "EXACT"
    ALIAS = "ALIAS"
    FUZZY = "FUZZY"
    NONE = "NONE"


@dataclass(frozen=True)
class MatchResult:
    """Result of an employee match attempt."""
    employee_id: Optional[int]
    confidence: Confidence
    match_type: str
    matched_value: str = ""

    @property
    def is_matched(self) -> bool:
        return self.confidence in (Confidence.EXACT, Confidence.ALIAS, Confidence.FUZZY)


@dataclass(frozen=True)
class Suggestion:
    """A fuzzy match suggestion (not auto-linked)."""
    employee_id: int
    rms_name: str
    score: float  # 0.0 – 1.0, higher is better
    match_type: str


# ---------------------------------------------------------------------------
# Internal employee record used for matching
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class _EmployeeRecord:
    id: int
    rms_name: str
    rms_name_lower: str
    rms_name_normalized: str
    rms_name_tokens: frozenset[str]
    jira_username_lower: str
    aws_email_lower: str
    exit_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Pure-Python Levenshtein distance
# ---------------------------------------------------------------------------

def _levenshtein(s: str, t: str) -> int:
    """Compute Levenshtein edit distance between two strings.

    Uses the classic dynamic-programming approach with O(min(m,n)) space.
    """
    if len(s) < len(t):
        return _levenshtein(t, s)
    if len(t) == 0:
        return len(s)

    prev_row = list(range(len(t) + 1))
    for i, sc in enumerate(s):
        curr_row = [i + 1]
        for j, tc in enumerate(t):
            cost = 0 if sc == tc else 1
            curr_row.append(min(
                curr_row[j] + 1,       # insert
                prev_row[j + 1] + 1,   # delete
                prev_row[j] + cost,     # substitute
            ))
        prev_row = curr_row
    return prev_row[-1]


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

_SEPARATOR_RE = re.compile(r"[._\-]+")
_NON_ALPHA_SPACE_RE = re.compile(r"[^a-z\s]")
_MULTI_SPACE_RE = re.compile(r"\s+")


def _username_to_name(identifier: str) -> str:
    """Convert a username like 'harinath.sirigiri' to 'Harinath Sirigiri'."""
    return _SEPARATOR_RE.sub(" ", identifier).strip().title()


def _normalize(text: str) -> str:
    """Collapse to lowercase alpha + single spaces. Strips accents."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = _NON_ALPHA_SPACE_RE.sub("", text)
    text = _MULTI_SPACE_RE.sub(" ", text).strip()
    return text


def _tokenize(text: str) -> frozenset[str]:
    """Split normalised text into word tokens."""
    normalized = _normalize(text)
    if not normalized:
        return frozenset()
    return frozenset(normalized.split())


def _strip_email_domain(identifier: str) -> str:
    """Strip @domain from an email address if present."""
    at_idx = identifier.find("@")
    if at_idx > 0:
        return identifier[:at_idx]
    return identifier


# ---------------------------------------------------------------------------
# EmployeeMatcher
# ---------------------------------------------------------------------------

class EmployeeMatcher:
    """Multi-tier matching engine for resolving external identifiers to employees.

    Usage::

        matcher = EmployeeMatcher()
        await matcher.load(client)
        result = matcher.match("harinath.sirigiri", system="JIRA")
        suggestions = matcher.suggest("SatishP", system="JIRA", top_n=3)
    """

    def __init__(self) -> None:
        # system_name upper -> external_uid lower -> employee_id
        self._mapping_index: dict[str, dict[str, int]] = {}
        # All employee records for fuzzy matching
        self._employees: list[_EmployeeRecord] = []
        # employee_id -> rms_name (for suggestion display)
        self._id_to_name: dict[int, str] = {}
        self._loaded = False

    async def load(self, client: object) -> None:
        """Pre-load employees and system mappings from Supabase.

        Args:
            client: An async Supabase client (from get_supabase_admin_async).
        """
        # Load system mappings -------------------------------------------------
        mapping_resp = await client.table("employee_system_mappings").select(  # type: ignore[union-attr]
            "employee_id, system_name, external_uid"
        ).execute()

        self._mapping_index.clear()
        for row in mapping_resp.data or []:
            sys_name = (row.get("system_name") or "").upper()
            ext_uid = (row.get("external_uid") or "").strip().lower()
            emp_id = row.get("employee_id")
            if sys_name and ext_uid and emp_id is not None:
                self._mapping_index.setdefault(sys_name, {})[ext_uid] = emp_id

        # Load employees -------------------------------------------------------
        emp_resp = await client.table("employees").select(  # type: ignore[union-attr]
            "id, rms_name, jira_username, aws_email, exit_date"
        ).execute()

        self._employees.clear()
        self._id_to_name.clear()
        for row in emp_resp.data or []:
            emp_id = row.get("id")
            rms_name = (row.get("rms_name") or "").strip()
            jira = (row.get("jira_username") or "").strip()
            aws = (row.get("aws_email") or "").strip()

            if emp_id is None or not rms_name:
                continue

            # Parse exit_date from ISO string if present
            raw_exit = row.get("exit_date")
            parsed_exit: Optional[date] = None
            if raw_exit:
                try:
                    parsed_exit = date.fromisoformat(str(raw_exit)[:10])
                except ValueError:
                    pass

            rec = _EmployeeRecord(
                id=emp_id,
                rms_name=rms_name,
                rms_name_lower=rms_name.lower(),
                rms_name_normalized=_normalize(rms_name),
                rms_name_tokens=_tokenize(rms_name),
                jira_username_lower=jira.lower(),
                aws_email_lower=aws.lower(),
                exit_date=parsed_exit,
            )
            self._employees.append(rec)
            self._id_to_name[emp_id] = rms_name

        self._loaded = True
        logger.info(
            "EmployeeMatcher loaded: %d employees, %d system mappings",
            len(self._employees),
            sum(len(v) for v in self._mapping_index.values()),
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def match(self, identifier: str, system: str) -> MatchResult:
        """Attempt to match an external identifier to an employee.

        Runs through all matching tiers in order and returns the first
        match found. Levenshtein matches are never auto-linked (they
        appear only via ``suggest``).

        Args:
            identifier: The external username / email to resolve.
            system: System name — "JIRA" or "AWS".

        Returns:
            A ``MatchResult`` with employee_id, confidence, and description.
        """
        if not self._loaded:
            raise RuntimeError("EmployeeMatcher.load() must be called before match()")

        identifier = identifier.strip()
        if not identifier:
            return MatchResult(
                employee_id=None,
                confidence=Confidence.NONE,
                match_type="empty identifier",
            )

        ident_lower = identifier.lower()
        sys_upper = system.upper()

        # Tier 1 — exact match via employee_system_mappings
        sys_map = self._mapping_index.get(sys_upper)
        if sys_map:
            emp_id = sys_map.get(ident_lower)
            if emp_id is not None:
                return MatchResult(
                    employee_id=emp_id,
                    confidence=Confidence.EXACT,
                    match_type="system_mapping",
                    matched_value=self._id_to_name.get(emp_id, ""),
                )

        # Tier 2 — exact match against employees columns
        result = self._match_employee_columns(ident_lower, sys_upper)
        if result is not None:
            return result

        # Prepare derived forms for fuzzy tiers
        local_part = _strip_email_domain(ident_lower)
        converted_name = _username_to_name(local_part)
        converted_lower = converted_name.lower()
        ident_normalized = _normalize(identifier)
        ident_tokens = _tokenize(identifier)

        # Tier 3 — username-to-name conversion
        for emp in self._employees:
            if emp.rms_name_lower == converted_lower:
                return MatchResult(
                    employee_id=emp.id,
                    confidence=Confidence.ALIAS,
                    match_type="username_to_name",
                    matched_value=emp.rms_name,
                )

        # Tier 4 — normalised substring
        if ident_normalized and len(ident_normalized) >= 3:
            for emp in self._employees:
                if not emp.rms_name_normalized:
                    continue
                # Check both directions: identifier in rms_name, or rms_name in identifier
                if (
                    ident_normalized in emp.rms_name_normalized
                    or emp.rms_name_normalized in ident_normalized
                ):
                    return MatchResult(
                        employee_id=emp.id,
                        confidence=Confidence.FUZZY,
                        match_type="normalized_substring",
                        matched_value=emp.rms_name,
                    )

        # Tier 5 — token-set overlap
        if ident_tokens and len(ident_tokens) >= 2:
            best_emp: Optional[_EmployeeRecord] = None
            best_overlap = 0
            for emp in self._employees:
                if not emp.rms_name_tokens:
                    continue
                overlap = len(ident_tokens & emp.rms_name_tokens)
                if overlap >= 2 and overlap > best_overlap:
                    # Require at least 2 token overlap AND all query tokens present
                    if ident_tokens <= emp.rms_name_tokens:
                        best_emp = emp
                        best_overlap = overlap
            if best_emp is not None:
                return MatchResult(
                    employee_id=best_emp.id,
                    confidence=Confidence.FUZZY,
                    match_type="token_set_match",
                    matched_value=best_emp.rms_name,
                )

        # Tier 6 — rapidfuzz token_set_ratio for Display Name auto-linking.
        # Handles "Rajesh Sai Krishna V" (Jira Display Name) → "RAJESH SAI KRISHNA V" (RMS).
        # Only fires when rapidfuzz is installed (production requirement).
        if _RAPIDFUZZ_AVAILABLE:
            best_rf_emp: Optional[_EmployeeRecord] = None
            best_rf_score = 0.0
            for emp in self._employees:
                if not emp.rms_name_normalized or not ident_normalized:
                    continue
                score = _rf_fuzz.token_set_ratio(ident_normalized, emp.rms_name_normalized)
                if score > best_rf_score:
                    best_rf_score = score
                    best_rf_emp = emp
            if best_rf_emp is not None and best_rf_score >= _RF_AUTO_LINK_THRESHOLD:
                logger.debug(
                    "Tier 6 rapidfuzz: '%s' → '%s' (score=%s)",
                    identifier, best_rf_emp.rms_name, best_rf_score,
                )
                return MatchResult(
                    employee_id=best_rf_emp.id,
                    confidence=Confidence.FUZZY,
                    match_type=f"rapidfuzz_display_name:{best_rf_score:.0f}",
                    matched_value=best_rf_emp.rms_name,
                )

        # Tier 7 — Levenshtein is suggestion-only, not auto-linked
        return MatchResult(
            employee_id=None,
            confidence=Confidence.NONE,
            match_type="no_match",
        )

    def suggest(
        self,
        identifier: str,
        system: str,
        top_n: int = 3,
    ) -> list[Suggestion]:
        """Return top-N fuzzy suggestions for an unmatched identifier.

        Combines normalised-substring, token-overlap, and Levenshtein
        scores. Results are sorted by descending score.

        Args:
            identifier: The external username / email to find suggestions for.
            system: System name — "JIRA" or "AWS".
            top_n: Maximum number of suggestions to return.

        Returns:
            A list of ``Suggestion`` objects, possibly empty.
        """
        if not self._loaded:
            raise RuntimeError("EmployeeMatcher.load() must be called before suggest()")

        identifier = identifier.strip()
        if not identifier:
            return []

        local_part = _strip_email_domain(identifier.lower())
        converted_name_lower = _username_to_name(local_part).lower()
        ident_normalized = _normalize(identifier)
        ident_tokens = _tokenize(identifier)

        scored: list[Suggestion] = []

        for emp in self._employees:
            best_score = 0.0
            best_type = ""

            # Normalised substring score
            if ident_normalized and emp.rms_name_normalized:
                if ident_normalized in emp.rms_name_normalized:
                    ratio = len(ident_normalized) / max(len(emp.rms_name_normalized), 1)
                    sub_score = 0.5 + 0.4 * ratio  # 0.5–0.9 range
                    if sub_score > best_score:
                        best_score = sub_score
                        best_type = "normalized_substring"
                elif emp.rms_name_normalized in ident_normalized:
                    ratio = len(emp.rms_name_normalized) / max(len(ident_normalized), 1)
                    sub_score = 0.5 + 0.4 * ratio
                    if sub_score > best_score:
                        best_score = sub_score
                        best_type = "normalized_substring"

            # Token-set overlap score
            if ident_tokens and emp.rms_name_tokens:
                overlap = len(ident_tokens & emp.rms_name_tokens)
                if overlap >= 1:
                    union_size = len(ident_tokens | emp.rms_name_tokens)
                    token_score = overlap / max(union_size, 1)
                    if token_score > best_score:
                        best_score = token_score
                        best_type = "token_set_overlap"

            # Levenshtein score (on converted name vs rms_name)
            if converted_name_lower and emp.rms_name_lower:
                dist = _levenshtein(converted_name_lower, emp.rms_name_lower)
                max_len = max(len(converted_name_lower), len(emp.rms_name_lower))
                if max_len > 0:
                    lev_score = 1.0 - (dist / max_len)
                    # Only consider if distance is small relative to name length
                    threshold = 2 if max_len <= 10 else 3
                    if dist <= threshold and lev_score > best_score:
                        best_score = lev_score
                        best_type = "levenshtein"

            if best_score > 0.2:  # minimum threshold to be a suggestion
                scored.append(Suggestion(
                    employee_id=emp.id,
                    rms_name=emp.rms_name,
                    score=round(best_score, 3),
                    match_type=best_type,
                ))

        scored.sort(key=lambda s: s.score, reverse=True)
        return scored[:top_n]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _match_employee_columns(
        self, ident_lower: str, sys_upper: str,
    ) -> Optional[MatchResult]:
        """Tier 2: match against jira_username, aws_email, rms_name columns.

        Three separate passes are intentional: explicit system-field mappings
        (jira_username / aws_email) must win over rms_name collisions.  This
        matters when two employees share the same rms_name but only one has an
        explicit jira_username set — the single-pass approach would match the
        wrong (often EXITED) employee whose rms_name appears first in the list.
        """
        # Pass 1 — explicit system-field (highest priority)
        for emp in self._employees:
            if sys_upper == "JIRA" and emp.jira_username_lower == ident_lower:
                return MatchResult(
                    employee_id=emp.id,
                    confidence=Confidence.EXACT,
                    match_type="jira_username_column",
                    matched_value=emp.rms_name,
                )
            if sys_upper == "AWS" and emp.aws_email_lower == ident_lower:
                return MatchResult(
                    employee_id=emp.id,
                    confidence=Confidence.EXACT,
                    match_type="aws_email_column",
                    matched_value=emp.rms_name,
                )

        # Pass 2 — rms_name fallback (only reached when no explicit field matched)
        for emp in self._employees:
            if emp.rms_name_lower == ident_lower:
                return MatchResult(
                    employee_id=emp.id,
                    confidence=Confidence.EXACT,
                    match_type="rms_name_column",
                    matched_value=emp.rms_name,
                )
        return None
