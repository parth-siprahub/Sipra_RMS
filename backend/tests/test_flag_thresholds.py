"""Unit tests for flag classification logic (Jira vs AWS comparison)."""
import pytest

from app.reports.flag_classifier import classify_flag


class TestClassifyFlag:
    """Tests for the classify_flag pure function."""

    def test_no_aws_data_returns_no_aws(self):
        """1. No AWS data -> 'no_aws'."""
        result = classify_flag(
            difference_pct=None,
            any_week_low=False,
            has_aws_data=False,
            billable_hours=160.0,
        )
        assert result == "no_aws"

    def test_zero_percent_difference_returns_green(self):
        """2. 0% difference -> 'green'."""
        result = classify_flag(
            difference_pct=0.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "green"

    def test_five_percent_difference_returns_green(self):
        """3. 5% difference -> 'green'."""
        result = classify_flag(
            difference_pct=5.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "green"

    def test_ten_percent_boundary_returns_green(self):
        """4. 10% difference -> 'green' (boundary: <= 10% is green)."""
        result = classify_flag(
            difference_pct=10.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "green"

    def test_ten_point_one_percent_returns_amber(self):
        """5. 10.1% difference -> 'amber'."""
        result = classify_flag(
            difference_pct=10.1,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "amber"

    def test_fifteen_percent_returns_amber(self):
        """6. 15% difference -> 'amber'."""
        result = classify_flag(
            difference_pct=15.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "amber"

    def test_twenty_five_percent_boundary_returns_amber(self):
        """7. 25% difference -> 'amber' (boundary: <= 25% is amber)."""
        result = classify_flag(
            difference_pct=25.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "amber"

    def test_twenty_five_point_one_percent_returns_red(self):
        """8. 25.1% difference -> 'red'."""
        result = classify_flag(
            difference_pct=25.1,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "red"

    def test_fifty_percent_returns_red(self):
        """9. 50% difference -> 'red'."""
        result = classify_flag(
            difference_pct=50.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "red"

    def test_amber_with_any_week_low_overrides_to_red(self):
        """10. 15% difference BUT any_week_low=True -> 'red'."""
        result = classify_flag(
            difference_pct=15.0,
            any_week_low=True,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "red"

    def test_green_with_any_week_low_overrides_to_red(self):
        """11. 5% difference BUT any_week_low=True -> 'red'."""
        result = classify_flag(
            difference_pct=5.0,
            any_week_low=True,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "red"

    def test_negative_difference_above_threshold_returns_red(self):
        """12. Negative difference (AWS > Jira) with abs > 25% -> 'red'."""
        result = classify_flag(
            difference_pct=-30.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "red"

    def test_zero_billable_hours_with_aws_returns_green(self):
        """13. billable_hours == 0 with AWS data -> 'green'."""
        result = classify_flag(
            difference_pct=None,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=0.0,
        )
        assert result == "green"

    def test_none_difference_pct_with_aws_and_positive_billable_returns_green(self):
        """difference_pct=None with AWS data and positive billable -> 'green'."""
        result = classify_flag(
            difference_pct=None,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "green"

    def test_negative_difference_in_amber_range(self):
        """Negative difference with abs in amber range -> 'amber'."""
        result = classify_flag(
            difference_pct=-15.0,
            any_week_low=False,
            has_aws_data=True,
            billable_hours=160.0,
        )
        assert result == "amber"
