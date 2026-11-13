# SaaS-O-Matic

Dynamic multi-currency SaaS billing & subscription optimizer for corporate sales teams.

---

## System Architecture Overview

### How Everything Works Together

SaaS-O-Matic runs as a decoupled full-stack application:
* **Angular 19 Frontend (`http://localhost:4200`)** delivers instant 60fps pricing previews in the browser and fetches live FX rates from `open.er-api.com` (with `localStorage` fallback).
* **Angular Dev Proxy (`proxy.conf.json`)** forwards `/api/*` requests seamlessly to the FastAPI server (`http://localhost:8000`).
* **FastAPI Backend (`http://localhost:8000`)** validates requests, enforces Spanish DNI/NIE/CIF algorithms, runs authoritative EUR-cent pricing math, and persists immutable snapshots in **SQLite**.

```mermaid
flowchart LR
    User(["Commercial User Browser"])

    subgraph FE["Frontend (Angular 19 · :4200)"]
        UI["Dashboard / Detail / Simulator UI"]
        Calc["Client Pricing Calculator (60fps Preview)"]
        FX["CurrencyExchangeService (4-State Resilience)"]
        Proxy["Dev Reverse Proxy (/api -> :8000)"]
    end

    subgraph External["External & Browser Storage"]
        FXApi["open.er-api.com (/v6/latest/EUR)"]
        LocalStore[("localStorage FX Cache")]
    end

    subgraph BE["Backend (FastAPI · :8000)"]
        API["REST API (/api/v1)"]
        Domain["Pure Domain Logic (Pricing & DNI/NIE/CIF)"]
        DB[("SQLite DB (EUR cents + bps)")]
    end

    User --> UI
    UI --> Calc
    UI --> FX
    FX -->|"HTTPS (5s timeout)"| FXApi
    FX <-->|"Cached Fallback"| LocalStore
    UI -->|"HTTP JSON"| Proxy
    Proxy -->|"Forward /api/*"| API
    API --> Domain
    API --> DB
```

#### End-to-End Request & Simulation Flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Sales User
    participant FE as Angular UI & Calculator
    participant FX as open.er-api.com / Cache
    participant API as FastAPI Backend
    participant DB as SQLite Database

    U->>FE: Open /customers & search company or Tax ID
    FE->>API: GET /api/v1/customers?q=...
    API->>DB: Parameterized LIKE query
    DB-->>API: Matching customers
    API-->>FE: CustomerListResponse (EUR metadata)

    FE->>FX: GET /v6/latest/EUR (background on boot)
    FX-->>FE: Live rates (or cached_fallback / offline_eur_only)

    U->>FE: Click customer card -> /customers/:id
    FE->>API: GET /customers/:id & GET /customers/:id/simulations
    API-->>FE: Profile + Historial de Simulaciones

    U->>FE: Click "Nueva Simulación" -> /customers/:id/simulate
    loop Dragging sliders (0-150 users, up to 500 manual)
        U->>FE: Adjust users, storage, API calls, policy
        FE->>FE: Recalculate tiers & currency client-side (0 network calls)
    end

    U->>FE: Click "Guardar"
    FE->>API: POST /api/v1/simulations
    API->>API: Authoritative pricing & HARD_CAP / Tax calculation
    API->>DB: INSERT immutable EUR-cent snapshot
    DB-->>API: Saved simulation record
    API-->>FE: 201 Created
    FE->>U: Redirect to /customers/:id with updated history
```

---

## How the Backend Works (`backend/`)

The Python backend follows strict **Single Responsibility** layering (`routers` -> `services` -> `domain` / `repositories`):

```mermaid
flowchart TD
    Req["HTTP Request (/api/v1/*)"] --> Main["app/main.py (CORS, Lifespan DB Init, Error Handlers)"]
    Main --> Routers

    subgraph Routers["1. Routers Layer (HTTP & Pydantic v2 DTOs)"]
        R_Sys["routers/system.py (/health, /countries, /plans)"]
        R_Cust["routers/customers.py (/customers, /{id}/simulations)"]
        R_Sim["routers/simulations.py (POST /simulations)"]
    end

    subgraph Services["2. Services Layer (Use-Case Orchestration)"]
        S_Cust["services/customer_service.py"]
        S_Sim["services/simulation_service.py"]
    end

    subgraph Domain["3. Pure Domain Layer (Zero FastAPI/SQLite Imports)"]
        D_Tax["domain/tax_id_validator.py (DNI/NIE Mod-23 & CIF Checksum)"]
        D_Price["domain/pricing.py (Tiered Users, Progressive Overage, Decimal Tax)"]
        D_Cat["domain/catalog.py (PLANS & 12 COUNTRIES in bps)"]
    end

    subgraph Persistence["4. Persistence Layer (Parameterized SQLite)"]
        Repo_C["repositories/customer_repository.py"]
        Repo_S["repositories/simulation_repository.py"]
        DB_Conn["db/connection.py & db/schema.py"]
        SQLite[("saas_o_matic.db")]
    end

    R_Sys --> DB_Conn
    R_Sys --> D_Cat
    R_Cust --> S_Cust
    R_Cust --> S_Sim
    R_Sim --> S_Sim

    S_Cust --> D_Tax
    S_Cust --> D_Cat
    S_Cust --> Repo_C

    S_Sim --> Repo_C
    S_Sim --> D_Cat
    S_Sim --> D_Price
    S_Sim --> Repo_S

    Repo_C --> DB_Conn
    Repo_S --> DB_Conn
    DB_Conn --> SQLite
