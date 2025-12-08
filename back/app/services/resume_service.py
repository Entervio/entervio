import json
import os
import logging
from typing import Dict, Any, List
from app.core.config import settings
import pdfplumber
import spacy
import google.generativeai as genai
import typst
import tempfile
from pathlib import Path
from app.services.llm_service import llm_service

from sqlalchemy.orm import Session
from app.models.user import User
from app.models.resume_models import WorkExperience, Education, Project, Language, Skill

api_key = settings.GEMINI_API_KEY
genai.configure(api_key=api_key)

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

    def extract_data_with_llm(self, raw_text: str) -> Dict[str, Any]:
        model = genai.GenerativeModel(
            'gemini-2.0-flash-lite-preview-02-05',
            generation_config={
                "response_mime_type": "application/json"
            }
        )
        
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
        {raw_text}
        """
        
        try:
            response = model.generate_content(prompt)
            # Sanitize response (remove markdown fences if the model adds them)
            clean_json = response.text.strip().replace("```json", "").replace("```", "")
            return json.loads(clean_json)
        except Exception as e:
            print(f"LLM Error: {e}")
            return {"error": "Failed to parse resume data"}
        
    def get_core_context(self, parsed_data: Dict[str, Any]) -> str:
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
        experience: List[Dict[str, Any]] = parsed_data.get("work_experience", [])
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
                    for resp in responsibilities[:3]: # Limit to top 3 for brevity
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

    def _compile_pdf(self, resume_data: Dict[str, Any]) -> bytes:
        template_path = Path(__file__).parent.parent / "templates" / "resume.typ"
        
        return typst.compile(
            template_path,
            sys_inputs={"resume_data": json.dumps(resume_data, ensure_ascii=False)}
        )

    async def tailor_resume(self, db: Session, user_id: int, job_description: str) -> bytes:
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
                "website": None
            },
            "summary": "Experienced professional.", 
            
            "work_experience": [
                {
                    "company": w.company,
                    "role": w.role,
                    "location": w.location,
                    "start_date": w.start_date,
                    "end_date": w.end_date,
                    "responsibilities": w.description.split('\n') if w.description else []
                } for w in user.work_experiences
            ],
            "projects": [
                {
                    "name": p.name,
                    "role": p.role,
                    "date": f"{p.start_date} - {p.end_date}" if p.start_date else "",
                    "tech_stack": p.tech_stack,
                    "details": p.details.split('\n') if p.details else []
                } for p in user.projects
            ],
            "education": [
                {
                    "institution": e.institution,
                    "degree": e.degree,
                    "graduation_date": e.graduation_date or e.end_date
                } for e in user.educations
            ],
            "languages": [
                {"name": l.name, "level": l.proficiency} for l in user.languages
            ],
            "skills": {
                "technical": [s.name for s in user.skills_list if s.category == 'technical'],
                "soft": [s.name for s in user.skills_list if s.category == 'soft']
            }
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
                    {"role": "system", "content": "You are an expert resume writer that outputs JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            tailored_data = json.loads(completion.choices[0].message.content)
            logger.info("✅ Tailored resume data generated successfully with Groq")
        except Exception as e:
            logger.error(f"Error tailoring resume: {e}")
            logger.error(f"Raw LLM response: {response.text if 'response' in locals() else 'No response'}")
            # Fallback to original if tailoring fails
            tailored_data = resume_data
            
        # 3. Compile PDF
        logger.info("📝 Compiling PDF with Typst...")
        try:
            return self._compile_pdf(tailored_data)
        except Exception as e:
             logger.error(f"❌ Typst Compilation Error: {e}")
             # Dump data for debugging
             logger.error(f"Data causing error: {json.dumps(tailored_data, indent=2)}")
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

# For convenience
resume_service_instance = get_resume_service()