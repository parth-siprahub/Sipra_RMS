from datetime import date
from app.resource_requests.service import generate_request_id


def test_generate_request_id_format():
    result = generate_request_id(sequence=1, ref_date=date(2026, 2, 18))
    assert result == "REQ-20260218-001"


def test_generate_request_id_sequence():
    result = generate_request_id(sequence=42, ref_date=date(2026, 1, 5))
    assert result == "REQ-20260105-042"


def test_generate_request_id_starts_with_req():
    result = generate_request_id(sequence=1)
    assert result.startswith("REQ-")
    assert len(result) == 16
