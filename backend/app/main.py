from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.job_profiles.router import router as job_profiles_router
from app.resource_requests.router import router as resource_requests_router
from app.candidates.router import router as candidates_router
from app.candidates.resume import router as resume_router
from app.sows.router import router as sows_router
from app.communication_logs.router import router as communication_logs_router
from app.dashboard.router import router as dashboard_router

app = FastAPI(title="RMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router)
app.include_router(job_profiles_router)
app.include_router(resource_requests_router)
app.include_router(candidates_router)
app.include_router(resume_router)
app.include_router(sows_router)
app.include_router(communication_logs_router)
app.include_router(dashboard_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
