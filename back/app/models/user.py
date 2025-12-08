from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    deleted_at = Column(DateTime, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    skills_list = relationship(
        "Skill", back_populates="user", cascade="all, delete-orphan"
    )
    work_experiences = relationship(
        "WorkExperience", back_populates="user", cascade="all, delete-orphan"
    )
    educations = relationship(
        "Education", back_populates="user", cascade="all, delete-orphan"
    )
    projects = relationship(
        "Project", back_populates="user", cascade="all, delete-orphan"
    )
    languages = relationship(
        "Language", back_populates="user", cascade="all, delete-orphan"
    )

    # Keeping raw_resume_text for backup/debug
    raw_resume_text = Column(Text, nullable=True)
    supabase_id = Column(Text, nullable=True)

    interviews = relationship("Interview", back_populates="user")
