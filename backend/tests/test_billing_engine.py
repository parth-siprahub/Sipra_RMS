"""
Comprehensive unit tests for billing/engine.py.

Tests the 8/40 cap, 75% rule, exit logic, and edge cases.
No database required — pure Python logic.
"""
import pytest
from datetime import date
from app.billing.engine import (
    cap_daily_and_weekly,
    check_75_percent_rule,
    calculate_billing,
    MAX_DAILY_HOURS,
    MAX_WEEKLY_HOURS,
    AWS_COMPLIANCE_THRESHOLD,
)


# ── Helpers ─────────────────────────────────────────────────

def entry(log_date: str, hours: float, is_ooo: bool = False) -> dict:
    return {"log_date": log_date, "hours_logged": hours, "is_ooo": is_ooo}


# ═══════════════════════════════════════════════════════════
# cap_daily_and_weekly
# ═══════════════════════════════════════════════════════════

class TestCapDailyAndWeekly:
    """Test the 8h/day and 40h/week capping logic."""

    def test_empty_entries_returns_zero(self):
        total, capped = cap_daily_and_weekly([])
        assert total == 0.0
        assert capped == 0.0

    def test_single_entry_under_cap(self):
        entries = [entry("2025-03-10", 6.0)]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 6.0
        assert capped == 6.0

    def test_single_entry_at_cap(self):
        entries = [entry("2025-03-10", 8.0)]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 8.0
        assert capped == 8.0

    def test_daily_cap_applied_when_over_8h(self):
        entries = [entry("2025-03-10", 12.0)]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 12.0
        assert capped == MAX_DAILY_HOURS  # 8.0

    def test_ooo_entries_excluded_from_totals(self):
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-11", 8.0, is_ooo=True),
            entry("2025-03-12", 8.0),
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 16.0  # OOO excluded
        assert capped == 16.0

    def test_weekly_cap_at_40h(self):
        """5 days at 10h each: daily cap gives 8h/day = 40h, weekly cap stays at 40h."""
        entries = [
            entry("2025-03-10", 10.0),  # Mon
            entry("2025-03-11", 10.0),  # Tue
            entry("2025-03-12", 10.0),  # Wed
            entry("2025-03-13", 10.0),  # Thu
            entry("2025-03-14", 10.0),  # Fri
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 50.0
        assert capped == 40.0

    def test_weekly_cap_limits_6th_day(self):
        """6 days at 8h: daily caps all pass, but weekly cap limits to 40h."""
        entries = [
            entry("2025-03-10", 8.0),  # Mon
            entry("2025-03-11", 8.0),  # Tue
            entry("2025-03-12", 8.0),  # Wed
            entry("2025-03-13", 8.0),  # Thu
            entry("2025-03-14", 8.0),  # Fri
            entry("2025-03-15", 8.0),  # Sat
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 48.0
        assert capped == 40.0

    def test_multiple_weeks_capped_independently(self):
        """Each ISO week is capped separately at 40h."""
        week1 = [entry(f"2025-03-{d:02d}", 10.0) for d in range(10, 15)]  # Mon-Fri W11
        week2 = [entry(f"2025-03-{d:02d}", 10.0) for d in range(17, 22)]  # Mon-Fri W12
        total, capped = cap_daily_and_weekly(week1 + week2)
        assert total == 100.0
        assert capped == 80.0  # 40 per week

    def test_partial_week_under_cap(self):
        """3 days at 7h = 21h, no cap triggered."""
        entries = [
            entry("2025-03-10", 7.0),
            entry("2025-03-11", 7.0),
            entry("2025-03-12", 7.0),
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 21.0
        assert capped == 21.0

    def test_mixed_hours_daily_and_weekly_cap(self):
        """Mix of over/under daily cap, hitting weekly cap."""
        entries = [
            entry("2025-03-10", 12.0),  # capped to 8
            entry("2025-03-11", 12.0),  # capped to 8
            entry("2025-03-12", 12.0),  # capped to 8
            entry("2025-03-13", 12.0),  # capped to 8
            entry("2025-03-14", 12.0),  # capped to 8, but weekly limit hit at 40
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 60.0
        assert capped == 40.0

    def test_zero_hours_entry(self):
        entries = [entry("2025-03-10", 0.0)]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 0.0
        assert capped == 0.0

    def test_fractional_hours(self):
        entries = [entry("2025-03-10", 7.5)]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 7.5
        assert capped == 7.5

    def test_all_ooo_entries(self):
        entries = [
            entry("2025-03-10", 8.0, is_ooo=True),
            entry("2025-03-11", 8.0, is_ooo=True),
        ]
        total, capped = cap_daily_and_weekly(entries)
        assert total == 0.0
        assert capped == 0.0


# ═══════════════════════════════════════════════════════════
# check_75_percent_rule
# ═══════════════════════════════════════════════════════════

class TestCheck75PercentRule:
    """Test the AWS compliance (75%) rule."""

    def test_aws_none_returns_none(self):
        assert check_75_percent_rule(40.0, None) is None

    def test_jira_zero_returns_true(self):
        assert check_75_percent_rule(0.0, 0.0) is True

    def test_jira_negative_returns_true(self):
        assert check_75_percent_rule(-5.0, 10.0) is True

    def test_exactly_75_percent_passes(self):
        # 30 / 40 = 0.75 → exactly at threshold
        assert check_75_percent_rule(40.0, 30.0) is True

    def test_above_75_percent_passes(self):
        assert check_75_percent_rule(40.0, 35.0) is True

    def test_below_75_percent_fails(self):
        assert check_75_percent_rule(40.0, 20.0) is False

    def test_equal_hours_passes(self):
        assert check_75_percent_rule(40.0, 40.0) is True

    def test_aws_exceeds_jira_passes(self):
        assert check_75_percent_rule(30.0, 50.0) is True

    def test_barely_below_threshold_fails(self):
        # 29.99 / 40 = 0.74975 → just under 75%
        assert check_75_percent_rule(40.0, 29.99) is False

    def test_barely_above_threshold_passes(self):
        # 30.01 / 40 = 0.750025 → just above 75%
        assert check_75_percent_rule(40.0, 30.01) is True


# ═══════════════════════════════════════════════════════════
# calculate_billing
# ═══════════════════════════════════════════════════════════

class TestCalculateBilling:
    """Integration tests for the full billing calculation pipeline."""

    def test_basic_billing_no_exit_no_aws(self):
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-11", 8.0),
            entry("2025-03-12", 8.0),
        ]
        result = calculate_billing(entries)
        assert result["total_logged_hours"] == 24.0
        assert result["capped_hours"] == 24.0
        assert result["ooo_days"] == 0
        assert result["compliance_75_pct"] is None  # No AWS data
        assert result["is_billable"] is True

    def test_exit_date_excludes_entries(self):
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-11", 8.0),
            entry("2025-03-15", 8.0),  # After exit
        ]
        result = calculate_billing(entries, employee_exit_date=date(2025, 3, 12))
        assert result["total_logged_hours"] == 16.0
        assert result["capped_hours"] == 16.0

    def test_exit_date_inclusive_boundary(self):
        """Entry ON the exit date should be included."""
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-12", 8.0),  # Exactly on exit date
        ]
        result = calculate_billing(entries, employee_exit_date=date(2025, 3, 12))
        assert result["total_logged_hours"] == 16.0

    def test_exit_date_excludes_all_entries(self):
        entries = [entry("2025-03-15", 8.0)]
        result = calculate_billing(entries, employee_exit_date=date(2025, 3, 10))
        assert result["capped_hours"] == 0
        assert result["is_billable"] is False

    def test_ooo_counted_in_results(self):
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-11", 0.0, is_ooo=True),
            entry("2025-03-12", 0.0, is_ooo=True),
        ]
        result = calculate_billing(entries)
        assert result["ooo_days"] == 2

    def test_aws_compliance_pass(self):
        entries = [entry("2025-03-10", 8.0)]
        result = calculate_billing(entries, aws_active_hours=8.0)
        assert result["compliance_75_pct"] is True
        assert result["is_billable"] is True

    def test_aws_compliance_fail_makes_unbillable(self):
        entries = [
            entry("2025-03-10", 8.0),
            entry("2025-03-11", 8.0),
            entry("2025-03-12", 8.0),
            entry("2025-03-13", 8.0),
            entry("2025-03-14", 8.0),
        ]
        # 40h Jira, only 10h AWS → 25% < 75%
        result = calculate_billing(entries, aws_active_hours=10.0)
        assert result["compliance_75_pct"] is False
        assert result["is_billable"] is False

    def test_zero_hours_is_not_billable(self):
        result = calculate_billing([])
        assert result["capped_hours"] == 0
        assert result["is_billable"] is False

    def test_empty_entries_with_aws(self):
        result = calculate_billing([], aws_active_hours=10.0)
        assert result["is_billable"] is False

    def test_all_ooo_not_billable(self):
        entries = [
            entry("2025-03-10", 0.0, is_ooo=True),
            entry("2025-03-11", 0.0, is_ooo=True),
        ]
        result = calculate_billing(entries)
        assert result["capped_hours"] == 0
        assert result["is_billable"] is False
        assert result["ooo_days"] == 2

    def test_result_keys_complete(self):
        result = calculate_billing([entry("2025-03-10", 5.0)])
        expected_keys = {
            "total_logged_hours", "capped_hours", "ooo_days",
            "aws_active_hours", "compliance_75_pct", "is_billable",
        }
        assert set(result.keys()) == expected_keys

    def test_capped_hours_rounded(self):
        entries = [entry("2025-03-10", 7.333)]
        result = calculate_billing(entries)
        assert result["capped_hours"] == 7.33

    def test_full_month_scenario(self):
        """Simulate a realistic full month: 22 working days at 9h each."""
        entries = [entry(f"2025-03-{d:02d}", 9.0) for d in range(3, 25)]
        result = calculate_billing(entries, aws_active_hours=150.0)
        assert result["total_logged_hours"] == 22 * 9.0
        assert result["capped_hours"] <= MAX_WEEKLY_HOURS * 5  # Max 5 weeks
        assert result["is_billable"] is True
