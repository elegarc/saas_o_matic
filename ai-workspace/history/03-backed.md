
# PROMT

Create an implementation plan for the backend.
Follow the specs in [01-DefineSpecs.md](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/history/01-DefineSpecs.md) , [02-api-contract.yaml](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/02-api-contract.yaml) and [03-data-model.md](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/03-data-model.md) . 
Include the tests that should be done in the plan.
The plan should include a section about how to prepare the environment: python installation and any other dependencies that might be necessary. I am goint to follow this plan myself
The plan should include what shold be added to the readme after the implementation is finished : instructions to run the environment locally, what should be installed, environment with venv for python and how to run the tests

# Response

Analyzed 01-DefineSpecs.md:L1-124
Analyzed README.md:L1
Ran check installed Python version · Exited with code 1
Ran check backend directory contents

Below is the complete implementation plan for the **SaaS-O-Matic** backend (`backend/`), aligned with [01-product-spec.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/01-product-spec.md), [02-api-contract.yaml](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/02-api-contract.yaml), [03-data-model.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/03-data-model.md), [architecture.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/architecture.md), and [backend-python.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/backend-python.md).

No backend code has been generated yet so you can review or follow the steps directly.

---

## 1. Environment Preparation (Windows + Python `venv`)

> [!WARNING]
> **Python Version Check:** Your current `PATH` resolves `python` to **`Python 3.9.7`** (and `pip` is not directly on `PATH`). Because [backend-python.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/backend-python.md#L22) specifies PEP 604 union syntax (`int | None`) and modern FastAPI/Pydantic v2 works best on Python 3.10+, **install Python 3.11 or 3.12** (recommended) before creating the virtual environment—or alternatively use `typing.Optional[...]` if you prefer to stay on 3.9.7.

### Step-by-Step Setup
1. **Install Python 3.11 or 3.12 (Windows):**
   * Download the Windows 64-bit installer from `https://www.python.org/downloads/` (check **"Add python.exe to PATH"** during installation), or via `winget`:
     ```powershell
     winget install Python.Python.3.12
     ```
   * Verify in a fresh PowerShell terminal:
     ```powershell
     python --version   # Expect Python 3.12.x (or 3.11.x)
     ```
   * *(Note: `sqlite3` is bundled in Python's standard library—no separate SQLite server installation is required. You may optionally install DB Browser for SQLite if you want to inspect `.db` files visually.)*

2. **Create and Activate the Virtual Environment (`backend/.venv`):**
   ```powershell
   cd d:\programming\saas_o_matic\saas_o_matic\backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   ```
   *(If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or invoke `.venv\Scripts\python.exe` directly.)*

3. **Create Dependency Manifests (`requirements.txt` & `requirements-dev.txt`):**
   * `backend/requirements.txt`:
     * `fastapi>=0.115.0` — REST framework & OpenAPI generation
     * `uvicorn[standard]>=0.32.0` — ASGI server
     * `pydantic[email]>=2.9.0` — Pydantic v2 DTO validation + `email-validator` (required for `EmailStr`)
     * `pydantic-settings>=2.6.0` — Environment-based configuration (`DATABASE_PATH`, `CORS_ORIGINS`)
   * `backend/requirements-dev.txt`:
     * `-r requirements.txt`
     * `pytest>=8.3.0` — Unit & integration test runner
     * `httpx>=0.27.0` — Required by FastAPI `TestClient`
     * `ruff>=0.7.0` — Linter & PEP 8 formatter (`line-length = 100`)

4. **Install Dependencies:**
   ```powershell
   pip install -r requirements-dev.txt
   ```

---

## 2. Target Modular Structure (`backend/`)

Follows strict single-responsibility layering from [backend-python.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/backend-python.md):

```text
backend/
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml                 # pytest & ruff configuration (line-length = 100)
├── .env.example                   # DATABASE_PATH, CORS_ORIGINS
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI factory, CORS, lifespan DB init, exception handlers, /api/v1 mount
│   ├── core/
│   │   ├── config.py              # Settings dataclass / BaseSettings
│   │   └── exceptions.py          # DomainError, NotFoundError, ConflictError, BusinessValidationError
│   ├── domain/                    # Pure Python only (ZERO FastAPI or sqlite3 imports)
│   │   ├── models.py              # Frozen dataclasses (PlanSpec, CountrySpec, PricingBreakdown, Customer, Simulation)
│   │   ├── catalog.py             # PLANS (STARTER/PRO/ENTERPRISE) & COUNTRIES (12 ISO-2 VAT rates in bps)
│   │   ├── tax_id_validator.py    # Normalization + DNI / NIE / CIF official checksums + non-ES format check
│   │   └── pricing.py             # Tiered user math, progressive storage/API overages, HARD_CAP check, Decimal tax
│   ├── schemas/                   # Pydantic v2 DTOs matching 02-api-contract.yaml
│   │   ├── common.py              # PlanCode, OveragePolicy, ErrorResponse, HealthResponse, CountryInfo, PlanInfo
│   │   ├── customer.py            # CustomerCreateRequest, CustomerResponse, CustomerListResponse
│   │   └── simulation.py          # SimulationCreateRequest, SimulationBreakdown, SimulationResponse
│   ├── db/
│   │   ├── connection.py          # SQLite connection factory (PRAGMA foreign_keys = ON, row_factory = Row) & FastAPI Depends
│   │   └── schema.py              # Idempotent DDL from 03-data-model.md (customers, simulations, indexes)
│   ├── repositories/
│   │   ├── customer_repository.py # Parameterized SQLite CRUD/search (company_name / tax_id) + row mapping
│   │   └── simulation_repository.py # Parameterized INSERT snapshot + list by customer_id DESC
│   ├── services/
│   │   ├── customer_service.py    # Validates country/tax_id, delegates persistence, maps duplicate -> ConflictError
│   │   └── simulation_service.py  # Loads customer, executes domain pricing, persists immutable snapshot
│   └── routers/
│       ├── system.py              # GET /health, GET /countries, GET /plans
│       ├── customers.py           # GET /customers, POST /customers, GET /customers/{id}, GET /customers/{id}/simulations
│       └── simulations.py         # POST /simulations
└── tests/
    ├── conftest.py                # Temp SQLite DB fixture + FastAPI TestClient dependency overrides
    ├── unit/
    │   ├── test_pricing.py
    │   └── test_tax_id_validator.py
    └── integration/
        ├── test_system_api.py
        ├── test_customers_api.py
        └── test_simulations_api.py
```

---

## 3. Step-by-Step Implementation Plan

### Step 1: Configuration & Exceptions (`app/core/`)
* **`config.py`:** Define `Settings` (`app_name`, `api_prefix="/api/v1"`, `database_path="data/saas_o_matic.db"`, `cors_origins=["http://localhost:4200"]`).
* **`exceptions.py`:** Define `DomainError(code: str, message: str, details: dict | None = None)` and subclasses:
  * `NotFoundError` $\rightarrow$ `404`
  * `ConflictError` $\rightarrow$ `409`
  * `BusinessValidationError` $\rightarrow$ `422`

### Step 2: Pure Domain Layer (`app/domain/`)
*(Zero `fastapi` or `sqlite3` imports; all money in integer cents, all tax rates in basis points `bps`.)*
* **`models.py`:** `@dataclass(frozen=True)` for `PlanCode`, `OveragePolicy`, `PlanSpec`, `CountrySpec`, `SimulationCalculation`.
* **`catalog.py`:**
  * `PLANS`: `STARTER` (`2900` cts, `25` GB, `100_000` calls), `PRO` (`7900` cts, `100` GB, `500_000` calls), `ENTERPRISE` (`19900` cts, `500` GB, `2_000_000` calls).
  * `COUNTRIES`: All 12 countries from [01-product-spec.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/01-product-spec.md#L118-L133) (`ES: 2100`, `PT: 2300`, `FR: 2000`, `DE: 1900`, `IT: 2200`, `NL: 2100`, `BE: 2100`, `IE: 2300`, `GB: 2000`, `US: 0`, `MX: 1600`, `CO: 1900`).
* **`tax_id_validator.py`:**
  * `normalize_tax_id(raw: str) -> str`: strip, remove spaces/hyphens/dots, uppercase.
  * `validate_tax_id(country_code: str, raw_tax_id: str) -> str`:
    * If `country_code == "ES"`, verify exact length 9 and validate **DNI** (`^[0-9]{8}[A-Z]$`, Mod-23 `"TRWAGMYFPDXBNJZSQVHLCKE"`), **NIE** (`^[XYZ][0-9]{7}[A-Z]$`, `X->0, Y->1, Z->2` + Mod-23), or **CIF** (`^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$`, weighted even/odd digit sum, `"JABCDEFGHI"`, enforcing numeric-only `ABEH`, alpha-only `PQRSNW`, dual `CDFGJUV`). Raise `BusinessValidationError(code="INVALID_SPANISH_TAX_ID", message=<Spanish message>)` on failure.
    * If `country_code != "ES"`, validate `^[A-Z0-9]{5,20}$`; raise `BusinessValidationError(code="INVALID_TAX_ID", ...)` on failure.
* **`pricing.py`:**
  * `calculate_users_cost_cents(active_users: int) -> int`: `0–10 @ 1000`, `11–50 @ 800`, `>50 @ 500`.
  * `calculate_extra_storage_cost_cents(extra_gb: int) -> int`: `1–50 @ 50`, `51–200 @ 80`, `>200 @ 120`.
  * `calculate_extra_api_cost_cents(extra_calls: int) -> int`: `blocks = (extra_calls + 999) // 1000` (if `> 0`); `1–100 @ 5`, `101–500 @ 8`, `>500 @ 12`.
  * `calculate_simulation(...) -> SimulationCalculation`:
    * Enforce `HARD_CAP` (`BusinessValidationError(code="PLAN_LIMIT_EXCEEDED", ...)` if `storage_gb > plan.included_storage_gb` or `estimated_api_calls > plan.included_api_calls`).
    * Compute `subtotal_cents = plan_fixed_cents + users_cost_cents + extra_storage_cost_cents + extra_api_cost_cents`.
    * Compute `tax_amount_cents` using `Decimal` with `ROUND_HALF_UP`: `(Decimal(subtotal_cents) * Decimal(tax_rate_bps) / Decimal(10000)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)`.
    * Compute `total_cents = subtotal_cents + tax_amount_cents`.

### Step 3: Database & Repositories (`app/db/` & `app/repositories/`)
* **`db/schema.py`:** Execute the exact DDL from [03-data-model.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/03-data-model.md#L56-L115) (`customers`, `simulations`, `uq_customers_country_tax_id`, and all 4 indexes).
* **`db/connection.py`:** Ensure parent directory exists, open `sqlite3.connect(..., check_same_thread=False)`, set `row_factory = sqlite3.Row`, run `PRAGMA foreign_keys = ON;`, and provide `get_db()` generator dependency with rollback on error and `close()` in `finally`.
* **`repositories/customer_repository.py`:**
  * `create(...)`: parameterized `INSERT`; catch `sqlite3.IntegrityError` on `UNIQUE(country_code, tax_id)` and raise `ConflictError(code="DUPLICATE_CUSTOMER", message=...)`.
  * `get_by_id(customer_id: int)`
  * `search(query: str | None, limit: int, offset: int)`: normalize search token for `tax_id` while matching `company_name` case-insensitively (`LIKE ? ESCAPE '\'`), return `(items, total)` ordered by `created_at DESC, id DESC`.
* **`repositories/simulation_repository.py`:**
  * `create(...)`: parameterized `INSERT` storing all `*_cents` and `tax_rate_bps` snapshot columns.
  * `list_by_customer(customer_id: int)`: ordered by `created_at DESC, id DESC`.

### Step 4: Schemas, Services, Routers & App Entrypoint
* **`schemas/`:** Pydantic v2 models matching [02-api-contract.yaml](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/02-api-contract.yaml) 1:1 (including `cents_to_eur()` conversion using `Decimal` rounded to 2 decimals and Spanish validation normalization).
* **`services/`:** `CustomerService` and `SimulationService` coordinating domain validation/pricing with repositories.
* **`routers/`:** Synchronous `def` route handlers using `Depends()` for all 8 endpoints under `/api/v1`:
  * `GET /health`
  * `GET /countries`
  * `GET /plans`
  * `GET /customers`, `POST /customers`, `GET /customers/{customer_id}`, `GET /customers/{customer_id}/simulations`
  * `POST /simulations`
* **`main.py`:** Register exception handlers mapping `NotFoundError` (`404`), `ConflictError` (`409`), `BusinessValidationError` (`422`), FastAPI `RequestValidationError` (`422` formatted as `ErrorResponse`), and unhandled exceptions (`500` without leaking SQL/stack traces). Configure `CORSMiddleware` and `lifespan` DB bootstrap.

---

## 4. Verification & Test Plan (`backend/tests/`)

### A. Unit Tests (`tests/unit/` — Pure Domain, Zero DB/HTTP)
1. **`test_pricing.py`:**
   * User tier boundaries: `0` (`0.00 €` users + `29.00 €` Starter = `29.00 €`), `1`, `10` (`100.00 €`), `11` (`108.00 €`), `15` (`140.00 €` users + `29.00 €` plan = `169.00 €`), `50` (`420.00 €`), `51` (`425.00 €`).
   * `PRO` and `ENTERPRISE` fixed plan rates and thresholds (`100 GB / 500k`, `500 GB / 2M`).
   * Progressive extra storage boundaries: `0`, `25` (exact limit -> `0 €`), `26` (`+1 GB -> 0.50 €`), `75` (`+50 GB -> 25.00 €`), `76` (`+51 GB -> 25.80 €`), `85` (`+60 GB -> 33.00 €`), `225` (`+200 GB -> 145.00 €`), `226` (`+201 GB -> 146.20 €`).
   * Progressive extra API calls boundaries: `100,000` (`0 €`), `100,001` (`1` block -> `0.05 €`), `200,000` (`100` blocks -> `5.00 €`), `250,000` (`150` blocks -> `9.00 €`), `600,000` (`500` blocks -> `37.00 €`), `600,001` (`501` blocks -> `37.12 €`).
   * `HARD_CAP` policy: succeeds at exact limits (`25 GB`, `100,000` calls); raises `PLAN_LIMIT_EXCEEDED` when storage is `26 GB` or API calls is `100,001`.
   * Tax `ROUND_HALF_UP` rounding: verify half-cent tie-breaking (e.g., `.005` rounds up) and `0%` tax (`US`).
2. **`test_tax_id_validator.py`:**
   * Normalization: lowercase, spaces, dots, hyphens (`"b-58818501"` $\rightarrow$ `"B58818501"`).
   * Valid & invalid **DNI** (wrong check digit, invalid length, excluded letter `I`/`O`/`U`).
   * Valid & invalid **NIE** (`X`, `Y`, `Z` prefixes; wrong prefix `W`; wrong check digit).
   * Valid & invalid **CIF**: numeric-only prefix (`A58818501`, `B...` rejecting letter control), alpha-only prefix (`P...`, `Q...` rejecting digit control), dual prefix (`C...`, `G...` accepting both valid digit and valid letter), zero-remainder case (`D = 0 -> '0' / 'J'`).
   * Non-Spanish country (`FR`, `US`, `PT`): accepts 5–20 alphanumeric chars, rejects `<5` chars or special symbols.

### B. Integration Tests (`tests/integration/` — `TestClient` + Temp SQLite)
1. **`test_system_api.py`:** `GET /api/v1/health` (`200`), `GET /api/v1/countries` (12 countries), `GET /api/v1/plans` (3 plans).
2. **`test_customers_api.py`:**
   * `POST /customers` (`201` with normalized `tax_id` & `contact_email`, default `overage_policy="PROGRESSIVE"`).
   * Duplicate `(country_code, tax_id)` $\rightarrow$ `409 Conflict`.
   * Invalid Spanish CIF/DNI/NIE $\rightarrow$ `422` with `ErrorResponse` (`code: INVALID_SPANISH_TAX_ID`).
   * Unsupported `country_code` or invalid email $\rightarrow$ `422`.
   * `GET /customers?q=` matching partial `company_name` (case-insensitive) and normalized `tax_id`, plus `limit`/`offset` pagination.
   * `GET /customers/{id}` (`200` and `404` for nonexistent ID).
3. **`test_simulations_api.py`:**
   * `POST /simulations` (`201`) verifying `15 users` + `STARTER` + `20 GB` + `80k API` + `ES (21%)` = `169.00 €` subtotal, `35.49 €` tax, `204.49 €` total.
   * `POST /simulations` with `0` active users $\rightarrow$ `201` with `users_cost_eur = 0.0`, `subtotal_eur = 29.0`.
   * `POST /simulations` exceeding limits under `HARD_CAP` $\rightarrow$ `422` (`PLAN_LIMIT_EXCEEDED`), and overriding to `PROGRESSIVE` $\rightarrow$ `201`.
   * `POST /simulations` with unknown `customer_id` $\rightarrow$ `404`.
   * `GET /customers/{id}/simulations` returns newest-first history (`200`) and `404` for unknown customer.
   * Run `ruff check .` and `pytest -v`.

---

## 5. Planned Additions to `README.md` (After Implementation)

Once the backend is implemented and verified, [README.md](file:///d:/programming/saas_o_matic/saas_o_matic/README.md) should be updated with a **"Backend (FastAPI + SQLite)"** section containing:

1. **Prerequisites:** Python `3.11+` (recommended `3.12`) and `pip`.
2. **Environment & `venv` Setup (Windows PowerShell & Linux/macOS):**
   ```powershell
   cd backend
   python -m venv .venv
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # Linux / macOS:
   # source .venv/bin/activate
   pip install -r requirements-dev.txt
   ```
3. **Configuration:** Optional `.env` setup from `backend/.env.example` (`DATABASE_PATH`, `CORS_ORIGINS`; SQLite DB auto-initializes on startup).
4. **Running the API Locally:**
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   * Swagger / OpenAPI docs: `http://localhost:8000/docs`
   * Health check: `http://localhost:8000/api/v1/health`
5. **Running Tests & Linting:**
   ```powershell
   cd backend
   pytest -v
   ruff check .
   ```

Let me know if you'd like to adjust any part of this plan, or if you want me to proceed with implementing any step after your review.