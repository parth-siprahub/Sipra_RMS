"""Tests for defaulter detection pure logic."""
import pytest
from datetime import date

from app.reports.defaulters import detect_defaulters, _count_working_days
from tests.conftest import make_employee, make_timesheet_entry


# ── Helper: working day counter ───────────────────────────────

class TestCountWorkingDays:
    def test_full_week(self):
        # Mon 2026-03-02 to Fri 2026-03-06 = 5 working days
        assert _count_working_days(date(2026, 3, 2), date(2026, 3, 6)) == 5

    def test_includes_weekend(self):
        # Mon 2026-03-02 to Sun 2026-03-08 = 5 working days (Sat+Sun excluded)
        assert _count_working_days(date(2026, 3, 2), date(2026, 3, 8)) == 5

    def test_two_full_weeks(self):
        # Mon 2026-03-02 to Fri 2026-03-13 = 10 working days
        assert _count_working_days(date(2026, 3, 2), date(2026, 3, 13)) == 10

    def test_end_before_start_returns_zero(self):
        assert _count_working_days(date(2026, 3, 10), date(2026, 3, 1)) == 0

    def test_single_weekday(self):
        assert _count_working_days(date(2026, 3, 2), date(2026, 3, 2)) == 1

    def test_single_weekend_day(self):
        # Saturday
        assert _count_working_days(date(2026, 3, 7), date(2026, 3, 7)) == 0


# ── Defaulter Detection Logic ─────────────────────────────────

