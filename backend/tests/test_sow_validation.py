"""Tests for SOW date validation rules.

Business rules:
- start_date <= target_date (same day OK)
- submitted_date >= start_date
- max_resources <= 100
"""
import pytest
from datetime import date
from pydantic import ValidationError
from app.sows.schemas import SowCreate, SowUpdate


class TestSowCreateDateValidation:
    """Validate SowCreate date constraints."""

    def test_same_day_start_and_target_allowed(self):
        """start_date == target_date should pass (same day OK)."""
        sow = SowCreate(
            sow_number="SOW-001",
            client_name="TestClient",
            start_date=date(2026, 6, 15),
            target_date=date(2026, 6, 15),
        )
        assert sow.start_date == sow.target_date

    def test_start_before_target_allowed(self):
        """Normal case: start_date < target_date."""
        sow = SowCreate(
            sow_number="SOW-002",
            client_name="TestClient",
            start_date=date(2026, 6, 1),
            target_date=date(2026, 12, 31),
        )
        assert sow.start_date < sow.target_date

    def test_start_after_target_rejected(self):
        """start_date > target_date must raise ValueError."""
        with pytest.raises(ValidationError, match="Start date must be on or before target date"):
            SowCreate(
                sow_number="SOW-003",
                client_name="TestClient",
                start_date=date(2026, 7, 1),
                target_date=date(2026, 6, 15),
            )

    def test_submitted_before_start_rejected(self):
        """submitted_date < start_date must raise ValueError."""
        with pytest.raises(ValidationError, match="Submitted date must be on or after start date"):
            SowCreate(
                sow_number="SOW-004",
                client_name="TestClient",
                start_date=date(2026, 6, 15),
                submitted_date=date(2026, 6, 1),
            )

    def test_submitted_same_as_start_allowed(self):
        """submitted_date == start_date should pass."""
        sow = SowCreate(
            sow_number="SOW-005",
            client_name="TestClient",
            start_date=date(2026, 6, 15),
            submitted_date=date(2026, 6, 15),
        )
        assert sow.submitted_date == sow.start_date

    def test_submitted_after_start_allowed(self):
        """submitted_date > start_date is the normal case."""
        sow = SowCreate(
            sow_number="SOW-006",
            client_name="TestClient",
            start_date=date(2026, 6, 1),
            submitted_date=date(2026, 6, 15),
        )
        assert sow.submitted_date > sow.start_date

    def test_max_resources_exceeds_100_rejected(self):
        """max_resources > 100 must raise ValueError."""
        with pytest.raises(ValidationError, match="Max resources cannot exceed 100"):
            SowCreate(
                sow_number="SOW-007",
                client_name="TestClient",
                max_resources=101,
            )

    def test_no_dates_allowed(self):
        """All date fields are optional — no dates should pass."""
        sow = SowCreate(
            sow_number="SOW-008",
            client_name="TestClient",
        )
        assert sow.start_date is None
        assert sow.target_date is None
        assert sow.submitted_date is None


class TestSowUpdateDateValidation:
    """Validate SowUpdate date constraints (must mirror SowCreate)."""

    def test_same_day_start_and_target_allowed(self):
        """SowUpdate: start_date == target_date should pass."""
        sow = SowUpdate(
            start_date=date(2026, 6, 15),
            target_date=date(2026, 6, 15),
        )
        assert sow.start_date == sow.target_date

    def test_start_after_target_rejected(self):
        """SowUpdate: start_date > target_date must raise ValueError."""
        with pytest.raises(ValidationError, match="Start date must be on or before target date"):
            SowUpdate(
                start_date=date(2026, 7, 1),
                target_date=date(2026, 6, 15),
            )

    def test_submitted_before_start_rejected(self):
        """SowUpdate: submitted_date < start_date must raise ValueError."""
        with pytest.raises(ValidationError, match="Submitted date must be on or after start date"):
            SowUpdate(
                start_date=date(2026, 6, 15),
                submitted_date=date(2026, 6, 1),
            )

    def test_partial_update_no_dates_allowed(self):
        """SowUpdate: updating only non-date fields should pass."""
        sow = SowUpdate(
            sow_number="SOW-UPDATED",
            is_active=False,
        )
        assert sow.sow_number == "SOW-UPDATED"
        assert sow.is_active is False
