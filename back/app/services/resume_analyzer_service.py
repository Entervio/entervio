import json
import logging
import re
from typing import Any

from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class ResumeAnalyzerService:
    async def analyze_job_match(
        self, resume_text: str, job_description: str
    ) -> dict[str, Any]:
        """
        Analyzes the match between a resume and a job description.
        Returns a score, missing keywords, and detailed analysis.
        """
        # 1. Analyze with LLM (Keywords + Critique)
        llm_analysis = await self._analyze_with_llm(resume_text, job_description)
        jd_keywords = llm_analysis.get("keywords", [])
        strategic_critique = llm_analysis.get("critique", [])

        # 2. Key Term Extraction (Fuzzy Match)
        found_keywords = []
        missing_keywords = []

        resume_lower = resume_text.lower()

        for kw in jd_keywords:
            if kw.lower() in resume_lower:
                found_keywords.append(kw)
            else:
                missing_keywords.append(kw)

        # 3. Calculate Keyword Score
        if not jd_keywords:
            keyword_score = 0
        else:
            keyword_score = (len(found_keywords) / len(jd_keywords)) * 100

        # 4. ATS Compliance Check
        ats_check = self.check_ats_compliance(resume_text)

        return {
            "match_score": round(keyword_score, 1),
            "total_keywords": len(jd_keywords),
            "found_keywords": found_keywords,
            "missing_keywords": missing_keywords,
            "ats_check": ats_check,
            "strategic_critique": strategic_critique,
        }

    async def _analyze_with_llm(
        self, resume_text: str, job_description: str
    ) -> dict[str, Any]:
        """
        Uses LLM to extract keywords AND provide strategic critique.
        """
        try:
            if not llm_service.groq_client:
                raise ValueError("Groq client not initialized")

            prompt = f"""
            Role: Expert Senior Recruiter & Career Coach.
            task: Analyze the Candidate's Resume against the Job Description.

            1. KEYWORDS: Extract top 15 Hard Skills/Tools/Methodologies from the JD.
            2. STRATEGIC CRITIQUE: Provide 3 specific, high-level improvements for the candidate.
               - Focus on "Quality of Experience", "Impact", "Seniority Alignment", or "Tone".
               - NOT just "add keyword X" (that is handled by the keywords section).
               - Critique Examples: "Resume emphasizes execution but role requires strategy", "Lacks metrics for the claimed 'Site Reliability' work".

            JOB DESCRIPTION:
            {job_description[:3000]}

            CANDIDATE RESUME:
            {resume_text[:3000]}

            Return JSON:
            {{
                "keywords": ["Python", "AWS", ...],
                "critique": ["Critique 1", "Critique 2", "Critique 3"]
            }}
            """

            completion = llm_service.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert recruiter that outputs JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )

            data = json.loads(completion.choices[0].message.content)
            return data

        except Exception as e:
            logger.error(f"Error in LLM analysis: {e}")
            return {
                "keywords": [],
                "critique": ["Could not generate critique due to error."],
            }

    def check_ats_compliance(self, resume_text: str) -> dict[str, Any]:
        """
        Checks for standard ATS compatibility issues.
        """
        issues = []
        recommendations = []
        parsed_sections = []

        # 1. Section Headers Check
        required_sections = {
            "Contact": [r"(contact|email|phone|address|linkedin)"],
            "Experience": [
                r"(experience|employment|work history|professional history)"
            ],
            "Education": [r"(education|academic|university|degree)"],
            "Skills": [r"(skills|technologies|technical stack|competencies)"],
        }

        resume_lower = resume_text.lower()

        for section, patterns in required_sections.items():
            found = False
            for pattern in patterns:
                if re.search(pattern, resume_lower):
                    found = True
                    break

            if found:
                parsed_sections.append(section)
            else:
                issues.append(f"Missing section: {section}")
                recommendations.append(
                    f"Add a clear '{section}' section to help ATS parsers identify your qualifications."
                )

        # 2. Text Length Check
        word_count = len(resume_text.split())
        if word_count < 200:
            issues.append("Resume too short")
            recommendations.append(
                "Your resume seems very short (< 200 words). Add more detail to your experience."
            )
        elif word_count > 2000:
            issues.append("Resume too long")
            recommendations.append(
                "Your resume is quite long (> 2000 words). Consider shortening it to keep recruiters' attention."
            )

        # 3. Special Character Check (Basic)
        # If text extraction failed or yielded garbage, we might see high ratio of non-ascii or weird symbols.
        # Skipped for now as we deal with Clean Text from our PDF parser.

        score = 100 - (len(issues) * 10)
        score = max(0, score)

        return {
            "ats_score": score,
            "issues": issues,
            "recommendations": recommendations,
            "detected_sections": parsed_sections,
        }


# Singleton
resume_analyzer = ResumeAnalyzerService()