class TestDetectDefaulters:
    """Tests for detect_defaulters pure function."""

    # 1. Employee with zero hours in first 2 weeks → flagged as defaulter (critical)
    def test_zero_hours_flagged_as_critical(self):
        employees = [make_employee(id=1, rms_name="Alice", status="ACTIVE")]
        logs: list[dict] = []  # No timesheet entries at all

        # Check on day 15 of March 2026 (Sunday, so effectively Fri 13th matters)
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 15),
        )

        assert len(result) == 1
        assert result[0].employee_id == 1
        assert result[0].actual_hours == 0
        assert result[0].severity == "critical"
        assert result[0].deficit > 0

    # 2. Employee with some hours but below threshold → flagged as warning
    def test_below_threshold_flagged_as_warning(self):
        employees = [make_employee(id=1, rms_name="Bob", status="ACTIVE")]
        # 10 working days (Mon Mar 2 - Fri Mar 13, 2026), need 10*4=40h minimum
        # Give only 15 hours (<50% of 40 = 20), so should be "warning"
        logs = [
            make_timesheet_entry(employee_id=1, log_date="2026-03-02", hours_logged=5.0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-03", hours_logged=5.0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-04", hours_logged=5.0, import_month="2026-03"),
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
            min_hours_per_day=4.0,
        )

        assert len(result) == 1
        assert result[0].severity == "warning"
        assert result[0].actual_hours == 15.0

    # 3. Employee with adequate hours → not flagged
    def test_adequate_hours_not_flagged(self):
        employees = [make_employee(id=1, rms_name="Charlie", status="ACTIVE")]
        # 10 working days, need 40h. Give 45h.
        logs = [
            make_timesheet_entry(employee_id=1, log_date=f"2026-03-{d:02d}", hours_logged=4.5, import_month="2026-03")
            for d in range(2, 14)  # Mar 2-13
            if date(2026, 3, d).weekday() < 5  # only weekdays
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 0

    # 4. OOO-only employee → not flagged
    def test_ooo_employee_not_flagged(self):
        employees = [make_employee(id=1, rms_name="Diana", status="ACTIVE")]
        # All 10 working days are OOO
        logs = [
            make_timesheet_entry(
                employee_id=1,
                log_date=f"2026-03-{d:02d}",
                hours_logged=0,
                is_ooo=True,
                import_month="2026-03",
            )
            for d in range(2, 14)
            if date(2026, 3, d).weekday() < 5
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        # All working days are OOO, so effective working days = 0, expected = 0
        assert len(result) == 0

    # 5. Employee who started mid-month → adjusted threshold
    def test_mid_month_start_adjusted_threshold(self):
        # Employee started on March 10 (Tuesday)
        employees = [make_employee(id=1, rms_name="Eve", status="ACTIVE", start_date="2026-03-10")]
        # Mar 10-13 = 4 working days. Need 4*4=16h. Give 20h → not flagged.
        logs = [
            make_timesheet_entry(employee_id=1, log_date="2026-03-10", hours_logged=5.0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-11", hours_logged=5.0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-12", hours_logged=5.0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-13", hours_logged=5.0, import_month="2026-03"),
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 0

    def test_mid_month_start_with_low_hours_flagged(self):
        # Employee started March 10 (Tuesday). 4 working days * 4h = 16h needed.
        # Only logged 5h → below 50% of 16 = 8, so "warning"
        employees = [make_employee(id=1, rms_name="Eve", status="ACTIVE", start_date="2026-03-10")]
        logs = [
            make_timesheet_entry(employee_id=1, log_date="2026-03-10", hours_logged=5.0, import_month="2026-03"),
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 1
        assert result[0].working_days_elapsed == 4
        assert result[0].expected_hours == 16.0
        assert result[0].actual_hours == 5.0

    # 6. EXITED employees → excluded
    def test_exited_employee_excluded(self):
        employees = [
            make_employee(id=1, rms_name="Frank", status="EXITED", exit_date="2026-02-28"),
        ]
        logs: list[dict] = []

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 15),
        )

        assert len(result) == 0

    def test_active_status_required(self):
        """Non-ACTIVE status employees are excluded even without exit_date."""
        employees = [
            make_employee(id=1, rms_name="Grace", status="ON_HOLD"),
        ]
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=[],
            month="2026-03",
            check_date=date(2026, 3, 15),
        )
        assert len(result) == 0

    # 7. Edge case: month with fewer working days (February)
    def test_february_working_days(self):
        employees = [make_employee(id=1, rms_name="Hank", status="ACTIVE", start_date="2025-01-01")]
        logs: list[dict] = []

        # Feb 2026: 1st is Sunday, 28th is Saturday → 20 working days
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-02",
            check_date=date(2026, 2, 28),
        )

        assert len(result) == 1
        assert result[0].working_days_elapsed == 20
        assert result[0].expected_hours == 80.0  # 20 * 4.0

    # 8. Edge case: empty employee list
    def test_empty_employee_list(self):
        result = detect_defaulters(
            employees=[],
            timesheet_logs=[],
            month="2026-03",
            check_date=date(2026, 3, 15),
        )
        assert result == []

    # Additional edge cases

    def test_check_date_before_month_returns_empty(self):
        employees = [make_employee(id=1, status="ACTIVE")]
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=[],
            month="2026-03",
            check_date=date(2026, 2, 15),
        )
        assert result == []

    def test_check_date_after_month_clamped_to_month_end(self):
        """If check_date is past month end, clamp to last day of month."""
        employees = [make_employee(id=1, rms_name="Ivan", status="ACTIVE", start_date="2025-01-01")]
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=[],
            month="2026-03",
            check_date=date(2026, 4, 15),  # Past March
        )
        assert len(result) == 1
        # March 2026: 22 working days (Mar 1 is Sun, 31 is Tue)
        assert result[0].working_days_elapsed == 22

    def test_info_severity_when_between_50_and_100_percent(self):
        employees = [make_employee(id=1, rms_name="Jake", status="ACTIVE")]
        # 10 working days, expected=40h. Give 25h (62.5% → info severity)
        logs = [
            make_timesheet_entry(employee_id=1, log_date=f"2026-03-{d:02d}", hours_logged=5.0, import_month="2026-03")
            for d in [2, 3, 4, 5, 6]  # 5 days * 5h = 25h
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 1
        assert result[0].severity == "info"
        assert result[0].actual_hours == 25.0

    def test_sorting_critical_before_warning_before_info(self):
        employees = [
            make_employee(id=1, rms_name="A-Info", status="ACTIVE"),
            make_employee(id=2, rms_name="B-Critical", status="ACTIVE"),
            make_employee(id=3, rms_name="C-Warning", status="ACTIVE"),
        ]
        logs = [
            # A-Info: 25h out of 40 expected (>50%) → info
            *[make_timesheet_entry(employee_id=1, log_date=f"2026-03-{d:02d}", hours_logged=5.0, import_month="2026-03")
              for d in [2, 3, 4, 5, 6]],
            # B-Critical: 0 hours → critical
            # C-Warning: 10h out of 40 (<50%) → warning
            make_timesheet_entry(employee_id=3, log_date="2026-03-02", hours_logged=10.0, import_month="2026-03"),
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 3
        assert result[0].severity == "critical"
        assert result[1].severity == "warning"
        assert result[2].severity == "info"

    def test_ooo_reduces_expected_hours(self):
        """OOO on a working day should reduce expected hours."""
        employees = [make_employee(id=1, rms_name="Kim", status="ACTIVE")]
        # 10 working days Mar 2-13. 2 OOO days → 8 effective days → 32h expected
        # Give 30h → deficit is only 2h → info severity
        logs = [
            make_timesheet_entry(employee_id=1, log_date="2026-03-02", is_ooo=True, hours_logged=0, import_month="2026-03"),
            make_timesheet_entry(employee_id=1, log_date="2026-03-03", is_ooo=True, hours_logged=0, import_month="2026-03"),
            *[make_timesheet_entry(employee_id=1, log_date=f"2026-03-{d:02d}", hours_logged=3.75, import_month="2026-03")
              for d in [4, 5, 6, 9, 10, 11, 12, 13]],  # 8 days * 3.75 = 30h
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 1
        assert result[0].working_days_elapsed == 8  # 10 - 2 OOO
        assert result[0].expected_hours == 32.0

    def test_multiple_employees_mixed(self):
        """Mix of defaulters and non-defaulters returns only defaulters."""
        employees = [
            make_employee(id=1, rms_name="Good Worker", status="ACTIVE"),
            make_employee(id=2, rms_name="Slacker", status="ACTIVE"),
        ]
        # Good Worker: 10 working days * 5h = 50h (above 40h threshold)
        good_logs = [
            make_timesheet_entry(employee_id=1, log_date=f"2026-03-{d:02d}", hours_logged=5.0, import_month="2026-03")
            for d in range(2, 14) if date(2026, 3, d).weekday() < 5
        ]
        # Slacker: 0 hours
        result = detect_defaulters(
            employees=employees,
            timesheet_logs=good_logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 1
        assert result[0].rms_name == "Slacker"

    def test_future_logs_not_counted(self):
        """Logs after check_date should not count toward actual hours."""
        employees = [make_employee(id=1, rms_name="Lisa", status="ACTIVE")]
        logs = [
            make_timesheet_entry(employee_id=1, log_date="2026-03-20", hours_logged=40.0, import_month="2026-03"),
        ]

        result = detect_defaulters(
            employees=employees,
            timesheet_logs=logs,
            month="2026-03",
            check_date=date(2026, 3, 13),
        )

        assert len(result) == 1
        assert result[0].actual_hours == 0  # The log on Mar 20 is after check_date
