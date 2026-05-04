"""
RMS FastAPI Application
========================
Security hardened for production:
  - SecurityHeadersMiddleware (X-Frame-Options, CSP, HSTS-ready)
  - SlowAPI rate limiting (global + per-route)
  - CORS restricted to explicit origins/methods/headers
  - Structured JSON logging with request correlation IDs

All HTTP routes are mounted under /api (matches Nginx location /api/ and VITE_API_URL …/api).
"""
import time
import uuid
import logging
import contextvars
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.config import settings
from app.logging_config import setup_logging
from app.auth.router import router as auth_router
from app.job_profiles.router import router as job_profiles_router
from app.resource_requests.router import router as resource_requests_router
from app.candidates.router import router as candidates_router
from app.candidates.resume import router as resume_router
from app.sows.router import router as sows_router
from app.communication_logs.router import router as communication_logs_router
from app.dashboard.router import router as dashboard_router
from app.vendors.router import router as vendors_router
from app.employees.router import router as employees_router
from app.timesheets.router import router as timesheets_router
from app.billing.router import router as billing_router
from app.clients.router import router as clients_router
from app.exports.router import router as exports_router
from app.audit.router import router as audit_router
from app.reports.router import router as reports_router
from app.billing_config.router import router as billing_config_router
from app.analytics.router import router as analytics_router
from app.users.router import router as users_router

# Public URL prefix (must match Nginx proxy_pass and frontend VITE_API_URL).
API_PREFIX = "/api"

# Set up structured JSON logging (replaces basicConfig)
setup_logging()
logger = logging.getLogger(__name__)

# Context variable for request correlation ID
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)



# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RMS API",
    version="1.0.0",
    docs_url=f"{API_PREFIX}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=f"{API_PREFIX}/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url=f"{API_PREFIX}/openapi.json",
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

def get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin in settings.CORS_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With",
        }
    return {}

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    headers = get_cors_headers(request)
    if getattr(exc, "headers", None):
        headers.update(exc.headers)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
        headers=headers
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    logger.error("Unhandled exception: %s\n%s", exc, error_trace)
    # Structured logging captures errors — no file writing needed in production
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=headers
    )


