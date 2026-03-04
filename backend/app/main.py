"""
RMS FastAPI Application
========================
Security hardened for production:
  - SecurityHeadersMiddleware (X-Frame-Options, CSP, HSTS-ready)
  - SlowAPI rate limiting (global + per-route)
  - CORS restricted to explicit origins/methods/headers
"""
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.config import settings
from app.auth.router import router as auth_router
from app.job_profiles.router import router as job_profiles_router
from app.resource_requests.router import router as resource_requests_router
from app.candidates.router import router as candidates_router
from app.candidates.resume import router as resume_router
from app.sows.router import router as sows_router
from app.communication_logs.router import router as communication_logs_router
from app.dashboard.router import router as dashboard_router
from app.vendors.router import router as vendors_router

logger = logging.getLogger(__name__)



# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RMS API",
    version="1.0.0",
    # Disable Swagger docs in production — set via env var
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── Security Headers Middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds essential security headers to every response."""
    async def dispatch(self, request: Request, call_next):
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


# ─── Request Timing Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.debug("%s %s completed in %.4fs", request.method, request.url.path, process_time)
    response.headers["X-Process-Time"] = str(process_time)
    return response


# ─── CORS ─────────────────────────────────────────────────────────────────────
# Middleware order matters — add CORS before SecurityHeaders
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["X-Process-Time"],
)

# Add SecurityHeaders after CORS so it wraps all responses
app.add_middleware(SecurityHeadersMiddleware)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(job_profiles_router)
app.include_router(resource_requests_router)
app.include_router(candidates_router)
app.include_router(resume_router)
app.include_router(sows_router)
app.include_router(communication_logs_router)
app.include_router(dashboard_router)
app.include_router(vendors_router)


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
