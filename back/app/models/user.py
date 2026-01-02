from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    deleted_at = Column(DateTime, nullable=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    phone: Mapped[str] = mapped_column(String, nullable=True)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    resume = relationship(
        "Resume", uselist=False, back_populates="user", cascade="all, delete-orphan"
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
    skills_list = relationship(
        "Skill", back_populates="user", cascade="all, delete-orphan"
    )

    # Keeping raw_resume_text for backup/debug
    raw_resume_text = Column(Text, nullable=True)
    supabase_id = Column(Text, nullable=True, unique=True)

    interviews = relationship("Interview", back_populates="user")
    applications = relationship(
        "Application", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def has_resume(self) -> bool:
        return bool(
            self.work_experiences
            or self.educations
            or self.projects
            or self.skills_list
            or self.languages
        )
