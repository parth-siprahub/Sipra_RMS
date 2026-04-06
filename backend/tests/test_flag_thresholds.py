"""Unit tests for flag classification logic (Jira vs AWS comparison)."""

from app.reports.flag_classifier import (
    AMBER_MAX_PCT,
    GREEN_MAX_PCT,
    classify_flag,
    compute_comparison_fields,
)


class TestClassifyFlag:
    """Tests for classify_flag — bands: |pct| <= 30 green, 30 < |pct| <= 50 amber, > 50 red; missing hours → red."""

    def test_no_aws_hours_returns_red(self):
        assert classify_flag(0.0, jira_hours=160.0, aws_hours=None) == "red"

    def test_zero_aws_hours_returns_red(self):
        assert classify_flag(0.0, jira_hours=160.0, aws_hours=0.0) == "red"

    def test_zero_jira_hours_returns_red(self):
        assert classify_flag(None, jira_hours=0.0, aws_hours=160.0) == "red"

    def test_negative_zero_jira_returns_red(self):
        assert classify_flag(-5.0, jira_hours=0.0, aws_hours=100.0) == "red"

    def test_zero_percent_difference_returns_green(self):
        assert classify_flag(0.0, jira_hours=160.0, aws_hours=160.0) == "green"

    def test_fifteen_percent_returns_green(self):
        assert classify_flag(15.0, jira_hours=160.0, aws_hours=136.0) == "green"

    def test_thirty_percent_boundary_returns_green(self):
        assert classify_flag(30.0, jira_hours=100.0, aws_hours=70.0) == "green"

    def test_thirty_point_one_percent_returns_amber(self):
        assert classify_flag(30.1, jira_hours=160.0, aws_hours=111.84) == "amber"

    def test_forty_percent_returns_amber(self):
        assert classify_flag(40.0, jira_hours=100.0, aws_hours=60.0) == "amber"

    def test_fifty_percent_boundary_returns_amber(self):
        assert classify_flag(50.0, jira_hours=100.0, aws_hours=50.0) == "amber"

    def test_fifty_point_one_percent_returns_red(self):
        assert classify_flag(50.1, jira_hours=160.0, aws_hours=79.84) == "red"

    def test_negative_difference_uses_absolute_value_amber(self):
        assert classify_flag(-35.0, jira_hours=160.0, aws_hours=216.0) == "amber"

    def test_negative_difference_uses_absolute_value_green(self):
        assert classify_flag(-25.0, jira_hours=160.0, aws_hours=200.0) == "green"

    def test_negative_difference_high_abs_returns_red(self):
        assert classify_flag(-60.0, jira_hours=100.0, aws_hours=160.0) == "red"

    def test_none_difference_both_hours_positive_is_red(self):
        """No % vs target → cannot be compliant or needs-review; non-compliant."""
        assert classify_flag(None, jira_hours=160.0, aws_hours=150.0) == "red"

    def test_constants_document_expected_bands(self):
        assert GREEN_MAX_PCT == 30.0
        assert AMBER_MAX_PCT == 50.0


class TestComputeComparisonFields:
    """Ensures persisted row fields and flags stay aligned (read path)."""

    def test_zero_jira_with_aws_target_176_is_red(self):
        diff, pct, flag = compute_comparison_fields(0, 114.7, 176)
        assert flag == "red"
        assert diff == round(-114.7, 2)
        assert pct is not None and pct < -60

    def test_thirty_one_percent_vs_target_is_amber(self):
        diff, pct, flag = compute_comparison_fields(100, 45.4, 176)
        assert pct is not None
        assert 30 < abs(pct) <= 50
        assert flag == "amber"

    def test_fifty_one_percent_vs_target_is_red(self):
        diff, pct, flag = compute_comparison_fields(176, 86.24, 176)
        assert pct is not None
        assert abs(pct) > 50
        assert flag == "red"

    def test_no_billable_target_with_hours_is_red(self):
        diff, pct, flag = compute_comparison_fields(80, 70, 0)
        assert pct is None
        assert flag == "red"

    def test_no_billable_target_none_is_red(self):
        diff, pct, flag = compute_comparison_fields(80, 70, None)
        assert pct is None
        assert flag == "red"
