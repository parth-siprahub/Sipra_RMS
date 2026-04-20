"""build_hiring_type_split: resource requests grouped by is_backfill field."""
from app.analytics.service import build_hiring_type_split


def test_counts_new_and_backfill():
    reqs = [
        {"is_backfill": False},
        {"is_backfill": False},
        {"is_backfill": True},
    ]
    result = build_hiring_type_split(reqs)
    by_label = {r.label: r.value for r in result}
    assert by_label == {"New": 2, "Backfill": 1}


def test_null_is_backfill_treated_as_new():
    reqs = [{"is_backfill": None}]
    result = build_hiring_type_split(reqs)
    by_label = {r.label: r.value for r in result}
    assert by_label["New"] == 1
    assert by_label["Backfill"] == 0


def test_empty_returns_two_zeros():
    result = build_hiring_type_split([])
    assert len(result) == 2
    assert all(r.value == 0 for r in result)
