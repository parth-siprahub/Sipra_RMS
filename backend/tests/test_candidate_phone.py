import pytest
from pydantic import ValidationError

from app.candidates.schemas import CandidateCreate


def test_phone_accepts_ten_digits():
    c = CandidateCreate(
        first_name="A",
        last_name="B",
        email="a@b.com",
        phone="8785965868",
    )
    assert c.phone == "8785965868"


def test_phone_normalizes_country_code():
    c = CandidateCreate(
        first_name="A",
        last_name="B",
        email="a@b.com",
        phone="+918785965868",
    )
    assert c.phone == "8785965868"


def test_phone_rejects_too_few_digits():
    with pytest.raises(ValidationError):
        CandidateCreate(
            first_name="A",
            last_name="B",
            email="a@b.com",
            phone="12345",
        )
