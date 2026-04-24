"""Dashboard metrics — aligned with actual DB schema."""
import re
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.database import get_supabase_admin_async
from app.utils.cache import api_cache
from app.utils.person_names import format_person_name

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _display_employee_name(raw: str | None) -> str:
    if not raw or not str(raw).strip():
        return "Unknown"
    return format_person_name(str(raw)) or str(raw)


@router.get("/metrics")
async def get_metrics(current_user: dict = Depends(get_current_user)):
    """Return aggregated dashboard dashboard/metrics."""
    cache_key = "dashboard_metrics"
    cached_data = api_cache.get(cache_key)
    if cached_data:
        return cached_data

    # Use the singleton async client
    client = await get_supabase_admin_async()

    # 1. Resource Requests Metrics
    requests = await client.table("resource_requests").select("status, priority, is_backfill").execute()
    all_requests = requests.data or []
    by_status: dict[str, int] = {}
    by_priority: dict[str, int] = {}
    for r in all_requests:
        s = r.get("status", "UNKNOWN")
        p = r.get("priority", "UNKNOWN")
        by_status[s] = by_status.get(s, 0) + 1
        by_priority[p] = by_priority.get(p, 0) + 1

    # 2. Candidate Metrics (Detailed Pipeline)
    candidates_raw = await client.table("candidates").select("status, vendor_id, vendor, request_id, created_at, skills").execute()
    all_candidates = candidates_raw.data or []
    candidates_by_status: dict[str, int] = {}
    for c in all_candidates:
        cs = c.get("status", "UNKNOWN")
        candidates_by_status[cs] = candidates_by_status.get(cs, 0) + 1

    # 3. Vendor Performance
    vendors_raw = await client.table("vendors").select("id, name").execute()
    vendor_map = {v["id"]: v["name"] for v in (vendors_raw.data or [])}

    vendor_stats: dict[str, dict[str, int]] = {}
    for c in all_candidates:
        v_id = c.get("vendor_id")
        v_name = vendor_map.get(v_id) if v_id else (c.get("vendor") or "INTERNAL")
        if v_name not in vendor_stats:
            vendor_stats[v_name] = {"total": 0, "selected": 0, "onboarded": 0, "rejected": 0}

        vendor_stats[v_name]["total"] += 1
        cs = c.get("status")
        if cs == "SELECTED":
            vendor_stats[v_name]["selected"] += 1
        elif cs == "ONBOARDED":
            vendor_stats[v_name]["onboarded"] += 1
        elif cs in ["REJECTED_BY_ADMIN", "REJECTED_BY_CLIENT", "SCREEN_REJECT", "L1_REJECT"]:
            vendor_stats[v_name]["rejected"] += 1

    # 4. SOW Utilization
    sows_raw = await client.table("sows").select("id, sow_number, max_resources").eq("is_active", True).execute()
    sows = sows_raw.data or []

    # Count onboarded/selected per request per SOW
    req_sow_map = await client.table("resource_requests").select("id, sow_id").execute()
    req_to_sow = {r["id"]: r["sow_id"] for r in (req_sow_map.data or []) if r.get("sow_id")}

    sow_utilization = []
    for s in sows:
        s_id = s["id"]
        count = sum(
            1 for c in all_candidates
            if c.get("status") in ["SELECTED", "ONBOARDED"]
            and req_to_sow.get(c.get("request_id")) == s_id
        )

        sow_utilization.append({
            "sow_number": s["sow_number"],
            "max": s["max_resources"] or 0,
            "current": count,
        })

    # 5. Candidate Timeline (last 30 days)
    cutoff = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    timeline_counts: dict[str, int] = defaultdict(int)
    for c in all_candidates:
        ca = c.get("created_at")
        if ca:
            day = ca[:10]  # "YYYY-MM-DD"
            if day >= cutoff:
                timeline_counts[day] += 1
    timeline = sorted(
        [{"date": d, "count": n} for d, n in timeline_counts.items()],
        key=lambda x: x["date"],
    )

    # 6. Candidates by Skill (parsed from comma-separated string)
    skill_counts: dict[str, int] = defaultdict(int)
    for c in all_candidates:
        raw_skills = c.get("skills") or ""
        for s in raw_skills.split(","):
            s = s.strip()
            if s:
                skill_counts[s] += 1
    candidates_by_skill = sorted(
        [{"skill": k, "count": v} for k, v in skill_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    # 7. Compute rejection_rate per vendor
    for v_name, stats in vendor_stats.items():
        total = stats["total"]
        stats["rejection_rate"] = round(stats["rejected"] / total * 100, 1) if total > 0 else 0.0

    # 7b. Risk metrics (vendor-level + pipeline-level)
    vendor_risks: list[dict] = []
    for v_name, stats in vendor_stats.items():
        rate = stats["rejection_rate"]
        if rate > 60:
            risk_level = "Critical"
        elif rate > 45:
            risk_level = "High"
        elif rate > 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        vendor_risks.append({
            "vendor_name": v_name,
            "total": stats["total"],
            "rejected": stats["rejected"],
            "rejection_rate": rate,
            "risk_level": risk_level,
        })

    total_cand = len(all_candidates)
    total_rejected = sum(s["rejected"] for s in vendor_stats.values())
    total_on_hold = candidates_by_status.get("ON_HOLD", 0)

    pipeline_dropout_pct = round(total_rejected / total_cand * 100, 1) if total_cand > 0 else 0.0
    bottleneck_pct = round(total_on_hold / total_cand * 100, 1) if total_cand > 0 else 0.0

    success_count = sum(
        1 for c in all_candidates if c.get("status") in ("SELECTED", "ONBOARDED")
    )
    success_rate = success_count / total_cand if total_cand > 0 else 0.0
    dropout_rate = total_rejected / total_cand if total_cand > 0 else 0.0
    bottleneck_rate = total_on_hold / total_cand if total_cand > 0 else 0.0

    pipeline_health_score = round(
        (0.4 * success_rate + 0.3 * (1 - dropout_rate) + 0.3 * (1 - bottleneck_rate)) * 100, 1
    )

    critical_vendor_count = sum(1 for vr in vendor_risks if vr["risk_level"] == "Critical")

    risk = {
        "pipeline_dropout_pct": pipeline_dropout_pct,
        "bottleneck_pct": bottleneck_pct,
        "pipeline_health_score": pipeline_health_score,
        "critical_vendor_count": critical_vendor_count,
        "vendor_risks": vendor_risks,
    }

    # 7c. Skill-status cross-tabulation matrix
    skill_status_map: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for c in all_candidates:
        raw_skills = c.get("skills") or ""
        cs = c.get("status", "UNKNOWN")
        for s in raw_skills.split(","):
            s = s.strip()
            if s:
                skill_status_map[s][cs] += 1

    skill_status_matrix = sorted(
        [
            {
                "skill": skill,
                "statuses": dict(statuses),
                "total": sum(statuses.values()),
            }
            for skill, statuses in skill_status_map.items()
        ],
        key=lambda x: x["total"],
        reverse=True,
    )

    # 8. Employee & Triad Metrics
    employees_raw = await client.table("employees").select("*").execute()
    all_employees = employees_raw.data or []
    active_employees = [e for e in all_employees if e.get("status") == "ACTIVE"]

    # Active headcount by primary technology (job_profiles.technology), for dashboard drill-down
    tech_counts: dict[str, int] = defaultdict(int)
    cid_to_req: dict[int, object] = {}
    req_to_jp_e: dict[int, object] = {}
    jp_to_tech: dict[int, str] = {}
    active_cand_ids = list({e.get("candidate_id") for e in active_employees if e.get("candidate_id")})
    if active_cand_ids:
        cands_e = await client.table("candidates").select("id,request_id").in_("id", active_cand_ids).execute()
        cid_to_req = {c["id"]: c.get("request_id") for c in (cands_e.data or []) if c.get("id")}
        req_ids_e = [r for r in cid_to_req.values() if r]
        if req_ids_e:
            rrs_e = await client.table("resource_requests").select("id,job_profile_id").in_("id", list(set(req_ids_e))).execute()
            req_to_jp_e = {r["id"]: r.get("job_profile_id") for r in (rrs_e.data or []) if r.get("id")}
            jp_ids_e = list({j for j in req_to_jp_e.values() if j})
            if jp_ids_e:
                jps_e = await client.table("job_profiles").select("id,technology").in_("id", jp_ids_e).execute()
                jp_to_tech = {
                    j["id"]: (j.get("technology") or "").strip()
                    for j in (jps_e.data or [])
                    if j.get("id") is not None
                }

    for emp in active_employees:
        cid = emp.get("candidate_id")
        if not cid:
            tech_counts["Unspecified"] += 1
            continue
        rid = cid_to_req.get(cid)
        if not rid:
            tech_counts["Unspecified"] += 1
            continue
        jpid = req_to_jp_e.get(rid)
        if not jpid:
            tech_counts["Unspecified"] += 1
            continue
        raw = jp_to_tech.get(jpid) or ""
        if not raw:
            tech_counts["Unspecified"] += 1
        else:
            parts = [p.strip() for p in re.split(r"[/,]", raw) if p.strip()]
            label = parts[0] if parts else "Unspecified"
            tech_counts[label] += 1

    active_employees_by_technology = sorted(
        [{"technology": k, "count": v} for k, v in tech_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )

    # Compliance tracker: employees with missing triad identifiers
    missing_identifiers = []
    for emp in active_employees:
        missing = []
        if not emp.get("jira_username"):
            missing.append("jira_username")
        if not emp.get("aws_email"):
            missing.append("aws_email")
        if not emp.get("github_id"):
            missing.append("github_id")
        if missing:
            missing_identifiers.append({
                "employee_id": emp["id"],
                "rms_name": _display_employee_name(emp.get("rms_name")),
                "missing_fields": missing,
            })

    # Billing compliance summary (latest month)
    billing_raw = await client.table("billing_records").select("*").order("billing_month", desc=True).limit(200).execute()
    billing_records = billing_raw.data or []
    latest_month = billing_records[0]["billing_month"] if billing_records else None
    triad_summary = []
    emp_map = {e["id"]: e for e in all_employees}
    if latest_month:
        month_records = [b for b in billing_records if b["billing_month"] == latest_month]
        for br in month_records:
            emp = emp_map.get(br["employee_id"])
            triad_summary.append({
                "employee_id": br["employee_id"],
                "rms_name": _display_employee_name(emp.get("rms_name")) if emp else "Unknown",
                "jira_hours": br.get("total_logged_hours", 0),
                "capped_hours": br.get("capped_hours", 0),
                "aws_hours": br.get("aws_active_hours"),
                "compliance_75_pct": br.get("compliance_75_pct"),
                "is_billable": br.get("is_billable", True),
            })

    result = {
        "total_requests": len(all_requests),
        "open_requests": by_status.get("OPEN", 0),
        "requests_by_status": by_status,
        "requests_by_priority": by_priority,
        "total_candidates": sum(1 for c in all_candidates if c.get("status") in (
            "NEW", "SCREENING", "L1_SCHEDULED", "L1_COMPLETED", "L1_SHORTLIST",
            "INTERVIEW_SCHEDULED", "SELECTED", "WITH_ADMIN", "WITH_CLIENT", "SUBMITTED_TO_ADMIN",
        )),
        "candidates_by_status": candidates_by_status,
        "backfill_count": sum(1 for r in all_requests if r.get("is_backfill")),
        "vendor_performance": vendor_stats,
        "sow_utilization": sow_utilization,
        "timeline": timeline,
        "candidates_by_skill": candidates_by_skill,
        "total_employees": len(active_employees),
        "active_employees": len(active_employees),
        "active_employees_by_technology": active_employees_by_technology,
        "missing_identifiers": missing_identifiers,
        "triad_summary": triad_summary,
        "triad_billing_month": latest_month,
        "risk": risk,
        "skill_status_matrix": skill_status_matrix,
    }

    api_cache.set(cache_key, result)
    return result
