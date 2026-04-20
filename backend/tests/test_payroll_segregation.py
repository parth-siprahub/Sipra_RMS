"""build_payroll_segregation: candidates grouped by vendor (payroll source)."""
from app.analytics.service import build_payroll_segregation


def test_groups_by_vendor():
    cands = [
        {"vendor": None},
        {"vendor": ""},
        {"vendor": "INTERNAL"},
        {"vendor": "Acme Corp"},
        {"vendor": "Acme Corp"},
        {"vendor": "TechStaff"},
    ]
    result = build_payroll_segregation(cands)
    by_label = {r.label: r.value for r in result}
    assert by_label["Internal"] == 3   # null + "" + "INTERNAL"
    assert by_label["Acme Corp"] == 2
    assert by_label["TechStaff"] == 1


def test_empty_returns_empty():
    result = build_payroll_segregation([])
    assert result == []


def test_all_internal_returns_single_bucket():
    cands = [{"vendor": "INTERNAL"}, {"vendor": None}, {"vendor": ""}]
    result = build_payroll_segregation(cands)
    assert len(result) == 1
    assert result[0].label == "Internal"
    assert result[0].value == 3