```

* **Zero Float Drift:** All EUR monetary math runs in integer cents (`*_cents`) and VAT rates in basis points (`tax_rate_bps`) using `decimal.Decimal` (`ROUND_HALF_UP`).
* **Domain Exceptions -> Standardized HTTP Codes:** `NotFoundError` (`404`), `ConflictError` (`409` on duplicate `(country_code, tax_id)`), and `BusinessValidationError` (`422` on invalid DNI/NIE/CIF or `HARD_CAP` violation).

---

## How the Frontend Works (`frontend/`)

The Angular 19 frontend uses standalone components, Angular Signals, `OnPush` change detection, and unidirectional dependencies (`features/` -> `core/` & `shared/`):

```mermaid
flowchart TD
    Router["Angular Router (app.routes.ts)"] --> Dash["/customers -> CustomerDashboardComponent"]
    Router --> Detail["/customers/:id -> CustomerDetailComponent"]
    Router --> SimPage["/customers/:id/simulate -> SimulationPageComponent"]

    subgraph Features["features/ (Smart Views & Flows)"]
        Dash -->|"Click '+ Nuevo Cliente'"| CreateDlg["CustomerCreateDialogComponent (Spanish CIF/DNI Guard + Dirty Check)"]
        Dash -->|"Click customer card"| Detail
        Detail -->|"Click 'Nueva Simulación'"| SimPage
        SimPage --> Studio["SimulationStudioComponent (Sliders + Policy Toggle)"]
    end

    subgraph Shared["shared/ (Stateless UI Components & Pipes)"]
        CurSel["CurrencySelectorComponent (Status Pill + Select)"]
        Breakdown["CostBreakdownCardComponent (Live Summary + Guardar)"]
        States["LoadingState / EmptyState / StatusBanner / ConfirmDialog"]
        Pipes["CurrencyConvertPipe & TaxIdFormatPipe"]
    end

    subgraph Core["core/ (Singletons, Pure Calc & Interceptors)"]
        Http["CustomerApiService / SimulationApiService / CatalogApiService"]
        FXSvc["CurrencyExchangeService (loading -> live / cached_fallback / offline_eur_only)"]
        CalcUtil["pricing-calculator.ts (Client Parity Math)"]
        ErrInt["api-error.interceptor.ts (Spanish Error Mapping)"]
    end

    Dash --> Shared
    Detail --> Shared
    Studio --> Breakdown
    Dash --> Http
    CreateDlg --> Http
    Detail --> Http
    SimPage --> Http
    Studio --> Http
    Studio --> CalcUtil
    Studio --> FXSvc
    Breakdown --> Pipes
    Http --> ErrInt
```

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

---

## Frontend (Angular 19 + Angular Material)

### Prerequisites
* **Node.js 20+ / 22+ (LTS)** and **npm 10+** (tested with Node 22/26)
* Google Chrome (for running headless unit tests with Karma)

### 1. Install Dependencies
```powershell
cd frontend
npm install
```

### 2. Development Server with API Proxy
Start the Angular dev server with the configured reverse proxy (`proxy.conf.json`) forwarding `/api` calls directly to `http://localhost:8000`:
```powershell
npm start
```
* Web Application UI: `http://localhost:4200`
* Hot-reload is enabled by default for all TypeScript, HTML, and SCSS edits.

### 3. Run Frontend Unit Tests
Execute the unit test suite (Karma + Jasmine) in headless mode:
```powershell
npm test -- --watch=false --browsers=ChromeHeadless
```
*(On Windows environments where Chrome is installed at custom paths, set `$env:CHROME_BIN = "C:\Program Files\Google\Chrome\Application\chrome.exe"` before executing).*

### 4. Build for Production
Generate optimized, minified production assets under `frontend/dist/frontend/`:
```powershell
npm run build
```

---

## End-to-End Local Execution Guide

To run the complete SaaS-O-Matic solution on your machine:

1. **Start the Backend API:**
   Open a terminal in `backend/` with the virtual environment activated:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Verify healthy status:* Open `http://localhost:8000/api/v1/health` in your browser.

2. **Start the Frontend UI:**
   Open a second terminal in `frontend/`:
   ```powershell
   cd frontend
   npm start
   ```
   *Access the app:* Open `http://localhost:4200` in your browser.

3. **Explore Key Features:**
   * **Dashboard & Search:** Search customers by company name or Tax ID (DNI/NIE/CIF) with debounced auto-query.
   * **Customer Registration:** Click **"Nuevo Cliente"** to open the registration dialog. Select Spain (ES) or International, test live Spanish CIF/DNI/NIE checksum verification, and test the dirty-form guard if canceling with entered data.
   * **Customer Detail & History (`/customers/:id`):** Click any customer card to view corporate metadata, base plan quotas, and **Historial de Simulaciones**.
   * **Simulation Studio & 60fps Slider Preview (`/customers/:id/simulate`):** Click **"Nueva Simulación"** to open the interactive simulator:
     * *Active Users:* Slider from 0 to 150 with a linked numeric input allowing up to 500 users.
     * *Storage & API Calls:* Real-time quota badges and progressive tier calculation.
     * *Overage Policy:* Toggle between `PROGRESSIVE` overage calculation and `HARD_CAP` quota guardrails.
   * **Multi-Currency:** Switch between EUR, USD, GBP, CHF, MXN, and COP with live rates from `open.er-api.com` (supported by 4 resilient states: live, cached fallback, loading, and offline EUR-only).
   * **Persistence:** Click **"Guardar"** to record an immutable simulation snapshot into SQLite and return automatically to `/customers/:id` with the updated history table.

