"""Flag classification for Jira vs AWS comparison reports."""

# Bands use absolute discrepancy % (vs billable target in compute pipeline).
GREEN_MAX_PCT = 30.0  # |pct| <= 30 → compliant
AMBER_MAX_PCT = 50.0  # 30 < |pct| <= 50 → needs review; |pct| > 50 → non-compliant


def compute_comparison_fields(
    jira_hours: float | int,
    aws_hours: float | int | None,
    billable_hours: float | int | None,
) -> tuple[float | None, float | None, str]:
    """Single source of truth: difference, % vs billable target, and flag from raw hours.

    Use when persisting *and* when reading computed_reports so stored flags never drift
    from displayed Jira/AWS/target values after rule changes.
    """
    j = float(jira_hours or 0)
    bh = float(billable_hours) if billable_hours is not None else 0.0
    aws: float | None = float(aws_hours) if aws_hours is not None else None

    difference: float | None = None
    difference_pct: float | None = None
    if aws is not None and bh > 0:
        difference = round(j - aws, 2)
        difference_pct = round((difference / bh) * 100, 1)

    flag = classify_flag(difference_pct, j, aws)
    return difference, difference_pct, flag


def classify_flag(
    difference_pct: float | None,
    jira_hours: float,
    aws_hours: float | None,
) -> str:
    """Classify comparison into green, amber, or red.

    Compliant (green): 0 <= |discrepancy %| <= 30 (requires a computable % vs billable target).

    Needs review (amber): 30 < |discrepancy %| <= 50.

    Non-compliant (red):
        - Jira hours missing or zero (<= 0), or AWS is missing (None) or zero (<= 0)
        - |discrepancy %| > 50
        - Discrepancy % cannot be computed (no valid billable target) while both sides report hours

    Uses absolute percentage so over- and under-tracking are treated the same.
    """
    if jira_hours <= 0 or aws_hours is None or aws_hours <= 0:
        return "red"

    # Cannot place in 0–30% or 30–50% bands without a percentage → non-compliant
    if difference_pct is None:
        return "red"

    abs_diff = abs(float(difference_pct))
    if abs_diff > AMBER_MAX_PCT:
        return "red"
    if abs_diff > GREEN_MAX_PCT:
        return "amber"
    return "green"
