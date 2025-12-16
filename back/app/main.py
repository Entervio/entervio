import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.scheduler import shutdown_scheduler, start_scheduler
from app.services.grading_service import grading_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        start_scheduler()
        print("Scheduler initialization completed")
    except Exception as e:
        print(f"Scheduler failed to start: {e}")
        logger.error(f"Scheduler startup error: {e}", exc_info=True)

    yield

    shutdown_scheduler()
    grading_service.shutdown(wait=True)


app = FastAPI(
    title="Voice Interview API",
    description="AI-powered voice interview system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def read_root():
    return {"message": "Welcome to Voice Interview API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
