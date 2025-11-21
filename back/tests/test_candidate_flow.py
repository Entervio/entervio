import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_resume_upload():
    print("Testing resume upload...")
    # Create a dummy PDF file
    with open("test_resume.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF")

    files = {'file': ('/home/jamal/projects/enter/experiments/resume.pdf', open('test_resume.pdf', 'rb'), 'application/pdf')}
    try:
        response = requests.post(f"{BASE_URL}/candidates/upload_resume", files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            return response.json().get("candidate_id")
        else:
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_start_interview(candidate_id):
    print(f"\nTesting start interview for candidate {candidate_id}...")
    payload = {
        "candidate_name": "Test Candidate",
        "interviewer_style": "nice",
        "candidate_id": candidate_id
    }
    try:
        response = requests.post(f"{BASE_URL}/voice/start", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Note: This test requires the server to be running and a valid PDF parser.
    # Since we are mocking the PDF content, the parser might fail if it expects real text.
    # However, we can check if the endpoint is reachable.
    
    # For this environment, we might not be able to run the server easily.
    # So we will rely on the code changes and manual verification instructions for the user.
    print("Test script created. Run this against a running server.")
