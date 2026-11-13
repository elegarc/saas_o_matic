# SaaS-O-Matic

Dynamic multi-currency SaaS billing & subscription optimizer for corporate sales teams.

---

## Backend (FastAPI + SQLite)

### Prerequisites
* **Python 3.11+** (recommended **3.12**) with `pip`
* SQLite is bundled with Python's standard library (no separate database server required)

### 1. Create and Activate the Virtual Environment (`venv`)
```powershell
cd backend
python -m venv .venv
```

Activate the virtual environment:
* **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
* **Linux / macOS:**
  ```bash
  source .venv/bin/activate
  ```

### 2. Install Dependencies
* **Runtime + dev/test dependencies:**
  ```powershell
  pip install -r requirements-dev.txt
  ```
* *(Or runtime only: `pip install -r requirements.txt`)*

### 3. Configuration (Optional)
The backend works out of the box with default settings and initializes `backend/data/saas_o_matic.db` automatically on startup. To customize paths or CORS origins, copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

### 4. Run the API Server Locally
From `backend/` (with `.venv` activated):
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
* Interactive OpenAPI / Swagger UI: `http://localhost:8000/docs`
* Health check: `http://localhost:8000/api/v1/health`

### 5. Run Tests & Linter
From `backend/` (with `.venv` activated):
```powershell
pytest -v
ruff check .
```
