"""
Tests for the processed-flag / freeze workflow (P1.1).

Covers:
  1. Billing calculation sets processed=True and processed_at on billing_records
  2. Modifying a processed timesheet entry raises an error
  3. POST /billing/freeze/{billing_month} marks records as processed
  4. GET /billing/?processed=false filters correctly
  5. Re-calculating billing for an already-frozen month raises 409
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

from app.main import app
from tests.conftest import (
    MockSupabaseClient,
    MockSupabaseTable,
    make_employee,
    make_timesheet_entry,
)


# ── Helpers ────────────────────────────────────────────────

def _billing_record(
    employee_id: int = 1,
    billing_month: str = "2025-03",
    processed: bool = False,
    processed_at: str | None = None,
    **kwargs,
) -> dict:
    return {
        "id": kwargs.get("id", 1),
        "employee_id": employee_id,
        "billing_month": billing_month,
        "total_logged_hours": kwargs.get("total_logged_hours", 40.0),
        "capped_hours": kwargs.get("capped_hours", 40.0),
        "ooo_days": kwargs.get("ooo_days", 0),
        "aws_active_hours": kwargs.get("aws_active_hours", None),
        "compliance_75_pct": kwargs.get("compliance_75_pct", None),
        "is_billable": kwargs.get("is_billable", True),
        "processed": processed,
        "processed_at": processed_at,
        "created_at": "2025-03-31T00:00:00",
        "updated_at": None,
    }


# ═══════════════════════════════════════════════════════════
# 1. Billing calculation marks records as processed
# ═══════════════════════════════════════════════════════════

class TestBillingCalculationSetsProcessed:
    """After calculate_monthly_billing, inserted records should have processed=True."""

    async def test_calculate_sets_processed_true(self, authed_client):
        """The billing record inserted after calculation should include processed=True."""
        mock_client = MockSupabaseClient()
        emp = make_employee(id=1)
        ts = make_timesheet_entry(employee_id=1, log_date="2025-03-10", hours_logged=8.0)
        mock_client.configure_table("employees", data=[emp])
        mock_client.configure_table("timesheet_logs", data=[ts])
        # billing_records: first select returns [] (no frozen records),
        # then delete + insert chains work via default MockSupabaseTable
        mock_client.configure_table("billing_records", data=[])

        inserted_records: list[dict] = []
        original_table = mock_client.table

        def capturing_table(name: str):
            tbl = original_table(name)
            if name == "billing_records":
                orig_insert = tbl.insert

                def capture_insert(data):
                    inserted_records.append(data)
                    return orig_insert(data)

                tbl.insert = capture_insert
            return tbl

        mock_client.table = capturing_table

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/calculate/2025-03")

        assert resp.status_code == 200
        assert len(inserted_records) >= 1
        record = inserted_records[0]
        assert record["processed"] is True
        assert record["processed_at"] is not None


# ═══════════════════════════════════════════════════════════
# 2. Modifying a processed timesheet should raise error
# ═══════════════════════════════════════════════════════════

class TestProcessedTimesheetImmutability:
    """A processed timesheet entry must not be modifiable."""

    async def test_update_processed_timesheet_raises_error(self, authed_client):
        """PUT on a processed timesheet entry should return 409 Conflict."""
        processed_ts = {
            "id": 99,
            "employee_id": 1,
            "log_date": "2025-03-10",
            "hours_logged": 8.0,
            "is_ooo": False,
            "import_month": "2025-03",
            "processed": True,
            "processed_at": "2025-03-31T23:00:00+00:00",
        }
        mock_client = MockSupabaseClient()
        mock_client.configure_table("timesheet_logs", data=[processed_ts])

        async def _get_mock():
            return mock_client

        with patch("app.timesheets.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.put(
                "/timesheets/99",
                json={"hours_logged": 10.0},
            )

        assert resp.status_code == 409
        assert "processed" in resp.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════
# 3. POST /billing/freeze/{billing_month}
# ═══════════════════════════════════════════════════════════

class TestFreezeEndpoint:
    """POST /billing/freeze/{billing_month} should mark all records as processed."""

    async def test_freeze_returns_count(self, authed_client):
        records = [
            _billing_record(id=1, processed=False),
            _billing_record(id=2, employee_id=2, processed=False),
        ]
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=records)

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/freeze/2025-03")

        assert resp.status_code == 200
        body = resp.json()
        assert "frozen_count" in body
        assert body["billing_month"] == "2025-03"

    async def test_freeze_already_frozen_is_idempotent(self, authed_client):
        """Freezing a month where all records are already processed should succeed."""
        records = [_billing_record(id=1, processed=True)]
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=records)

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/freeze/2025-03")

        assert resp.status_code == 200

    async def test_freeze_validates_format(self, authed_client):
        """Invalid billing_month format should return 400."""
        mock_client = MockSupabaseClient()

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/freeze/March2025")

        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════
# 4. GET /billing/?processed=false filtering
# ═══════════════════════════════════════════════════════════

class TestProcessedFilter:
    """GET /billing/?processed=false should filter billing records."""

    async def test_filter_unprocessed(self, authed_client):
        unprocessed = [_billing_record(id=1, processed=False)]
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=unprocessed)

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.get("/billing/?processed=false")

        assert resp.status_code == 200

    async def test_filter_processed(self, authed_client):
        processed = [
            _billing_record(id=1, processed=True, processed_at="2025-03-31T23:00:00+00:00"),
        ]
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=processed)

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.get("/billing/?processed=true")

        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════
# 5. Re-calculating billing for frozen month → 409
# ═══════════════════════════════════════════════════════════

class TestFrozenMonthConflict:
    """Attempting to recalculate billing for a frozen month should raise 409."""

    async def test_calculate_frozen_month_returns_409(self, authed_client):
        frozen_records = [
            _billing_record(id=1, processed=True, processed_at="2025-03-31T23:00:00+00:00"),
        ]
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=frozen_records)
        mock_client.configure_table("employees", data=[make_employee(id=1)])
        mock_client.configure_table("timesheet_logs", data=[
            make_timesheet_entry(employee_id=1),
        ])

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/calculate/2025-03")

        assert resp.status_code == 409
        assert "frozen" in resp.json()["detail"].lower()

    async def test_calculate_unfrozen_month_succeeds(self, authed_client):
        """Non-frozen month should calculate normally."""
        mock_client = MockSupabaseClient()
        mock_client.configure_table("billing_records", data=[])
        mock_client.configure_table("employees", data=[make_employee(id=1)])
        mock_client.configure_table("timesheet_logs", data=[
            make_timesheet_entry(employee_id=1, log_date="2025-04-10", import_month="2025-04"),
        ])

        async def _get_mock():
            return mock_client

        with patch("app.billing.router.get_supabase_admin_async", new=_get_mock):
            resp = await authed_client.post("/billing/calculate/2025-04")

        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════
# 6. Timesheet import guard — frozen entries block re-import
# ═══════════════════════════════════════════════════════════

class TestTimesheetImportFrozenGuard:
    """Re-importing timesheets for a frozen month should raise 409."""

    async def test_import_frozen_month_returns_409(self, authed_client):
        """POST /timesheets/import should reject when processed entries exist."""
        frozen_ts = make_timesheet_entry(
            employee_id=1, processed=True, processed_at="2025-03-31T23:00:00+00:00"
        )
        frozen_ts["id"] = 99  # ensure it has an ID

        emp = make_employee(id=1, jira_username="testuser")

        # Build a mock that supports insert().execute() returning {"id": N}
        class _SimpleChain:
            def __init__(self, data, return_insert_data=False):
                self._data = data
                self._return_insert_data = return_insert_data
                self._r = MagicMock()
                self._r.data = data
                self._r.count = None
            def select(self, *a, **kw): return self
            def insert(self, data):
                if self._return_insert_data:
                    # Simulate Supabase: merge insert payload with preset data
                    self._r.data = self._data
                else:
                    self._r.data = [data] if isinstance(data, dict) else data
                return self
            def update(self, data): return self
            def delete(self): return self
            def eq(self, *a): return self
            def limit(self, *a): return self
            def single(self): return self
            def order(self, *a, **kw): return self
            def range(self, *a): return self
            async def execute(self):
                return self._r

        call_counts: dict[str, int] = {}

        class ImportMockClient:
            def table(self, name):
                call_counts[name] = call_counts.get(name, 0) + 1
                if name == "import_headers":
                    # insert returns [{"id": 1, ...}] — Supabase always includes id
                    return _SimpleChain([{"id": 1}], return_insert_data=True)
                if name == "employees":
                    return _SimpleChain([emp])
                if name == "timesheet_logs":
                    # frozen check: returns frozen entry
                    return _SimpleChain([frozen_ts])
                return _SimpleChain([])

        async def _get_mock():
            return ImportMockClient()

        parsed_entries = [{
            "jira_username": "testuser",
            "log_date": "2025-03-10",
            "hours_logged": 8.0,
            "is_ooo": False,
            "import_month": "2025-03",
        }]

        with patch("app.timesheets.router.get_supabase_admin_async", new=_get_mock), \
             patch("app.timesheets.router.parse_tempo_xls", return_value=parsed_entries):
            resp = await authed_client.post(
                "/timesheets/import",
                data={"import_month": "2025-03"},
                files={"file": ("test.xls", b"\xD0\xCF\x11\xE0fake_excel_data", "application/vnd.ms-excel")},
            )

        assert resp.status_code == 409
        assert "frozen" in resp.json()["detail"].lower()
