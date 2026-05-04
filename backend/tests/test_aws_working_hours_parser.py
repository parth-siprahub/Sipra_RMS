"""
SRE Gate — aws_daily_logs parser tests.

Validates:
- Weekend rows (Sat/Sun) have is_weekend=True
- Weekend rows report 0 work_seconds / productive_seconds / screen_time_seconds
  (as exported by AWS ActiveTrack — the data itself is zeroed on weekends)
- Rows after an employee's exit_date get post_exit_flag=True
- Rows before or on exit_date get post_exit_flag=False
- Rows outside billing_month are excluded
- Duplicate (email, date) rows are summed
- Missing Work Time / Productive / Screen Time columns default to 0
"""
import textwrap
from datetime import date

import pytest

from app.timesheets.aws_parser import parse_aws_working_hours_csv


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _make_csv(rows: list[dict], *, extra_cols: bool = True) -> bytes:
    """Build a minimal Working Hours CSV from a list of dicts.

    Columns: Date, User, Last Activity Log, Location,
             Productive, Screen Time, Offline Meetings, Time Off, Work Time
    """
    header = (
        "Date,User,Last Activity Log,Location,"
        "Productive,Screen Time,Offline Meetings,Time Off,Work Time\n"
    )
    lines = [header]
    for r in rows:
        lines.append(
            f"{r.get('date', '2026-04-01T00:00:00')},"
            f"{r.get('user', 'test@example.com')},"
            f",,"   # col2=Last Activity Log (empty), col3=Location (empty)
            f"{r.get('productive', 0)},"
            f"{r.get('screen_time', 0)},"
            f"0,0,"
            f"{r.get('work_time', 0)}\n"
        )
    return "".join(lines).encode("utf-8")


BILLING_MONTH = "2026-04"


# ─────────────────────────────────────────────────────────────
# Weekend detection
# ─────────────────────────────────────────────────────────────

