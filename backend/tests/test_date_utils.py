"""Tests for date_utils: working-day calculation and prorated billing targets.

Covers:
- Full-month employees (22 weekdays - 2 holidays = 20 days → 160h)
- Mid-month exit (Pathak, exit 4/24 → 16 working days → 128h)
- Mid-month exit (Bindushree, start 4/2, exit 4/27 → 16 working days → 128h)
- Employee who hasn't exited (target = working days through month_end)
- Edge: start == exit (single day — weekday vs weekend/holiday)
- Edge: start > end (returns 0)
"""

from datetime import date

import pytest

from app.utils.date_utils import get_working_days, prorated_target_hours, INDIA_HOLIDAYS


# ──────────────────────────────────────────────────────────────────────────────
# get_working_days
# ──────────────────────────────────────────────────────────────────────────────

class TestGetWorkingDays:
    def test_full_april_2026(self):
        """April 2026: 22 weekdays minus Good Friday (4/3) and Ambedkar Jayanti (4/14) = 20."""
        result = get_working_days(date(2026, 4, 1), date(2026, 4, 30))
        assert result == 20

    def test_start_after_end_returns_zero(self):
        assert get_working_days(date(2026, 4, 30), date(2026, 4, 1)) == 0

    def test_single_weekday(self):
        # April 6 is a Monday (not a holiday)
        assert get_working_days(date(2026, 4, 6), date(2026, 4, 6)) == 1

    def test_single_weekend_day(self):
        # April 5 is a Sunday
        assert get_working_days(date(2026, 4, 5), date(2026, 4, 5)) == 0

    def test_good_friday_excluded(self):
        # April 3 is Good Friday — should not count
        assert date(2026, 4, 3) in INDIA_HOLIDAYS
        assert get_working_days(date(2026, 4, 3), date(2026, 4, 3)) == 0

    def test_ambedkar_jayanti_excluded(self):
        # April 14 is Ambedkar Jayanti — should not count
        assert date(2026, 4, 14) in INDIA_HOLIDAYS
        assert get_working_days(date(2026, 4, 14), date(2026, 4, 14)) == 0

    def test_no_holidays_override(self):
        """Passing empty holidays dict counts only weekdays, no holidays excluded."""
        # April 1(Wed), 2(Thu), 3(Fri), 4(Sat) → 3 weekdays; with default holidays, 4/3 skipped = 2.
        # With empty holidays: Good Friday (4/3) is counted → 3 weekdays.
        result = get_working_days(date(2026, 4, 1), date(2026, 4, 4), holidays={})
        assert result == 3  # Sat(4/4) excluded; Good Friday counted since no holidays set

    def test_pathak_exit_april_24(self):
        """Pathak: full month start, exits April 24 → 16 working days."""
        result = get_working_days(date(2026, 4, 1), date(2026, 4, 24))
        assert result == 16

    def test_bindushree_window(self):
        """Bindushree: starts April 2, exits April 27 → 16 working days."""
        result = get_working_days(date(2026, 4, 2), date(2026, 4, 27))
        assert result == 16


# ──────────────────────────────────────────────────────────────────────────────
# prorated_target_hours
# ──────────────────────────────────────────────────────────────────────────────

class TestProratedTargetHours:
    MONTH_START = date(2026, 4, 1)
    MONTH_END = date(2026, 4, 30)

    def test_full_month_employee(self):
        """Employee who worked all of April → 20 days × 8h = 160h."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2025, 1, 1),  # hired long before April
            emp_exit=None,
        )
        assert result == 160.0

    def test_pathak_mid_month_exit(self):
        """Pathak exits April 24 → 16 days × 8h = 128h, not 176h."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2025, 6, 1),
            emp_exit=date(2026, 4, 24),
        )
        assert result == 128.0
        assert result < 160.0  # strictly less than full-month target

    def test_bindushree_start_and_exit_mid_month(self):
        """Bindushree: starts April 2, exits April 27 → 16 days × 8h = 128h."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2026, 4, 2),
            emp_exit=date(2026, 4, 27),
        )
        assert result == 128.0

    def test_employee_started_mid_month_no_exit(self):
        """Employee started April 15 → working days from 4/15 to 4/30."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2026, 4, 15),
            emp_exit=None,
        )
        # April 15 (Wed), 16 (Thu), 17 (Fri), 20 (Mon), 21 (Tue), 22 (Wed), 23 (Thu),
        # 24 (Fri), 27 (Mon), 28 (Tue), 29 (Wed), 30 (Thu) = 12 working days
        assert result == 96.0  # 12 × 8

    def test_exit_before_month_start_returns_zero(self):
        """Employee exited before April → prorated hours = 0."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2025, 1, 1),
            emp_exit=date(2026, 3, 31),
        )
        assert result == 0.0

    def test_custom_hours_per_day(self):
        """Custom 7.5h/day for a contractor billing model."""
        result = prorated_target_hours(
            month_start=self.MONTH_START,
            month_end=self.MONTH_END,
            emp_start=date(2025, 1, 1),
            emp_exit=None,
            hours_per_day=7.5,
        )
        assert result == 150.0  # 20 × 7.5
