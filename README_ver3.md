# MatchInfluence V3 🚀

MatchInfluence is an enterprise-grade, AI-powered platform for smart influencer-campaign matching. Version 3 introduces a decoupled asynchronous architecture, multi-dimensional semantic vector search, and automated background data ingestion.

## 🧠 Core Architecture

*   **Backend Framework:** FastAPI (Asynchronous)
*   **Relational Database:** PostgreSQL (via asyncpg & SQLAlchemy)
*   **Vector Database:** ChromaDB (Cosine similarity for semantic search)
*   **Frontend UI:** React + TypeScript + Vite + Tailwind CSS
*   **Migrations:** Alembic

### AI Engines:

*   **Data Ingestion/Crawling:** Google Gemini (gemini-3.1-flash-lite) via native API
*   **Match Rationale/Scoring:** GitHub Models (gpt-4o-mini)
*   **Vector Embeddings:** HuggingFace (all-MiniLM-L6-v2)

### Data Scrapers:
*   Apify (instagram-profile-scraper) & YouTube Data API v3

## ✨ Key Features

*   **Semantic Proximity Search:** Moves beyond static keyword tags. Campaigns are matched using 384-dimensional vector embeddings, allowing natural language briefs to find contextually relevant creators.
*   **Dual-Model AI Pipeline:**
    *   A lightweight, continuous background crawler uses Google AI Studio to fetch and sanitize new creators.
    *   A heavy-duty reasoning engine uses GitHub Models to generate natural-language rationale explaining why a specific creator fits a campaign.
*   **Mathematical Authenticity Scoring:** Calculates a composite fit score combining vector distance with strict engagement rate (ER), comment-like ratio (CLR), and follower-following ratio (FFR) metrics to penalize bot-heavy accounts.
*   **Live Demo Mode Frontend:** A robust React interface that dynamically visualizes campaign strategy vectors, budget metrics, and matched influencer matrices.

## 🛠️ Setup & Installation

### 1. Environment Initialization

Clone the repository and set up your virtual environment:

```bash
# Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# Mac/Linux
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables (.env)

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence
CHROMA_DB_PATH=./chroma_data
DATA_REFRESH_INTERVAL_DAYS=7

# FastAPI Match Engine (Handles Matching Rationale)
LLM_BASE_URL=https://models.github.ai/inference
LLM_API_KEY=github_pat_YOUR_TOKEN
LLM_MODEL_NAME=gpt-4o-mini

# Background Ingestion Engine
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.1-flash-lite

# External Scrapers
YOUTUBE_API_KEY=your_youtube_key
APIFY_TOKEN=your_apify_token
APIFY_INSTAGRAM_URL=https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items
```

### 3. Database Migrations

Initialize the PostgreSQL schema:

```bash
alembic upgrade head
```

## 🚀 Running the Platform

You need to run the backend and frontend simultaneously.

**Terminal 1: Start the FastAPI Backend**

```bash
uvicorn app.main:app --reload
```
API Docs available at: `http://127.0.0.1:8000/docs`

**Terminal 2: Start the React Frontend**

```bash
cd frontend-ui
npm install
npm run dev
```
UI available at: `http://localhost:3000`

**Terminal 3 (Optional): Start the Background Crawler**
To begin autonomously hydrating the database with new influencers:

```bash
python scraper_crawler.py
```