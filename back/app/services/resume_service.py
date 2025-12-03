from asyncio.log import logger
import json
import os
from typing import Dict, Any, List
from app.core.config import settings
import pdfplumber
import spacy
import google.generativeai as genai

api_key = settings.GEMINI_API_KEY
genai.configure(api_key=api_key)


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
            "start_date": "string (YYYY-MM)",
            "end_date": "string (YYYY-MM or 'Present')",
            "responsibilities": ["string", "string"]
            }}
        ],
        "education": [
            {{
            "institution": "string",
            "degree": "string",
            "graduation_date": "string"
            }}
        ],
        "skills": {{
            "technical": ["string"],
            "soft": ["string"]
        }},
        "search_keywords": [
            {{
                "keywords": "string (single strong keyword)",
                "type": "skill|role|tool"
            }}
        ]
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