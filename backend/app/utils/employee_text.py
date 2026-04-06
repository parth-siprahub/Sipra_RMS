"""Shared text normalization for employee records (writes and imports)."""
from app.utils.person_names import format_person_name


def normalize_employee_text(data: dict) -> dict:
    """Apply text normalization rules for employee data."""
    normalized = dict(data)

    for field in ("rms_name",):
        if field in normalized and normalized[field]:
            normalized[field] = format_person_name(str(normalized[field])) or ""

    if "client_name" in normalized and normalized["client_name"]:
        val = " ".join(str(normalized["client_name"]).split())
        normalized["client_name"] = val.upper()

    if "aws_email" in normalized and normalized["aws_email"]:
        normalized["aws_email"] = str(normalized["aws_email"]).strip().lower()

    if "siprahub_email" in normalized and normalized["siprahub_email"]:
        normalized["siprahub_email"] = str(normalized["siprahub_email"]).strip().lower()

    for field in ("github_id", "jira_username"):
        if field in normalized and normalized[field]:
            normalized[field] = str(normalized[field]).strip()

    return normalized