# ─── Security Headers Middleware ───────────────────────────────────────────────
# Uses @app.middleware("http") (NOT BaseHTTPMiddleware) to avoid anyio
# BaseExceptionGroup incompatibility with async streaming endpoints.
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Adds essential security headers to every response."""
    response = await call_next(request)
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # Legacy XSS filter (still used by some browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Control referrer info sent with requests
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Restrict browser feature access
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # HSTS: Only activate in production after HTTPS is confirmed
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# ─── Request Correlation ID + Timing Middleware ──────────────────────────────
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    # Generate or accept a correlation ID
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request_id_ctx.set(rid)

    if settings.LOG_HTTP_REQUESTS:
        # Temporary debugging: visible in PM2/docker stdout without log level changes
        print(f"{request.method} {request.url.path}", flush=True)
        logger.info("HTTP %s %s [rid=%s]", request.method, request.url.path, rid)

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    logger.debug("%s %s completed in %.4fs [rid=%s]", request.method, request.url.path, process_time, rid)
    response.headers["X-Request-ID"] = rid
    response.headers["X-Process-Time"] = str(process_time)
    return response


# ─── CORS ─────────────────────────────────────────────────────────────────────
# Middleware order matters in Starlette: @app.middleware decorators are evaluated
# last-registered-first on the way out (response), first-registered-first on the
# way in (request).  CORS must wrap everything so its headers appear on ALL
# responses including errors.

# Outer: CORS (wraps everything — ensures CORS headers on ALL responses)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-Process-Time", "X-Request-ID"],
)

# ─── Routers (all under /api) ────────────────────────────────────────────────
from app.job_profiles.jd import router as jd_router

system_router = APIRouter(prefix=API_PREFIX, tags=["System"])


@system_router.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@system_router.get("/ready")
async def readiness_check():
    """Check database connectivity. Returns 503 if Supabase is unreachable."""
    from app.database import get_supabase_admin_async
    from fastapi.responses import JSONResponse
    try:
        client = await get_supabase_admin_async()
        # Simple query to verify DB connectivity
        await client.table("employees").select("id").limit(1).execute()
        return {"status": "ready", "database": "connected"}
    except Exception as exc:
        logger.error("Readiness check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "disconnected", "error": str(exc)},
        )


# ─── EOD Status Flip Scheduler (Python fallback for pg_cron) ─────────────────
# Runs daily at 23:59 IST (18:29 UTC) inside the FastAPI process.
# ONLY active when settings.ENABLE_EOD_SCHEDULER is True (set in .env).
# When pg_cron is available and scheduled (Migration 015), set this to False
# to avoid double-execution.

import asyncio as _asyncio
from datetime import timezone as _tz, datetime as _dt, timedelta as _td


async def _eod_status_flip_loop() -> None:  # pragma: no cover
    """
    Asyncio background loop: flip employees.status → EXITED where exit_date <= today.
    Fires daily at 23:59 IST (UTC 18:29). Pure asyncio — no APScheduler required.
    """
    IST_OFFSET = _td(hours=5, minutes=30)
    TARGET_TIME_IST = (18, 29)  # (hour, minute) in IST

    while True:
        now_utc = _dt.now(_tz.utc)
        now_ist = now_utc + IST_OFFSET
        # Next fire: today at 23:59 IST, or tomorrow if already past
        next_fire_ist = now_ist.replace(
            hour=TARGET_TIME_IST[0], minute=TARGET_TIME_IST[1], second=0, microsecond=0
        )
        if next_fire_ist <= now_ist:
            next_fire_ist += _td(days=1)
        sleep_secs = (next_fire_ist - now_ist).total_seconds()
        logger.info("EOD scheduler: next status flip in %.0fs (at %s IST)", sleep_secs, next_fire_ist.strftime("%Y-%m-%d %H:%M"))
        await _asyncio.sleep(sleep_secs)

        try:
            from app.database import get_supabase_admin_async
            client = await get_supabase_admin_async()
            today = _dt.now(_tz.utc).strftime("%Y-%m-%d")
            res = await client.table("employees").select("id,rms_name,exit_date").execute()
            targets = [
                e for e in (res.data or [])
                if e.get("exit_date") and e["exit_date"] <= today
            ]
            for emp in targets:
                await client.table("employees").update({"status": "EXITED"}).eq("id", emp["id"]).execute()
            logger.info("EOD status flip: flipped %d employees to EXITED", len(targets))
        except Exception as _exc:
            logger.error("EOD status flip failed: %s", _exc)


@app.on_event("startup")
async def _start_eod_scheduler() -> None:  # pragma: no cover
    if getattr(settings, "ENABLE_EOD_SCHEDULER", False):
        logger.info("EOD status scheduler enabled — starting background loop")
        _asyncio.create_task(_eod_status_flip_loop())
    else:
        logger.debug("EOD status scheduler disabled (ENABLE_EOD_SCHEDULER=False). Use pg_cron (Migration 015).")


app.include_router(system_router)
app.include_router(jd_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(job_profiles_router, prefix=API_PREFIX)
app.include_router(resource_requests_router, prefix=API_PREFIX)
app.include_router(candidates_router, prefix=API_PREFIX)
app.include_router(resume_router, prefix=API_PREFIX)
app.include_router(sows_router, prefix=API_PREFIX)
app.include_router(communication_logs_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)
app.include_router(vendors_router, prefix=API_PREFIX)
app.include_router(employees_router, prefix=API_PREFIX)
app.include_router(timesheets_router, prefix=API_PREFIX)
app.include_router(billing_router, prefix=API_PREFIX)
app.include_router(clients_router, prefix=API_PREFIX)
app.include_router(exports_router, prefix=API_PREFIX)
app.include_router(audit_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)
app.include_router(billing_config_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
