"""Requirement Tracker aggregates open resource_requests by furthest-reached candidate stage."""
import pytest
from app.analytics.service import build_requirement_tracker


def test_empty_returns_six_zero_buckets():
    result = build_requirement_tracker(resource_requests=[], candidates=[])
    assert len(result.stages) == 6
    assert all(s.open_count == 0 for s in result.stages)


def test_request_with_no_candidates_counts_as_new():
    reqs = [{"id": "r1", "status": "OPEN"}]
    result = build_requirement_tracker(resource_requests=reqs, candidates=[])
    new_bucket = next(s for s in result.stages if s.stage == "NEW")
    assert new_bucket.open_count == 1


def test_request_uses_furthest_candidate_stage():
    reqs = [{"id": "r1", "status": "OPEN"}]
    cands = [
        {"resource_request_id": "r1", "status": "SCREENING"},
        {"resource_request_id": "r1", "status": "L2_INTERVIEW"},
    ]
    result = build_requirement_tracker(resource_requests=reqs, candidates=cands)
    l2 = next(s for s in result.stages if s.stage == "L2")
    assert l2.open_count == 1
    assert sum(s.open_count for s in result.stages) == 1  # counted once only


def test_closed_requests_excluded():
    reqs = [
        {"id": "r1", "status": "OPEN"},
        {"id": "r2", "status": "CLOSED"},
    ]
    result = build_requirement_tracker(resource_requests=reqs, candidates=[])
    assert sum(s.open_count for s in result.stages) == 1
