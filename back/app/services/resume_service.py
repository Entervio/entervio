import io
import json
import logging
from pathlib import Path
from typing import Any

import pdfplumber
import spacy
import typst
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.prompt_manager import prompt_manager
from app.models.resume_models import (
    Education,
    Language,
    Project,
    Resume,
    Skill,
    WorkExperience,
)
from app.models.user import User
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class ResumeParserService:
    def __init__(self):
        # Load Spacy (kept for fallback/hybrid logic, though LLM does most heavy lifting)
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            self.nlp = None
            print("Warning: Spacy model not found.")

    def extract_text_from_stream(self, file_stream) -> str:
        """
        Extracts raw text from a file stream (memory) instead of a file path.
        """
        text = ""
        try:
            # pdfplumber.open can read standard python file objects (BytesIO)
            with pdfplumber.open(file_stream) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text(layout=False)
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error reading PDF stream: {e}")
            return ""
        return text

    async def extract_data_with_llm(self, raw_text: str) -> dict[str, Any]:
        """
        Extracts structured data from resume text using Groq.
        """
        if not llm_service.groq_client:
            raise ValueError("Groq client not initialized")

        prompt = prompt_manager.format_prompt(
            "resume.extraction", resume_text=raw_text[:25000]
        )

        system_content = prompt_manager.get("resume.extraction_system")

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": system_content,
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )

            clean_json = completion.choices[0].message.content
            return json.loads(clean_json)
        except Exception as e:
            logger.error(f"Groq Parsing Error: {e}")
            return {"error": "Failed to parse resume data"}

    def get_core_context(self, parsed_data: dict[str, Any]) -> str:
        """
        Formats the most critical resume sections (summary, experience, skills)
        into a concise string for an interviewer agent.
        """
        context_parts = []

        # 1. Summary
        summary = parsed_data.get("summary", "No summary provided.")
        context_parts.append(f"CANDIDATE SUMMARY: {summary}")
        context_parts.append("-" * 20)

        # 2. Work Experience
        experience: list[dict[str, Any]] = parsed_data.get("work_experience", [])
        if experience:
            context_parts.append("WORK EXPERIENCE:")
            for job in experience:
                company = job.get("company", "N/A")
                role = job.get("role", "N/A")
                dates = f"({job.get('start_date', '')} to {job.get('end_date', '')})"

                job_desc = f"- **{role}** at **{company}** {dates}"
                context_parts.append(job_desc)

                # Add responsibilities for detail
                responsibilities = job.get("responsibilities", [])
                if responsibilities:
                    context_parts.append("  * Key Achievements/Responsibilities:")
                    for resp in responsibilities[:3]:  # Limit to top 3 for brevity
                        context_parts.append(f"    - {resp}")
            context_parts.append("-" * 20)

        # 3. Skills
        skills_data = parsed_data.get("skills", {})
        technical_skills = ", ".join(skills_data.get("technical", []))
        soft_skills = ", ".join(skills_data.get("soft", []))

        if technical_skills:
            context_parts.append(f"TECHNICAL SKILLS: {technical_skills}")
        if soft_skills:
            context_parts.append(f"SOFT SKILLS: {soft_skills}")

        return "\n".join(context_parts)

    def _compile_pdf(self, resume_data: dict[str, Any]) -> bytes:
        template_path = Path(__file__).parent.parent / "templates" / "resume.typ"

        return typst.compile(
            template_path,
            sys_inputs={"resume_data": json.dumps(resume_data, ensure_ascii=False)},
        )

    def _compile_cover_letter_pdf(self, cover_letter_data: dict[str, Any]) -> bytes:
        """
        Compiles a cover letter PDF using the Fireside template.
        """
        template_path = Path(__file__).parent.parent / "templates" / "cover_letter.typ"

        return typst.compile(
            template_path,
            sys_inputs={
                "cover_letter_data": json.dumps(cover_letter_data, ensure_ascii=False)
            },
        )

    async def tailor_resume(
        self,
        db: Session,
        user_id: int,
        job_description: str,
        critique: list[str] | None = None,
    ) -> bytes:
        """
        Tailors the user's resume for the given job description and returns PDF bytes.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # 1. Convert Relational Data to Dictionary
        resume_data = {
            "contact_info": {
                "name": f"{user.first_name} {user.last_name}",
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone": user.phone,
                "linkedin": user.resume.linkedin if user.resume else None,
                "website": user.resume.website if user.resume else None,
            },
            "summary": user.resume.summary
            if user.resume and user.resume.summary
            else "Experienced professional.",
            "work_experience": [
                {
                    "company": w.company,
                    "role": w.role,
                    "location": w.location,
                    "start_date": w.start_date,
                    "end_date": w.end_date,
                    "responsibilities": w.description.split("\n")
                    if w.description
                    else [],
                }
                for w in user.work_experiences
            ],
            "projects": [
                {
                    "name": p.name,
                    "role": p.role,
                    "date": f"{p.start_date} - {p.end_date}" if p.start_date else "",
                    "tech_stack": p.tech_stack,
                    "details": p.details.split("\n") if p.details else [],
                }
                for p in user.projects
            ],
            "education": [
                {
                    "institution": e.institution,
                    "degree": e.degree,
                    "graduation_date": e.graduation_date or e.end_date,
                    "description": e.description.split("\n") if e.description else [],
                }
                for e in user.educations
            ],
            "languages": [
                {"name": language.name, "level": language.proficiency}
                for language in user.languages
            ],
            "skills": {
                "technical": [
                    s.name for s in user.skills_list if s.category == "technical"
                ],
                "soft": [s.name for s in user.skills_list if s.category == "soft"],
            },
        }

        # 2. Call LLM to Tailor Content
        if not llm_service.groq_client:
            raise ValueError("Groq client not initialized")

        effective_job_description = job_description
        if critique:
            effective_job_description += (
                "\n\nCRITIQUE / FEEDBACK TO ADDRESS:\n"
                + "\n".join(f"- {c}" for c in critique)
            )

        prompt = prompt_manager.format_prompt(
            "resume.tailoring",
            job_description=effective_job_description,
            resume_json=json.dumps(resume_data),
        )

        system_content = prompt_manager.get("resume.tailoring_system")

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": system_content,
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            tailored_data = json.loads(completion.choices[0].message.content)
            logger.info("✅ Tailored resume data generated successfully with Groq")

            # Basic structure check only - allow fields to be missing/null as Typst template now handles defaults
            if "skills" not in tailored_data:
                tailored_data["skills"] = {"technical": [], "soft": []}
            else:
                # Ensure sub-dictionaries exist to prevent 'NoneType' errors if 'skills' key exists but value is null/incomplete
                if not tailored_data["skills"]:
                    tailored_data["skills"] = {"technical": [], "soft": []}
                else:
                    tailored_data["skills"].setdefault("technical", [])
                    tailored_data["skills"].setdefault("soft", [])

        except Exception as e:
            raise e

        # 3. Compile PDF
        logger.info("📝 Compiling PDF with Typst...")
        try:
            return self._compile_pdf(tailored_data)
        except Exception as e:
            logger.error(f"❌ Typst Compilation Error: {e}")
            # Dump data for debugging
            logger.error(f"Data causing error: {json.dumps(tailored_data, indent=2)}")
            raise e

    async def generate_cover_letter(
        self,
        db: Session,
        user_id: int,
        job_description: str,
    ) -> bytes:
        """
        Generates a custom French cover letter using a custom template.
        Company information is extracted from the job description by the LLM.

        Args:
            db: Database session
            user_id: User ID
            job_description: Job description to tailor the cover letter to

        Returns:
            PDF bytes of the generated cover letter
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if not llm_service.groq_client:
            raise ValueError("Groq client not initialized")

        # Prepare user context for LLM
        user_context = {
            "name": user.first_name,
            "email": user.email,
            "phone": user.phone,
            "work_experience": [
                {
                    "company": w.company,
                    "role": w.role,
                    "duration": f"{w.start_date} - {w.end_date}",
                    "description": w.description,
                }
                for w in user.work_experiences[:3]  # Top 3 experiences
            ],
            "skills": {
                "technical": [
                    s.name for s in user.skills_list if s.category == "technical"
                ][:8],
                "soft": [s.name for s in user.skills_list if s.category == "soft"][:5],
            },
            "education": [
                {
                    "institution": e.institution,
                    "degree": e.degree,
                }
                for e in user.educations[:2]  # Top 2 education entries
            ],
            "projects": [
                {
                    "name": p.name,
                    "tech_stack": p.tech_stack,
                    "details": p.details,
                }
                for p in user.projects[:2]  # Top 2 projects
            ],
        }

        # Generate cover letter content using LLM
        prompt = prompt_manager.format_prompt(
            "cover_letter.generation",
            job_description=job_description,
            user_context=json.dumps(user_context, indent=2, ensure_ascii=False),
        )

        system = prompt_manager.format_prompt("cover_letter.system")

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": system,
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            cover_letter_content = json.loads(completion.choices[0].message.content)
            logger.info("Cover letter content generated successfully with Groq")
        except Exception as e:
            logger.error(f"Error generating cover letter: {e}")
            # Fallback to a basic template
            cover_letter_content = {
                "greeting": "Madame, Monsieur,",
                "body": """Je me permets de vous adresser ma candidature pour le poste proposé au sein de votre entreprise. Votre offre a particulièrement retenu mon attention car elle correspond parfaitement à mon profil et à mes aspirations professionnelles.

Fort de mon expérience et de mes compétences techniques, je suis convaincu de pouvoir contribuer efficacement à vos projets et objectifs. Mon parcours professionnel m'a permis de développer une expertise solide et une capacité d'adaptation que je souhaite mettre au service de votre entreprise.

Je reste à votre disposition pour un entretien afin de vous présenter plus en détail ma motivation et mes compétences.""",
                "closing": "Cordialement,",
            }

        user_details_parts = [f"{user.first_name} {user.last_name}"]
        if user.phone:
            user_details_parts.append(user.phone)
        if user.email:
            user_details_parts.append(user.email)

        from_details = "\n".join(user_details_parts)

        cover_letter_data = {
            "from_details": from_details,
            "greeting": cover_letter_content.get("greeting", "Madame, Monsieur,"),
            "body": cover_letter_content.get("body", ""),
            "closing": cover_letter_content.get("closing", "Cordialement,"),
        }

        # Compile PDF
        logger.info("Compiling cover letter PDF with Typst...")
        try:
            return self._compile_cover_letter_pdf(cover_letter_data)
        except Exception as e:
            logger.error(f"Typst Compilation Error: {e}")
            logger.error(
                f"Data causing error: {json.dumps(cover_letter_data, indent=2)}"
            )
            raise e

    async def upload_resume(
        self,
        file: UploadFile,
        db: Session,
        user: User,
    ):
        """
        Upload a resume (PDF), parse it, and create a candidate profile.
        """
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        try:
            # Read file content
            file_content = await file.read()

            # Parse resume using existing service
            file_stream = io.BytesIO(file_content)

            raw_text = self.extract_text_from_stream(file_stream)
            if not raw_text:
                raise HTTPException(
                    status_code=400, detail="Could not extract text from PDF"
                )

            parsed_data = await self.extract_data_with_llm(raw_text)

            if "error" in parsed_data:
                raise HTTPException(status_code=500, detail=parsed_data["error"])

            # Sync Resume global fields
            resume_entry = db.query(Resume).filter(Resume.user_id == user.id).first()
            if not resume_entry:
                resume_entry = Resume(user_id=user.id)
                db.add(resume_entry)

            resume_entry.summary = parsed_data.get("summary")
            contact = parsed_data.get("contact_info", {})
            # Try to extract website/linkedin if parser found them (often parser puts them in contact_info)
            if "website" in contact:
                resume_entry.website = contact["website"]
            if "linkedin" in contact:
                resume_entry.linkedin = contact["linkedin"]

            # Populate Work Experience
            for exp in parsed_data.get("work_experience", []):
                db.add(
                    WorkExperience(
                        user_id=user.id,
                        company=exp.get("company", "Unknown Company"),
                        role=exp.get("role", "Unknown Role"),
                        location=exp.get("location"),
                        start_date=exp.get("start_date"),
                        end_date=exp.get("end_date"),
                        description=exp.get("description", ""),
                    )
                )

            # Populate Education
            for edu in parsed_data.get("education", []):
                db.add(
                    Education(
                        user_id=user.id,
                        institution=edu.get("institution", "Unknown Institution"),
                        degree=edu.get("degree", "Unknown Degree"),
                        field_of_study=edu.get("field_of_study"),
                        start_date=edu.get("start_date"),
                        end_date=edu.get("end_date"),
                        graduation_date=edu.get("graduation_date"),
                        description=edu.get("description", ""),
                    )
                )

            # Populate Projects
            for proj in parsed_data.get("projects", []):
                db.add(
                    Project(
                        user_id=user.id,
                        name=proj.get("name", "Unknown Project"),
                        role=proj.get("role"),
                        start_date=proj.get("start_date"),
                        end_date=proj.get("end_date"),
                        tech_stack=proj.get("tech_stack"),
                        details=proj.get("details", ""),
                    )
                )

            # Populate Languages
            for lang in parsed_data.get("languages", []):
                db.add(
                    Language(
                        user_id=user.id,
                        name=lang.get("name", "Unknown Language"),
                        proficiency=lang.get("proficiency"),
                    )
                )

            # Populate Skills
            skills = parsed_data.get("skills", {})
            for s in skills.get("technical", []):
                db.add(Skill(user_id=user.id, name=s, category="technical"))
            for s in skills.get("soft", []):
                db.add(Skill(user_id=user.id, name=s, category="soft"))

            user.raw_resume_text = raw_text

            db.add(user)
            db.commit()
            db.refresh(user)

            return {
                "message": "Resume uploaded and parsed successfully",
                "candidate_id": user.id,
                "skills_count": len(user.skills_list),
            }
        except Exception as e:
            logger.error(f"Error in upload_resume service: {e}")
            raise e


# Singleton instance
_resume_service_instance = None


def get_resume_service() -> ResumeParserService:
    global _resume_service_instance
    if _resume_service_instance is None:
        logger.info("🚀 Creating resume_service singleton...")
        _resume_service_instance = ResumeParserService()
        logger.info("✅ resume_service singleton created!")
    return _resume_service_instance


resume_service_instance = get_resume_service()
