from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start_date = Column(
        String, nullable=True
    )  # Keeping as string 'YYYY-MM' for flexibility
    end_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    user = relationship("User", back_populates="work_experiences")


class Education(Base):
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    institution = Column(String, nullable=False)
    degree = Column(String, nullable=False)
    field_of_study = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    graduation_date = Column(
        String, nullable=True
    )  # Sometimes simpler just to have grad date

    user = relationship("User", back_populates="educations")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    role = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    tech_stack = Column(String, nullable=True)  # Comma separated or just string
    details = Column(Text, nullable=True)

    user = relationship("User", back_populates="projects")


class Language(Base):
    __tablename__ = "languages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    proficiency = Column(String, nullable=True)  # e.g., 'Native', 'Fluent', 'B2'

    user = relationship("User", back_populates="languages")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    category = Column(String, nullable=True)  # 'technical', 'soft', 'tool'

    user = relationship("User", back_populates="skills_list")
