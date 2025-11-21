import io
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.resume_service import resume_service_instance
router = APIRouter()

@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Endpoint to upload a PDF resume and get JSON data back.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF allowed.")

    # 1. Read the file content into memory (bytes)
    file_content = await file.read()
    
    # 2. Convert bytes to a stream object for pdfplumber
    file_stream = io.BytesIO(file_content)
    
    # 3. Extract text
    raw_text = resume_service_instance.extract_text_from_stream(file_stream)
    
    if not raw_text:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be an image scan.")

    # 4. Process with LLM
    parsed_data = resume_service_instance.extract_data_with_llm(raw_text)
    
    return parsed_data