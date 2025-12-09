import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber
import spacy
import typst
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.resume_models import Education, Language, Project, Skill, WorkExperience
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

        prompt = f"""
        You are a strict Resume Parsing API.
        Extract data from the resume text below and return ONLY a valid JSON object.
        Do not add Markdown formatting (```json) or explanations.

        Structure required:
        {{
        "contact_info": {{
            "name": "string",
            "email": "string",
            "phone": "string",
            "linkedin": "string (nullable)",
            "website": "string (nullable)"
        }},
        "summary": "string (2-3 sentences)",
        "work_experience": [
            {{
            "company": "string",
            "role": "string",
            "location": "string (nullable)",
            "start_date": "string (YYYY-MM)",
            "end_date": "string (YYYY-MM or 'Present')",
            "description": "string (full text with bullet points as newlines or markdown)"
            }}
        ],
        "education": [
            {{
            "institution": "string",
            "degree": "string",
            "field_of_study": "string (nullable)",
            "start_date": "string (nullable)",
            "end_date": "string (nullable)",
            "graduation_date": "string (nullable)"
            }}
        ],
        "projects": [
            {{
            "name": "string",
            "role": "string",
            "start_date": "string",
            "end_date": "string",
            "tech_stack": "string",
            "details": "string (description)"
            }}
        ],
        "languages": [
            {{
            "name": "string",
            "proficiency": "string"
            }}
        ],
        "skills": {{
            "technical": ["string"],
            "soft": ["string"]
        }}
        }}

        RESUME TEXT:
        {raw_text[:25000]}
        """

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a resume parser that outputs JSON.",
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
        self, db: Session, user_id: int, job_description: str
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
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "linkedin": None,
                "website": None,
            },
            "summary": "Experienced professional.",
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
                }
                for e in user.educations
            ],
            "languages": [
                {"name": lang.name, "level": lang.proficiency}
                for lang in user.languages
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

        prompt = f"""
        Role: Expert Resume Writer.
        Task: Tailor the following resume JSON for this Job Description.

        Goal:
        - Rewrite the 'summary' to highlight relevant experience.
        - Rewrite 'responsibilities' in 'work_experience' to emphasize JD keywords.
        - Select relevant 'projects' and highlight their relevance.
        - KEEP data factual (do not invent jobs).
        - RETURN the FULL JSON structure tailored.
        - Do not add fake experience.
        - the resume must be in the same language as the job description.
        JOB DESCRIPTION:
        {job_description}

        RESUME JSON:
        {json.dumps(resume_data)}
        """

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert resume writer that outputs JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            tailored_data = json.loads(completion.choices[0].message.content)
            logger.info("✅ Tailored resume data generated successfully with Groq")
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
        Generates a custom French cover letter using the Fireside template.
        All information (company name, recipient, etc.) is extracted from the job description by the LLM.

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
            "name": user.name,
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
        prompt = f"""
        Rôle: Expert en rédaction de lettres de motivation professionnelles en français.

        Tâche: Rédiger une lettre de motivation convaincante et personnalisée en français pour cette offre d'emploi.

        Contexte du candidat:
        {json.dumps(user_context, indent=2, ensure_ascii=False)}

        Description du poste:
        {job_description}

        Instructions:
        - Analyser la description du poste pour extraire: le nom de l'entreprise, le nom du destinataire (si mentionné), et l'adresse de l'entreprise (si mentionnée)
        - Rédiger une lettre de motivation professionnelle en français (3-4 paragraphes)
        - Mettre en avant les compétences et expériences pertinentes du candidat
        - Adapter le ton et le vocabulaire à l'offre d'emploi
        - Montrer l'intérêt et la motivation du candidat pour le poste
        - Utiliser des exemples concrets tirés de l'expérience du candidat
        - Rester factuel et ne pas inventer d'informations
        - NE PAS inclure de formule d'appel (ex: "Madame, Monsieur,") ni de signature (ex: "Cordialement,")
        - Retourner UNIQUEMENT le corps de la lettre (les paragraphes du milieu)

        Structure attendue (3-4 paragraphes):
        1. Introduction: Poste visé et motivation initiale
        2. Expériences et compétences pertinentes avec exemples concrets
        3. Ce que le candidat peut apporter à l'entreprise
        4. Conclusion et disponibilité

        Retournez UNIQUEMENT un objet JSON avec cette structure:
        {{
            "company_name": "Nom de l'entreprise extrait de la description (ou 'Votre entreprise' si non trouvé)",
            "recipient_name": "Nom du destinataire (ou 'Madame, Monsieur' si non trouvé)",
            "recipient_title": "Titre du destinataire (ou '' si non trouvé)",
            "company_address": "Adresse complète de l'entreprise (ou '' si non trouvée)",
            "body": "Le texte complet de la lettre (sans formule d'appel ni signature)"
        }}
        """

        try:
            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un expert en rédaction de lettres de motivation professionnelles en français. Tu réponds uniquement en JSON.",
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
                "company_name": "Votre entreprise",
                "recipient_name": "Madame, Monsieur",
                "recipient_title": "",
                "company_address": "",
                "body": """Je me permets de vous adresser ma candidature pour le poste proposé.

Fort de mon expérience et de mes compétences techniques, je suis convaincu de pouvoir contribuer efficacement à vos projets et objectifs.

Mon parcours professionnel m'a permis de développer une expertise solide et une capacité d'adaptation que je souhaite mettre au service de votre entreprise.

Je reste à votre disposition pour un entretien afin de vous présenter plus en détail ma motivation et mes compétences.""",
            }

        # Prepare data for Typst template
        current_date = datetime.now().strftime("%d/%m/%Y")

        # Format user address
        user_address_parts = []
        if user.phone:
            user_address_parts.append(user.phone)
        if user.email:
            user_address_parts.append(user.email)

        user_address = (
            " \\\n".join(user_address_parts) if user_address_parts else user.email or ""
        )

        # Format recipient details
        recipient_parts = []
        if cover_letter_content.get("recipient_title"):
            recipient_parts.append(cover_letter_content["recipient_title"])
        recipient_parts.append(
            cover_letter_content.get("recipient_name", "Madame, Monsieur")
        )
        recipient_parts.append(cover_letter_content.get("company_name", ""))
        if cover_letter_content.get("company_address"):
            # Split address by newlines if it contains any
            recipient_parts.extend(cover_letter_content["company_address"].split("\n"))

        recipient_details = " \\\n".join([p for p in recipient_parts if p])

        # Determine greeting
        recipient_name = cover_letter_content.get("recipient_name", "Madame, Monsieur")
        if recipient_name == "Madame, Monsieur" or not recipient_name:
            greeting = "Madame, Monsieur,"
        else:
            greeting = f"{recipient_name},"

        cover_letter_data = {
            "title": user.name,
            "from_details": user_address,
            "to_details": recipient_details,
            "date": current_date,
            "greeting": greeting,
            "body": cover_letter_content["body"],
            "closing": "Cordialement,",
            "signature": user.name,
        }

        # Compile PDF
        logger.info("📝 Compiling cover letter PDF with Typst...")
        try:
            return self._compile_cover_letter_pdf(cover_letter_data)
        except Exception as e:
            logger.error(f"❌ Typst Compilation Error: {e}")
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
            # Update user contact info if extracted
            contact = parsed_data.get("contact_info", {})
            if contact.get("phone"):
                user.phone = contact.get("phone")
            if contact.get("email"):
                user.email = contact.get("email")
            if contact.get("name"):
                user.name = contact.get("name")

            db.add(user)
            db.commit()
            db.refresh(user)

            return {
                "message": "Resume uploaded and parsed successfully",
                "candidate_id": user.id,
                "name": user.name,
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
