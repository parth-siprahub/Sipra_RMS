"""build_payroll_segregation: employees grouped by payroll source."""
from app.analytics.service import build_payroll_segregation


def test_groups_by_source():
    employees = [
        {"source": None},
        {"source": ""},
        {"source": "INTERNAL"},
        {"source": "Anten"},
        {"source": "Anten"},
        {"source": "SipraHub"},
    ]
    result = build_payroll_segregation(employees)
    by_label = {r.label: r.value for r in result}
    assert by_label["Internal"] == 3   # null + "" + "INTERNAL"
    assert by_label["Anten"] == 2
    assert by_label["SipraHub"] == 1


def test_empty_returns_empty():
    result = build_payroll_segregation([])
    assert result == []


def test_all_internal_returns_single_bucket():
    employees = [{"source": "INTERNAL"}, {"source": None}, {"source": ""}]
    result = build_payroll_segregation(employees)
    assert len(result) == 1
    assert result[0].label == "Internal"
    assert result[0].value == 3
