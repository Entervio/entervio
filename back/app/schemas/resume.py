from pydantic import BaseModel, ConfigDict


# --- Work Experience ---
class WorkExperienceBase(BaseModel):
    company: str
    role: str
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class WorkExperienceCreate(WorkExperienceBase):
    pass


class WorkExperience(WorkExperienceBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Education ---
class EducationBase(BaseModel):
    institution: str
    degree: str
    field_of_study: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    graduation_date: str | None = None
    description: str | None = None


class EducationCreate(EducationBase):
    pass


class Education(EducationBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Project ---
class ProjectBase(BaseModel):
    name: str
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    tech_stack: str | None = None
    details: str | None = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Language ---
class LanguageBase(BaseModel):
    name: str
    proficiency: str | None = None


class LanguageCreate(LanguageBase):
    pass


class Language(LanguageBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Skill ---
class SkillBase(BaseModel):
    name: str
    category: str | None = None


class SkillCreate(SkillBase):
    pass


class Skill(SkillBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Full Resume ---
class ResumeFull(BaseModel):
    website: str | None = None
    linkedin: str | None = None
    summary: str | None = None
    work_experiences: list[WorkExperience] = []
    educations: list[Education] = []
    projects: list[Project] = []
    languages: list[Language] = []
    skills: list[Skill] = []


class ResumeUpdate(BaseModel):
    website: str | None = None
    linkedin: str | None = None
    summary: str | None = None
    work_experiences: list[WorkExperienceCreate] = []
    educations: list[EducationCreate] = []
    projects: list[ProjectCreate] = []
    languages: list[LanguageCreate] = []
    skills: list[SkillCreate] = []


class TailorRequest(BaseModel):
    user_id: int
    job_description: str
    critique: list[str] | None = None


class CoverLetterRequest(BaseModel):
    job_description: str
    critique: list[str] | None = None
