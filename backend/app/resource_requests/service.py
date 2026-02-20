from datetime import date


def generate_request_id(sequence: int, ref_date: date | None = None) -> str:
    """Generate display ID in format REQ-YYYYMMDD-XXX."""
    d = ref_date or date.today()
    return f"REQ-{d.strftime('%Y%m%d')}-{sequence:03d}"