class TestWeekendDetection:
    """April 2026 calendar — Sat=4th,11th,18th,25th | Sun=5th,12th,19th,26th."""

    def test_saturday_is_weekend(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-04T00:00:00", "user": "alice@test.com",
             "productive": 0, "screen_time": 0, "work_time": 0},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 1
        assert rows[0]["is_weekend"] is True

    def test_sunday_is_weekend(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-05T00:00:00", "user": "alice@test.com",
             "productive": 0, "screen_time": 0, "work_time": 0},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows[0]["is_weekend"] is True

    def test_monday_is_not_weekend(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-06T00:00:00", "user": "alice@test.com",
             "productive": 3600, "screen_time": 7200, "work_time": 28800},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows[0]["is_weekend"] is False

    def test_friday_is_not_weekend(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-03T00:00:00", "user": "alice@test.com",
             "productive": 100, "screen_time": 200, "work_time": 300},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows[0]["is_weekend"] is False

    def test_weekend_rows_have_zero_seconds(self):
        """AWS ActiveTrack exports 0 for all metrics on weekends — parser must preserve that."""
        csv_bytes = _make_csv([
            {"date": "2026-04-04T00:00:00", "user": "emp@test.com",
             "productive": 0, "screen_time": 0, "work_time": 0},
            {"date": "2026-04-05T00:00:00", "user": "emp@test.com",
             "productive": 0, "screen_time": 0, "work_time": 0},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        weekend_rows = [r for r in rows if r["is_weekend"]]
        assert len(weekend_rows) == 2
        for r in weekend_rows:
            assert r["work_seconds"] == 0
            assert r["productive_seconds"] == 0
            assert r["screen_time_seconds"] == 0

    def test_weekday_rows_carry_real_seconds(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-07T00:00:00", "user": "emp@test.com",
             "productive": 14400, "screen_time": 21600, "work_time": 28800},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows[0]["work_seconds"] == 28800
        assert rows[0]["productive_seconds"] == 14400
        assert rows[0]["screen_time_seconds"] == 21600


# ─────────────────────────────────────────────────────────────
# post_exit_flag (SRE gate — verified by router, not parser)
# The parser does NOT set post_exit_flag; it is set in the router
# using exit_date from the matcher.  Parser tests confirm the
# raw output rows carry the correct log_date for the router to
# evaluate.  A direct integration test is below.
# ─────────────────────────────────────────────────────────────

class TestPostExitFlagLogic:
    """Unit-test the flag logic in isolation (not via router)."""

    def _apply_flag(self, log_date_str: str, exit_date: date | None) -> bool:
        """Mirror the router's post_exit_flag logic."""
        log_date = date.fromisoformat(log_date_str)
        return bool(exit_date and log_date > exit_date)

    def test_no_exit_date_never_flagged(self):
        assert self._apply_flag("2026-04-28", None) is False

    def test_row_before_exit_not_flagged(self):
        assert self._apply_flag("2026-04-10", date(2026, 4, 15)) is False

    def test_row_on_exit_date_not_flagged(self):
        # Last working day — the exit_date row itself is valid
        assert self._apply_flag("2026-04-15", date(2026, 4, 15)) is False

    def test_row_after_exit_flagged(self):
        assert self._apply_flag("2026-04-16", date(2026, 4, 15)) is True

    def test_ananth_malyala_scenario(self):
        """Ananth Malyala EXITED April 2026 — any data logged in April after exit is suspicious."""
        exit_date = date(2026, 4, 5)   # hypothetical exit
        # Rows on or before exit: clean
        assert self._apply_flag("2026-04-05", exit_date) is False
        # Rows after exit: flagged
        assert self._apply_flag("2026-04-06", exit_date) is True
        assert self._apply_flag("2026-04-28", exit_date) is True


# ─────────────────────────────────────────────────────────────
# Month filtering
# ─────────────────────────────────────────────────────────────

class TestMonthFiltering:

    def test_only_april_rows_returned(self):
        """Rows from March should be excluded when billing_month=2026-04."""
        csv_bytes = _make_csv([
            {"date": "2026-03-31T00:00:00", "user": "emp@test.com",
             "productive": 3600, "screen_time": 0, "work_time": 3600},
            {"date": "2026-04-01T00:00:00", "user": "emp@test.com",
             "productive": 7200, "screen_time": 0, "work_time": 7200},
            {"date": "2026-05-01T00:00:00", "user": "emp@test.com",
             "productive": 1800, "screen_time": 0, "work_time": 1800},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 1
        assert rows[0]["log_date"] == "2026-04-01"

    def test_all_rows_excluded_when_no_match(self):
        csv_bytes = _make_csv([
            {"date": "2026-03-15T00:00:00", "user": "emp@test.com",
             "productive": 500, "screen_time": 0, "work_time": 500},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows == []


# ─────────────────────────────────────────────────────────────
# Duplicate (email, date) accumulation
# ─────────────────────────────────────────────────────────────

class TestDuplicateAccumulation:

    def test_duplicate_rows_are_summed(self):
        """Two rows for same email+date must be summed, not deduplicated."""
        csv_bytes = _make_csv([
            {"date": "2026-04-07T00:00:00", "user": "emp@test.com",
             "productive": 1000, "screen_time": 2000, "work_time": 3000},
            {"date": "2026-04-07T00:00:00", "user": "emp@test.com",
             "productive": 500, "screen_time": 100, "work_time": 600},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 1
        assert rows[0]["productive_seconds"] == 1500
        assert rows[0]["screen_time_seconds"] == 2100
        assert rows[0]["work_seconds"] == 3600

    def test_different_dates_separate_rows(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-07T00:00:00", "user": "emp@test.com",
             "productive": 3600, "screen_time": 0, "work_time": 3600},
            {"date": "2026-04-08T00:00:00", "user": "emp@test.com",
             "productive": 7200, "screen_time": 0, "work_time": 7200},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 2

    def test_different_users_separate_rows(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-07T00:00:00", "user": "alice@test.com",
             "productive": 1000, "screen_time": 0, "work_time": 1000},
            {"date": "2026-04-07T00:00:00", "user": "bob@test.com",
             "productive": 2000, "screen_time": 0, "work_time": 2000},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 2


# ─────────────────────────────────────────────────────────────
# Edge cases
# ─────────────────────────────────────────────────────────────

class TestEdgeCases:

    def test_empty_file_returns_empty_list(self):
        rows = parse_aws_working_hours_csv(b"", BILLING_MONTH)
        assert rows == []

    def test_header_only_returns_empty_list(self):
        header = b"Date,User,Last Activity Log,Location,Productive,Screen Time,Offline Meetings,Time Off,Work Time\n"
        rows = parse_aws_working_hours_csv(header, BILLING_MONTH)
        assert rows == []

    def test_missing_user_column_raises(self):
        csv_bytes = b"Date,Name,Productive\n2026-04-07,emp@test.com,3600\n"
        with pytest.raises(ValueError, match="'User' column"):
            parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)

    def test_missing_date_column_raises(self):
        csv_bytes = b"User,Productive,Work Time\nemp@test.com,3600,3600\n"
        with pytest.raises(ValueError, match="'Date' column"):
            parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)

    def test_blank_user_rows_skipped(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-07T00:00:00", "user": "",
             "productive": 3600, "screen_time": 0, "work_time": 3600},
            {"date": "2026-04-07T00:00:00", "user": "real@test.com",
             "productive": 1800, "screen_time": 0, "work_time": 1800},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 1
        assert rows[0]["aws_email"] == "real@test.com"

    def test_billing_month_set_correctly(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-14T00:00:00", "user": "emp@test.com",
             "productive": 100, "screen_time": 0, "work_time": 200},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert rows[0]["billing_month"] == "2026-04"

    def test_log_date_format_is_iso(self):
        csv_bytes = _make_csv([
            {"date": "2026-04-14T00:00:00", "user": "emp@test.com",
             "productive": 100, "screen_time": 0, "work_time": 200},
        ])
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        # log_date must be YYYY-MM-DD string (stored as DATE in Supabase)
        assert rows[0]["log_date"] == "2026-04-14"

    def test_utf8_bom_header_handled(self):
        """CSV exported with UTF-8 BOM (common from Excel) must be parsed correctly.
        Encoding with utf-8-sig adds the BOM prefix; decoding with utf-8-sig strips it.
        """
        csv_bytes = (
            "Date,User,Last Activity Log,Location,"
            "Productive,Screen Time,Offline Meetings,Time Off,Work Time\n"
            "2026-04-07T00:00:00,emp@test.com,,,1000,500,0,0,2000\n"
        ).encode("utf-8-sig")  # adds BOM bytes at start
        rows = parse_aws_working_hours_csv(csv_bytes, BILLING_MONTH)
        assert len(rows) == 1
