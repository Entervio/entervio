from sqlalchemy import Column, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from app.db import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Store structured skills and experience
    skills = Column(JSON, nullable=True)
    experience = Column(JSON, nullable=True)
    
    # Store raw and full parsed data for reference
    raw_resume_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)
    
    # Relationship to interviews
    interviews = relationship("Interview", back_populates="candidate")
