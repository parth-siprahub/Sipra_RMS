"""build_daily_status_matrix: group resource requests by job profile × candidate stage."""
from app.analytics.service import build_daily_status_matrix


_JP_MAP = {
    10: {"id": 10, "role_name": "Java Developer"},
    20: {"id": 20, "role_name": "DevOps Engineer"},
}


def test_aggregates_by_job_profile():
    reqs = [
        {"id": 1, "job_profile_id": 10, "status": "OPEN"},
        {"id": 2, "job_profile_id": 10, "status": "OPEN"},
        {"id": 3, "job_profile_id": 20, "status": "OPEN"},
    ]
    cands = [
        {"request_id": 1, "status": "SCREENING"},
        {"request_id": 2, "status": "L1_SCHEDULED"},
    ]
    result = build_daily_status_matrix(reqs, cands, _JP_MAP)
    assert len(result.rows) == 2
    jp10 = next(r for r in result.rows if r.job_profile_id == 10)
    assert jp10.job_profile_name == "Java Developer"
    assert jp10.total_requirements == 2
    assert jp10.by_stage.get("Screening", 0) == 1
    assert jp10.by_stage.get("L1", 0) == 1


def test_empty_inputs():
    result = build_daily_status_matrix([], [], {})
    assert result.rows == []


def test_request_with_no_candidates_counts_as_open():
    reqs = [{"id": 1, "job_profile_id": 10, "status": "OPEN"}]
    result = build_daily_status_matrix(reqs, [], _JP_MAP)
    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.by_stage.get("Open", 0) == 1  # no candidate = Open
