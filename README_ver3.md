# MatchInfluence V3

MatchInfluence is an AI-powered platform for smart influencer-campaign matching. Version 3 introduces an asynchronous, high-performance architecture, robust database management, and AI-driven matching services.

## 🚀 Architecture Overview

- **Framework:** FastAPI (Asynchronous)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy (Async)
- **Migrations:** Alembic
- **AI Integration:** LLM-driven matching services

---

## 🛠 Prerequisites

Ensure the following tools are installed:

- Python 3.10+
- PostgreSQL
- `pip`
- `venv`

---

## ⚙️ Setup Instructions

### 1. Environment Initialization

Clone the repository and set up your virtual environment:

```powershell
# Create and activate environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

---

### 2. Database Configuration

Create a `.env` file in the root directory based on the `.env.example` template:

```ini
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence_test
OPENROUTER_API_KEY=your_key_here
```

---

### 3. Database Migrations

We use Alembic to manage schema evolution.

```powershell
# Initialize Alembic (if missing)
alembic init alembic

# Generate the migration script from current models
alembic revision --autogenerate -m "Initial V3 schema"

# Apply the migration to the database
alembic upgrade head
```

---

### 4. Data Seeding

Populate the database with initial records to begin testing:

```powershell
python seed_db.py
```

---

## 📂 Project Structure

```text
/app
 ├── Core business logic
 └── FastAPI routes

/app/models
 ├── SQLAlchemy model definitions
 ├── influencer.py
 └── campaign.py

/alembic
 ├── Migration scripts
 ├── Version history
 └── env.py (Async configured)

/app/services
 ├── AI services
 └── Matching engine components
```

---

## 💡 Development Workflow (The Golden Rule)

Whenever you modify your database models, follow this migration cycle to ensure synchronization:

### 1. Modify

Update your SQLAlchemy classes:

```text
app/models/
```

### 2. Generate

Create a new Alembic migration:

```powershell
alembic revision --autogenerate -m "Description of change"
```

### 3. Apply

Sync the database:

```powershell
alembic upgrade head
```

---

## 🚀 Version

**MatchInfluence V3**

Optimized for scale, performance, and developer efficiency.