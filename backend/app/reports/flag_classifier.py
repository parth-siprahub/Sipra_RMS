"""Flag classification for Jira vs AWS comparison reports."""

GREEN_THRESHOLD = 10.0   # <= 10% difference
AMBER_THRESHOLD = 25.0   # <= 25% difference


def classify_flag(
    difference_pct: float | None,
    any_week_low: bool,
    has_aws_data: bool,
    billable_hours: float,
) -> str:
    """Classify a timesheet comparison row into green/amber/red/no_aws.

    Rules:
        - no_aws:  no AWS data available
        - red:     discrepancy > 25% OR any AWS week below 30h threshold
        - amber:   discrepancy > 10% AND <= 25%
        - green:   discrepancy <= 10% (or no meaningful comparison possible)
    """
    if not has_aws_data:
        return "no_aws"
    if any_week_low:
        return "red"
    if difference_pct is None or billable_hours <= 0:
        return "green"
    abs_diff = abs(difference_pct)
    if abs_diff > AMBER_THRESHOLD:
        return "red"
    if abs_diff > GREEN_THRESHOLD:
        return "amber"
    return "green"
