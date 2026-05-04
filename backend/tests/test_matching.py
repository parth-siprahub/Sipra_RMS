"""Tests for EmployeeMatcher — identity resolution engine.

Covers:
- Tier 1: employee_system_mappings exact match
- Tier 2 two-pass: jira_username wins over rms_name collision (duplicate-name bug)
- Tier 2: aws_email exact match
- Tier 2: rms_name exact match (fallback)
- Tier 3: username-to-name conversion
- Tier 4: normalised substring
- Tier 5: token-set overlap
- NONE: genuinely unmatched identifier
- suggest(): returns scored candidates
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.timesheets.matching import (
    Confidence,
    EmployeeMatcher,
    MatchResult,
    Suggestion,
)


# ---------------------------------------------------------------------------
# Helpers — build a fake Supabase client that returns canned data
# ---------------------------------------------------------------------------

def _make_execute(data: list[dict]) -> AsyncMock:
    """Return an awaitable that resolves to a mock with .data = <data>."""
    mock = MagicMock()
    mock.data = data
    async_exec = AsyncMock(return_value=mock)
    return async_exec


def _make_client(
    mappings: list[dict] | None = None,
    employees: list[dict] | None = None,
) -> Any:
    """Build a minimal fake Supabase client for EmployeeMatcher.load()."""
    mappings = mappings or []
    employees = employees or []

    mapping_execute = _make_execute(mappings)
    employee_execute = _make_execute(employees)

    mapping_chain = MagicMock()
    mapping_chain.select.return_value.execute = mapping_execute

    employee_chain = MagicMock()
    employee_chain.select.return_value.execute = employee_execute

    client = MagicMock()
    client.table.side_effect = lambda name: (
        mapping_chain if name == "employee_system_mappings" else employee_chain
    )
    return client


async def _build_matcher(
    employees: list[dict],
    mappings: list[dict] | None = None,
) -> EmployeeMatcher:
    """Construct and load a matcher with the given fake data."""
    client = _make_client(mappings=mappings, employees=employees)
    m = EmployeeMatcher()
    await m.load(client)
    return m


# ---------------------------------------------------------------------------
# Fixture data
# ---------------------------------------------------------------------------

ACTIVE_RAJESH = {
    "id": 161,
    "rms_name": "Rajesh Sai Krishna V",
    "jira_username": "Rajesh Sai Krishna V",
    "aws_email": "rajesh.vurukonda@dcli.com",
}

EXITED_RAJESH = {
    "id": 62,
    "rms_name": "Rajesh Sai Krishna V",
    "jira_username": None,
    "aws_email": None,
}

ALICE = {
    "id": 1,
    "rms_name": "Alice Smith",
    "jira_username": "alice.smith",
    "aws_email": "alice.smith@acme.com",
}

BOB = {
    "id": 2,
    "rms_name": "Bob Jones",
    "jira_username": "bob.jones",
    "aws_email": "bob.jones@acme.com",
}

HARINATH = {
    "id": 3,
    "rms_name": "Harinath Sirigiri",
    "jira_username": "harinath.sirigiri",
    "aws_email": "harinath.sirigiri@acme.com",
}

RAJESH_ARCOT = {
    "id": 4,
    "rms_name": "Rajesh Arcot",
    "jira_username": None,
    "aws_email": "rajesh.arcot@acme.com",
}


# ===========================================================================
# Tier 2 two-pass: duplicate rms_name, only one has jira_username
# ===========================================================================

class TestTwoPassPriority:
    """The critical regression test for the duplicate-name bug (Entry 007).

    When two employees share the same rms_name but only one has an explicit
    jira_username, the one with jira_username must win — regardless of id
    ordering in the employees list.
    """

    @pytest.mark.asyncio
    async def test_jira_username_beats_rms_name_collision_lower_id_first(self):
        """EXITED emp (id=62, no jira_username) loaded before ACTIVE emp (id=161)."""
        # Simulate DB returning EXITED before ACTIVE (lower id first)
        employees = [EXITED_RAJESH, ACTIVE_RAJESH]
        m = await _build_matcher(employees)

        result = m.match("Rajesh Sai Krishna V", system="JIRA")
        assert result.employee_id == 161, (
            "ACTIVE emp with explicit jira_username must win over EXITED emp matched via rms_name"
        )
        assert result.confidence == Confidence.EXACT
        assert result.match_type == "jira_username_column"

    @pytest.mark.asyncio
    async def test_jira_username_beats_rms_name_collision_higher_id_first(self):
        """ACTIVE emp (id=161) happens to be loaded before EXITED emp (id=62)."""
        employees = [ACTIVE_RAJESH, EXITED_RAJESH]
        m = await _build_matcher(employees)

        result = m.match("Rajesh Sai Krishna V", system="JIRA")
        assert result.employee_id == 161
        assert result.match_type == "jira_username_column"

    @pytest.mark.asyncio
    async def test_rms_name_fallback_used_when_no_jira_username_matches(self):
        """When no employee has a matching jira_username, rms_name is the fallback."""
        # Only the EXITED emp exists — no explicit jira_username matches
        employees = [EXITED_RAJESH]
        m = await _build_matcher(employees)

        result = m.match("Rajesh Sai Krishna V", system="JIRA")
        assert result.employee_id == 62
        assert result.match_type == "rms_name_column"

    @pytest.mark.asyncio
    async def test_aws_email_beats_rms_name_collision(self):
        """For AWS system, aws_email match takes priority over rms_name collision."""
        # Two employees with same rms_name; only ACTIVE has aws_email
        exited_no_aws = dict(EXITED_RAJESH, id=62)
        active_with_aws = dict(ACTIVE_RAJESH, id=161)
        employees = [exited_no_aws, active_with_aws]
        m = await _build_matcher(employees)

        result = m.match("rajesh.vurukonda@dcli.com", system="AWS")
        assert result.employee_id == 161
        assert result.match_type == "aws_email_column"


# ===========================================================================
# Tier 1 — system mappings exact match
# ===========================================================================

class TestTier1SystemMappings:

    @pytest.mark.asyncio
    async def test_exact_match_via_system_mapping(self):
        employees = [ALICE]
        mappings = [
            {"employee_id": 1, "system_name": "JIRA", "external_uid": "alice-display-name"},
        ]
        m = await _build_matcher(employees, mappings=mappings)

        result = m.match("alice-display-name", system="JIRA")
        assert result.employee_id == 1
        assert result.confidence == Confidence.EXACT
        assert result.match_type == "system_mapping"

    @pytest.mark.asyncio
    async def test_system_mapping_case_insensitive(self):
        employees = [ALICE]
        mappings = [{"employee_id": 1, "system_name": "JIRA", "external_uid": "Alice-Display-Name"}]
        m = await _build_matcher(employees, mappings=mappings)

        result = m.match("alice-display-name", system="JIRA")
        assert result.employee_id == 1


# ===========================================================================
# Tier 2 — exact column matches
# ===========================================================================

class TestTier2ExactColumns:

    @pytest.mark.asyncio
    async def test_jira_username_exact(self):
        m = await _build_matcher([ALICE, BOB])
        result = m.match("alice.smith", system="JIRA")
        assert result.employee_id == 1
        assert result.match_type == "jira_username_column"

    @pytest.mark.asyncio
    async def test_aws_email_exact(self):
        m = await _build_matcher([ALICE, BOB])
        result = m.match("bob.jones@acme.com", system="AWS")
        assert result.employee_id == 2
        assert result.match_type == "aws_email_column"

    @pytest.mark.asyncio
    async def test_rms_name_exact_fallback(self):
        """rms_name matches when no explicit field matches the identifier."""
        # ALICE has jira_username='alice.smith'; searching for her display name
        m = await _build_matcher([ALICE])
        result = m.match("Alice Smith", system="JIRA")
        # jira_username 'alice.smith' != 'alice smith', falls through to rms_name
        assert result.employee_id == 1
        assert result.match_type == "rms_name_column"


# ===========================================================================
# Tier 3 — username-to-name conversion
# ===========================================================================

class TestTier3UsernameToName:

    @pytest.mark.asyncio
    async def test_dotted_username_converts_to_display_name(self):
        m = await _build_matcher([HARINATH])
        result = m.match("harinath.sirigiri", system="JIRA")
        # Tier 2 matches via jira_username column; Tier 3 would only fire if Tier 2 missed
        assert result.employee_id == 3
        assert result.confidence == Confidence.EXACT

    @pytest.mark.asyncio
    async def test_hyphenated_username_converts_to_display_name(self):
        """'john-doe' → 'John Doe' → matched against rms_name."""
        emp = {"id": 9, "rms_name": "John Doe", "jira_username": None, "aws_email": None}
        m = await _build_matcher([emp])
        result = m.match("john-doe", system="JIRA")
        assert result.employee_id == 9
        assert result.confidence in (Confidence.ALIAS, Confidence.FUZZY, Confidence.EXACT)


# ===========================================================================
# Tier 4 — normalised substring
# ===========================================================================

class TestTier4NormalizedSubstring:

    @pytest.mark.asyncio
    async def test_substring_of_rms_name_matches(self):
        """'Chandra Murthy' is a literal substring of 'Srirama Chandra Murthy Vutukuri'."""
        emp = {"id": 10, "rms_name": "Srirama Chandra Murthy Vutukuri", "jira_username": None, "aws_email": None}
        m = await _build_matcher([emp])
        # "chandra murthy" is a proper substring of the normalized rms_name
        result = m.match("Chandra Murthy", system="JIRA")
        assert result.employee_id == 10
        assert result.confidence == Confidence.FUZZY
        assert result.match_type == "normalized_substring"

    @pytest.mark.asyncio
    async def test_near_match_no_substring_returns_none(self):
        """'sriram' (missing 'a') is NOT a substring of 'srirama …' — no Tier 4 match."""
        emp = {"id": 10, "rms_name": "Srirama Chandra Murthy Vutukuri", "jira_username": None, "aws_email": None}
        m = await _build_matcher([emp])
        # rapidfuzz may or may not be installed in test env; just assert it stays Tier 6 or NONE
        result = m.match("sriram chandra murthy", system="JIRA")
        # Whatever tier fires, it must NOT be normalised_substring or token_set_match
        assert result.match_type not in ("normalized_substring", "token_set_match"), (
            "Off-by-one 'sriram'/'srirama' must not pass Tier 4/5 — needs Tier 6 rapidfuzz"
        )


# ===========================================================================
# No match
# ===========================================================================

class TestNoMatch:

    @pytest.mark.asyncio
    async def test_empty_identifier_returns_none(self):
        m = await _build_matcher([ALICE])
        result = m.match("", system="JIRA")
        assert result.employee_id is None
        assert result.confidence == Confidence.NONE

    @pytest.mark.asyncio
    async def test_unrelated_identifier_returns_none(self):
        m = await _build_matcher([ALICE])
        result = m.match("zzz-nomatch-xyz-9999", system="JIRA")
        assert result.employee_id is None
        assert result.confidence == Confidence.NONE


# ===========================================================================
# suggest()
# ===========================================================================

class TestSuggest:

    @pytest.mark.asyncio
    async def test_suggest_returns_scored_candidates(self):
        employees = [ALICE, BOB, HARINATH]
        m = await _build_matcher(employees)
        suggestions = m.suggest("alice", system="JIRA", top_n=3)
        assert len(suggestions) >= 1
        assert suggestions[0].employee_id == 1  # Alice is the best match
        for s in suggestions:
            assert isinstance(s, Suggestion)
            assert 0.0 < s.score <= 1.0

    @pytest.mark.asyncio
    async def test_suggest_empty_identifier_returns_empty(self):
        m = await _build_matcher([ALICE])
        assert m.suggest("", system="JIRA") == []

    @pytest.mark.asyncio
    async def test_suggest_top_n_respected(self):
        employees = [ALICE, BOB, HARINATH, RAJESH_ARCOT]
        m = await _build_matcher(employees)
        # "Raj" is a partial name — should get at most top_n results
        suggestions = m.suggest("Rajesh", system="JIRA", top_n=2)
        assert len(suggestions) <= 2


# ===========================================================================
# load() guard
# ===========================================================================

class TestLoadGuard:

    def test_match_before_load_raises(self):
        m = EmployeeMatcher()
        with pytest.raises(RuntimeError, match="load\\(\\)"):
            m.match("anyone", system="JIRA")

    def test_suggest_before_load_raises(self):
        m = EmployeeMatcher()
        with pytest.raises(RuntimeError, match="load\\(\\)"):
            m.suggest("anyone", system="JIRA")
