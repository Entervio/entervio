# Entervio

A practical, developer-friendly README for the Entervio interview practice platform.

Entervio provides voice and text interview practice, automatic AI feedback, and configurable interviewer personas.

![Setup screenshot](assets/screenshots/setup.png)

## Features

- Voice (STT) and TTS interviewer prompts
- Configurable interviewer personas (friendly / professional / strict)
- Automatic grading and written feedback
- Optional CV upload and resume parsing

## Quick start

Prerequisites: Python 3.11+, Node.js 18+, Docker (optional)

Backend

```bash
cd back
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with your API keys and DB settings
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend

```bash
cd front
npm install
npm run dev
```

Full stack (Docker Compose)

```bash
docker compose -f compose.yml up --build
```


## Project layout

```
entervio/
├─ back/        # FastAPI backend
├─ front/       # Vite + React frontend
├─ compose.yml
└─ README.md
```

## Configuration

Copy `.env.example` to `.env` and fill provider keys (OpenAI, ElevenLabs, DB URL, optional S3). Keep secrets out of version control.

## Tests

```bash
cd back
pytest -q
```