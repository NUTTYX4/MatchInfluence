# MatchInfluence 🚀

MatchInfluence is an enterprise-grade, AI-powered platform for smart influencer-campaign matching. It features a decoupled asynchronous architecture, multi-dimensional semantic vector search, and automated background data ingestion.

## 🧠 Core Architecture

*   **Backend Framework:** FastAPI (Asynchronous)
*   **Relational Database:** PostgreSQL (via asyncpg & SQLAlchemy)
*   **Vector Database:** ChromaDB (Cosine similarity for semantic search)
*   **Frontend UI:** React + TypeScript + Vite + Vanilla CSS (Serene Logic Oatmeal Lavender Design System)
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
*   **Premium Interactive Workspace:** A robust React interface featuring real-time preference filtering, custom avatar upload persistence, and automated brief shaping.

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
UI available at: `http://localhost:3000` (or Vite assigned port)

**Terminal 3 (Optional): Start the Background Crawler**
To begin autonomously hydrating the database with new influencers:

```bash
python scripts/scraper_crawler.py
```

## 🔒 Deployment & Production Guidelines

### 🗺️ The 5-Phase Deployment Roadmap

For a production deployment, the architecture requires a server environment with **Persistent Disk Storage** for the ChromaDB vector embeddings. A standard serverless function will wipe the AI database on restart.

**Recommended Stack:**
* **Frontend:** Vercel (Fast, free automated builds)
* **Backend:** Railway.app or Render (Supports Python, background workers, and persistent volumes)
* **Database:** Managed PostgreSQL (Railway or Supabase)

**Phase 1: Pre-Flight (Completed)**
* CORS configured to accept dynamic origins (`r"https://.*\.vercel\.app"`).
* Frontend API client utilizes `VITE_API_URL` environment variables.

**Phase 2: Version Control**
* Push the repository to GitHub. Both Vercel and Railway will pull directly from here.

**Phase 3: Database & Backend Deployment (Railway)**
1. Provision a managed PostgreSQL instance and copy the `DATABASE_URL`.
2. Connect your GitHub repository and deploy the FastAPI backend.
3. **Crucial:** Attach a Persistent Volume to the `/chroma_data` directory so AI embeddings survive restarts.
4. Populate production environment variables (`LLM_API_KEY`, `GEMINI_API_KEY`, etc.).
5. Run `alembic upgrade head` on the live database.

**Phase 4: Frontend Deployment (Vercel)**
1. Connect GitHub to Vercel and set Root Directory to `frontend-ui`.
2. Add the live backend URL to the Vercel environment variables as `VITE_API_URL`.
3. Deploy and receive your `.vercel.app` domain.

**Phase 5: Background Scraper Deployment**
* Deploy `scraper_crawler.py` as a continuous "Background Worker" service alongside your FastAPI backend so it discovers new creators 24/7.

### ⚙️ Additional Production Considerations


*   **Automated 7-Day Scraper Schedule (Mandatory Post-Deployment Requirement):** To ensure creator metrics (follower volumes, engagement rates, CPE efficiency) remain fresh and to continuously discover new creators that match user briefs across the database, configure a recurring scheduler (Cron, systemd, GitHub Actions, or AWS EventBridge) to execute every 7 days post-deployment:
    ```bash
    python scripts/run_weekly_scraper.py
    ```
    *(Example cron entry: `0 0 * * 0 python /root/MatchInfluence/scripts/run_weekly_scraper.py`)*
*   **Industry-Standard Authentication & Account Recovery:** The authentication engine operates on JWT secure HTTP-only cookies and bcrypt password hashing. It includes a complete multi-step password reset workflow (`POST /auth/forgot-password` and `POST /auth/reset-password`). For immediate developer evaluation, secure verification tokens are auto-populated in the UI. For production deployment, bind your SMTP service or SendGrid client in `app/routers/auth.py` to deliver recovery links via email without altering frontend state logic.
*   **Pre-Seeded Enterprise Testing Account:** Use these verified credentials during deployment verification and evaluation:
    *   **Email:** `nithinvinuthan123@gmail.com`
    *   **Password:** `Nithin@2222`
*   **API Security & Abstraction:** All external AI and data scraper API keys (Gemini, GitHub AI, Apify, YouTube) are strictly managed via backend environment variables. No API keys or sensitive endpoints are exposed to client-side user settings or UI state.
*   **Avatar & Profile Persistence (Zero Cloud Storage Required):** User profile pictures (PFPs) uploaded in Settings are processed and persisted as base64 Data URLs inside PostgreSQL (`avatar_url` TEXT column), guaranteeing instant avatar rendering without requiring external AWS S3 buckets or CDN storage.
*   **Strict Identity Validation:** Both frontend and backend reject simple username strings or malformed inputs, mandating complete domain emails (e.g., `@gmail.com`, `@agency.tld`) across login, registration, and recovery flows.
