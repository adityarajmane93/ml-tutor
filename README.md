# ML-Tutor

Experimental Intelligent Tutoring System Platform for Educational Technology Research

---

# Overview

ML-Tutor is a research-oriented intelligent tutoring platform being developed as part of doctoral work in Educational Technology.

The system is designed to support:

* learner interaction telemetry,
* adaptive scaffolding,
* behavioral trace analysis,
* self-regulated learning research,
* affect-aware interventions,
* concept mapping workflows,
* and future AI-assisted tutoring experiments.

The current implementation focuses on building the foundational experimental infrastructure required for:

* collecting structured learner interaction data,
* replaying learner sessions,
* analyzing temporal learning behaviors,
* and supporting future adaptive tutoring systems.

This repository intentionally prioritizes:

* instrumentation,
* data architecture,
* reproducibility,
* and extensibility

before advanced AI functionality.

---

# Current System Architecture

```text
Frontend (React + TypeScript)
        ↓
Telemetry Logger
        ↓
FastAPI Backend
        ↓
SQLite Database
        ↓
Structured Event Storage
```

---

# Current Features

## Frontend

* React + Vite frontend
* TypeScript support
* Reusable tracked UI components
* Session-aware telemetry logging
* Zustand-based session state management

## Backend

* FastAPI REST API
* Structured event ingestion
* SQLite persistence layer
* SQLAlchemy ORM integration
* CORS-enabled frontend communication

## Telemetry Infrastructure

* Event schema standardization
* Persistent interaction logging
* Session-level trace grouping
* Queryable event retrieval
* Timestamped behavioral traces

---

# Educational Research Motivation

A major challenge in intelligent tutoring systems research is the lack of rich, structured learner interaction traces.

Many tutoring systems focus primarily on:

* adaptive logic,
* LLM integration,
* or interface complexity

without establishing robust behavioral instrumentation.

ML-Tutor is designed with the assumption that:

> high-quality educational adaptation requires high-quality learner telemetry.

The current telemetry architecture is intended to support future analysis of:

* learner hesitation,
* help-seeking behavior,
* scaffold usage,
* interaction timing,
* concept revision patterns,
* navigation behaviors,
* and self-regulated learning indicators.

---

# Repository Structure

```text
ml-tutor/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── store/
│   │   └── App.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── venv/
│
└── README.md
```

---

# Technology Stack

## Frontend

| Technology | Purpose                  |
| ---------- | ------------------------ |
| React      | User Interface           |
| TypeScript | Type Safety              |
| Vite       | Frontend Tooling         |
| Zustand    | Session State Management |
| Axios      | HTTP Communication       |

## Backend

| Technology | Purpose               |
| ---------- | --------------------- |
| FastAPI    | Backend API Framework |
| SQLAlchemy | ORM Layer             |
| SQLite     | Persistent Storage    |
| Pydantic   | Data Validation       |
| Uvicorn    | ASGI Server           |

---

# Event Schema

The telemetry system uses a structured event schema.

## Event Structure

```json
{
  "event_id": "uuid",
  "session_id": "uuid",
  "timestamp": "ISO timestamp",
  "event_type": "UI_EVENT",
  "action": "BUTTON_CLICK",
  "source": "frontend",
  "schema_version": "1.0",
  "metadata": {}
}
```

---

# Why Telemetry Was Built First

The telemetry system was intentionally implemented before:

* adaptive tutoring,
* affect detection,
* LLM integration,
* or advanced UI systems.

This decision was made because telemetry serves as:

* the primary research instrumentation layer,
* the behavioral data collection pipeline,
* the debugging infrastructure,
* and the foundation for future learner analytics.

Without reliable instrumentation, future adaptive systems would lack:

* reproducible behavioral evidence,
* analyzable interaction traces,
* and experimentally useful learner data.

---

# Setup Instructions

## 1. Clone Repository

```bash
git clone <repository-url>
cd ml-tutor
```

---

# Frontend Setup

## Install Dependencies

```bash
cd frontend
npm install
```

## Run Frontend

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

# Backend Setup

## Create Virtual Environment

```bash
cd backend
python -m venv venv
```

## Activate Virtual Environment

### Linux/macOS

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

## Install Dependencies

```bash
pip install -r requirements.txt
```
## Get the Connection Pooler URL from your Supabase dashboard.

- It would be in the following format :
  ```
  postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  ```
- Paste it in the following file
        ```
        ml-tutor/backend/app/.env
        ```

## Run Backend

```bash
uvicorn app.main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

---

# Testing Telemetry

1. Open frontend.
2. Click the interaction button.
3. Verify backend receives POST requests.
4. Open:

```text
http://127.0.0.1:8000/events
```

5. Confirm events are stored and retrievable.

---

# Current Research Status

## Completed

* Full-stack project initialization
* Persistent telemetry pipeline
* Session-aware event logging
* SQLite persistence layer
* Structured event schema
* Reusable tracked UI components
* Git repository initialization
* Deployment-oriented project structure

## Planned

* React Flow concept mapping interface
* Session replay system
* Scaffold triggering engine
* Learning analytics dashboard
* LLM-assisted tutoring workflows
* Adaptive intervention mechanisms
* Affect-aware tutoring components
* Experimental study instrumentation

---

# Deployment Strategy

## Planned Hosting Stack

| Layer    | Platform          |
| -------- | ----------------- |
| Frontend | Vercel            |
| Backend  | Railway or Render |
| Database | PostgreSQL        |

The current SQLite implementation is intended for local MVP experimentation and early-stage prototyping.

Future deployment will migrate persistence to PostgreSQL.

---

# Research Direction

ML-Tutor is influenced by prior work in:

* Intelligent Tutoring Systems (ITS)
* Self-Regulated Learning (SRL)
* Learning Analytics
* Adaptive Scaffolding
* Teachable Agents
* Metacognitive Support Systems

Relevant systems and conceptual inspirations include:

* MetaTutor
* Betty’s Brain
* AutoTutor
* Concept Mapping Environments
* Trace-based Learning Analytics Systems

---

# Development Philosophy

The project follows several guiding principles:

## 1. Instrumentation Before Intelligence

Reliable telemetry is prioritized before advanced AI behavior.

## 2. Research Utility Over UI Polish

The platform is optimized for experimental flexibility rather than aesthetic completeness.

## 3. Incremental Architecture

The system is developed through small irreversible infrastructure layers.

## 4. Extensibility

All major systems are designed to support future adaptive tutoring experiments.

---

# Author

Aditya Rajmane

Doctoral Researcher in Educational Technology

Indian Institute of Technology Bombay

---

# License

This repository is currently intended for academic and research use.
