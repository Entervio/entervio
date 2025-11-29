from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app.core.config import settings
from app.api.v1.router import api_router

import logging

from app.models.interview import Interview
from app.models.question_answer import QuestionAnswer
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Voice Interview API",
    description="AI-powered voice interview system",
    version="1.0.0"
)

# Configure CORS
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