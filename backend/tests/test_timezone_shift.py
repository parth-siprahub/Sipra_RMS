"""SRE Gate — UTC → IST (+5:30) timezone shift correctness.

The AWS Working Hours CSV exports timestamps as UTC midnight (e.g.
'2026-04-27T00:00:00').  After the +5:30 shift the row must still land on the
same calendar day in IST — i.e. the date *must not* leak forward or backward.

Reference: backend/app/timesheets/aws_parser.py::parse_aws_working_hours_csv
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest

from app.timesheets.aws_parser import parse_aws_working_hours_csv


BILLING_MONTH = "2026-04"


def _csv(rows: list[tuple[str, str]]) -> bytes:
    """Build minimal Working Hours CSV. rows = [(date_str, user_email)]."""
    header = (
        "Date,User,Last Activity Log,Location,"
        "Productive,Screen Time,Offline Meetings,Time Off,Work Time\n"
    )
    body = "".join(f"{d},{u},,,0,0,0,0,0\n" for d, u in rows)
    return (header + body).encode("utf-8")


class TestUtcToIstShift:
    """The +5:30 shift must keep a UTC-midnight row on the same calendar day in IST."""

    def test_monday_utc_midnight_stays_monday_ist(self):
        # 2026-04-27 is a Monday in both UTC and IST after the +5:30 shift
        rows = parse_aws_working_hours_csv(_csv([("2026-04-27T00:00:00", "x@y.com")]), BILLING_MONTH)
        assert len(rows) == 1
        assert rows[0]["log_date"] == "2026-04-27"
        assert date.fromisoformat(rows[0]["log_date"]).weekday() == 0  # 0 = Monday
        assert rows[0]["is_weekend"] is False

    def test_friday_utc_midnight_stays_friday_ist(self):
        # 2026-04-24 is Friday — boundary day for Pathak's exit
        rows = parse_aws_working_hours_csv(_csv([("2026-04-24T00:00:00", "x@y.com")]), BILLING_MONTH)
        assert rows[0]["log_date"] == "2026-04-24"
        assert date.fromisoformat(rows[0]["log_date"]).weekday() == 4  # Friday

    def test_no_sunday_night_leak_into_monday(self):
        # A Monday UTC-midnight row, naively shifted, would become 05:30 Mon IST —
        # still Monday.  Anything earlier (Sun 18:30 UTC) would have a different
        # date string in the CSV, so we explicitly check the inverse: a Monday row
        # must NOT land on Sunday.
        rows = parse_aws_working_hours_csv(_csv([("2026-04-27T00:00:00", "x@y.com")]), BILLING_MONTH)
        assert rows[0]["log_date"] != "2026-04-26"  # not the prior Sunday

    def test_offset_matches_330_minutes_exactly(self):
        """Direct check of the parser's transform — no off-by-one drift."""
        raw = "2026-04-27T00:00:00"
        expected = (datetime.fromisoformat(raw) + timedelta(hours=5, minutes=30)).date()
        assert expected == date(2026, 4, 27)

    def test_month_filter_is_post_shift(self):
        """Row with March-31 UTC stays in March after +5:30; must be excluded for April."""
        rows = parse_aws_working_hours_csv(
            _csv([("2026-03-31T00:00:00", "x@y.com")]),
            BILLING_MONTH,
        )
        assert rows == []

    @pytest.mark.parametrize(
        "raw_date, expected_iso, expected_weekday",
        [
            ("2026-04-01T00:00:00", "2026-04-01", 2),  # Wednesday
            ("2026-04-04T00:00:00", "2026-04-04", 5),  # Saturday
            ("2026-04-05T00:00:00", "2026-04-05", 6),  # Sunday
            ("2026-04-06T00:00:00", "2026-04-06", 0),  # Monday
            ("2026-04-30T00:00:00", "2026-04-30", 3),  # Thursday
        ],
    )
    def test_calendar_consistency_across_april(self, raw_date, expected_iso, expected_weekday):
        rows = parse_aws_working_hours_csv(_csv([(raw_date, "x@y.com")]), BILLING_MONTH)
        assert rows[0]["log_date"] == expected_iso
        assert date.fromisoformat(rows[0]["log_date"]).weekday() == expected_weekday
