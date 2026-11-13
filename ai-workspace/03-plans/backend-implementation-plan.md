# Backend Implementation Plan — SaaS-O-Matic (Python, FastAPI & SQLite)

> **Specs Referenced:**
> * [01-product-spec.md](../01-specs/01-product-spec.md)
> * [02-api-contract.yaml](../01-specs/02-api-contract.yaml)
> * [03-data-model.md](../01-specs/03-data-model.md)
> * [architecture.md](../../.agents/rules/architecture.md)
> * [backend-python.md](../../.agents/rules/backend-python.md)

---

## 1. Environment Preparation (Windows + Python `venv`)

> **Python Version Note:** Because `backend-python.md` mandates PEP 604 union syntax (`int | None`) and modern FastAPI + Pydantic v2 works best on Python 3.10+, install **Python 3.11 or 3.12** before creating the virtual environment. *(Note: the local environment initially reported `Python 3.9.7`; upgrading to `3.12` is recommended before running the steps below, or else `typing.Optional[...]` must be used in place of `| None`.)*

### Step-by-Step Setup

1. **Install Python 3.11 or 3.12 (Windows):**
   * Download the Windows 64-bit installer from `https://www.python.org/downloads/` (ensure **"Add python.exe to PATH"** is checked), or install via `winget`:
     ```powershell
     winget install Python.Python.3.12
     ```
   * Verify in a new PowerShell terminal:
     ```powershell
     python --version
     ```
   * *SQLite:* Built into Python's standard library (`sqlite3`), so no external database server is required.

2. **Create and Activate the Virtual Environment (`backend/.venv`):**
   ```powershell
   cd d:\programming\saas_o_matic\saas_o_matic\backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   ```
   *(If PowerShell blocks script activation, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or execute `.venv\Scripts\python.exe` directly.)*

3. **Create Dependency Manifests:**
   * `backend/requirements.txt`:
     ```text
     fastapi>=0.115.0
     uvicorn[standard]>=0.32.0
     pydantic[email]>=2.9.0
     pydantic-settings>=2.6.0
     ```
   * `backend/requirements-dev.txt`:
     ```text
     -r requirements.txt
     pytest>=8.3.0
     httpx>=0.27.0
     ruff>=0.7.0
     ```

4. **Install Dependencies:**
   ```powershell
   pip install -r requirements-dev.txt
   ```

---

## 2. Target Modular Structure (`backend/`)

Follows strict single-responsibility boundaries from `backend-python.md`:

```text
backend/
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml                   # pytest & ruff configuration (line-length = 100)
├── .env.example                     # DATABASE_PATH, CORS_ORIGINS
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI factory, CORS, lifespan DB init, exception handlers, /api/v1 mount
│   ├── core/
│   │   ├── config.py                # Settings (BaseSettings / env defaults)
│   │   └── exceptions.py            # DomainError, NotFoundError, ConflictError, BusinessValidationError
│   ├── domain/                      # Pure Python only (ZERO FastAPI or sqlite3 imports)
│   │   ├── models.py                # Frozen dataclasses (PlanSpec, CountrySpec, SimulationCalculation, etc.)
│   │   ├── catalog.py               # PLANS (STARTER/PRO/ENTERPRISE) & COUNTRIES (12 ISO-2 VAT rates in bps)
│   │   ├── tax_id_validator.py      # Normalization + Spanish DNI / NIE / CIF checksums + non-ES format check
│   │   └── pricing.py               # Tiered users, progressive overages, HARD_CAP validation, Decimal tax
│   ├── schemas/                     # Pydantic v2 DTOs matching 02-api-contract.yaml
│   │   ├── common.py                # PlanCode, OveragePolicy, ErrorResponse, HealthResponse, CountryInfo, PlanInfo
│   │   ├── customer.py              # CustomerCreateRequest, CustomerResponse, CustomerListResponse
│   │   └── simulation.py            # SimulationCreateRequest, SimulationBreakdown, SimulationResponse
│   ├── db/
│   │   ├── connection.py            # SQLite connection factory (PRAGMA foreign_keys = ON, Row) & FastAPI Depends
│   │   └── schema.py                # Idempotent DDL from 03-data-model.md
│   ├── repositories/
│   │   ├── customer_repository.py   # Parameterized SQLite CRUD/search + row mapping
│   │   └── simulation_repository.py # Parameterized INSERT snapshot + list by customer_id DESC
│   ├── services/
│   │   ├── customer_service.py      # Validates country/tax_id, delegates persistence, maps ConflictError
│   │   └── simulation_service.py    # Loads customer, executes domain pricing, persists immutable snapshot
│   └── routers/
│       ├── system.py                # GET /health, GET /countries, GET /plans
│       ├── customers.py             # GET /customers, POST /customers, GET /customers/{id}, GET /customers/{id}/simulations
│       └── simulations.py           # POST /simulations
└── tests/
    ├── conftest.py                  # Temp SQLite DB fixture + FastAPI TestClient dependency overrides
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

### Step 1: Configuration & Domain Exceptions (`app/core/`)
* **`config.py`:** Define `Settings` (`app_name`, `api_prefix="/api/v1"`, `database_path="data/saas_o_matic.db"`, `cors_origins=["http://localhost:4200"]`).
* **`exceptions.py`:** Define `DomainError(code: str, message: str, details: dict[str, object] | None = None)` and subclasses:
  * `NotFoundError` $\rightarrow$ HTTP `404`
  * `ConflictError` $\rightarrow$ HTTP `409`
  * `BusinessValidationError` $\rightarrow$ HTTP `422`

### Step 2: Pure Domain Layer (`app/domain/`)
*(Zero `fastapi` or `sqlite3` imports; all EUR amounts in integer cents `*_cents`, all tax rates in integer basis points `tax_rate_bps`.)*

* **`models.py`:** `@dataclass(frozen=True)` for `PlanCode`, `OveragePolicy`, `PlanSpec`, `CountrySpec`, `SimulationCalculation`, `CustomerRecord`, and `SimulationRecord`.
* **`catalog.py`:**
  * `PLANS`:
    * `STARTER`: `2900` cents (`29.00 €`), `25` GB storage, `100_000` API calls
    * `PRO`: `7900` cents (`79.00 €`), `100` GB storage, `500_000` API calls
    * `ENTERPRISE`: `19900` cents (`199.00 €`), `500` GB storage, `2_000_000` API calls
  * `COUNTRIES` (12 ISO-2 countries from `01-product-spec.md`):
    * `ES` (`2100`), `PT` (`2300`), `FR` (`2000`), `DE` (`1900`), `IT` (`2200`), `NL` (`2100`), `BE` (`2100`), `IE` (`2300`), `GB` (`2000`), `US` (`0`), `MX` (`1600`), `CO` (`1900`).
* **`tax_id_validator.py`:**
  * `normalize_tax_id(raw: str) -> str`: trim whitespace, remove spaces/hyphens/dots, uppercase.
  * `validate_tax_id(country_code: str, raw_tax_id: str) -> str`:
    * For `country_code == "ES"`: require length 9 after normalization and validate:
      * **DNI:** `^[0-9]{8}[A-Z]$`, Mod-23 against `"TRWAGMYFPDXBNJZSQVHLCKE"`.
      * **NIE:** `^[XYZ][0-9]{7}[A-Z]$`, replace `X->0, Y->1, Z->2`, Mod-23 against `"TRWAGMYFPDXBNJZSQVHLCKE"`.
      * **CIF:** `^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$`, even/odd weighted sum, `"JABCDEFGHI"`, enforcing numeric-only (`ABEH`), alpha-only (`PQRSNW`), and dual (`CDFGJUV`) control rules.
      * On failure, raise `BusinessValidationError(code="INVALID_SPANISH_TAX_ID", message=<Spanish error message>)`.
    * For `country_code != "ES"`: validate `^[A-Z0-9]{5,20}$`; raise `BusinessValidationError(code="INVALID_TAX_ID", ...)` on failure.
* **`pricing.py`:**
  * `calculate_users_cost_cents(active_users: int) -> int`: `0–10 @ 1000`, `11–50 @ 800`, `>50 @ 500`.
  * `calculate_extra_storage_cost_cents(extra_gb: int) -> int`: `1–50 @ 50`, `51–200 @ 80`, `>200 @ 120`.
  * `calculate_extra_api_cost_cents(extra_calls: int) -> int`: `blocks = (extra_calls + 999) // 1000` if `extra_calls > 0` else `0`; `1–100 @ 5`, `101–500 @ 8`, `>500 @ 12`.
  * `calculate_simulation(...) -> SimulationCalculation`:
    * Enforce `HARD_CAP` (`BusinessValidationError(code="PLAN_LIMIT_EXCEEDED", ...)` if `storage_gb > plan.included_storage_gb` or `estimated_api_calls > plan.included_api_calls`).
    * `subtotal_cents = plan_fixed_cents + users_cost_cents + extra_storage_cost_cents + extra_api_cost_cents`.
    * `tax_amount_cents` via `Decimal` with `ROUND_HALF_UP`: `(Decimal(subtotal_cents) * Decimal(tax_rate_bps) / Decimal(10000)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)`.
    * `total_cents = subtotal_cents + tax_amount_cents`.

### Step 3: SQLite Database & Repositories (`app/db/` & `app/repositories/`)
* **`db/schema.py`:** Execute idempotent DDL from `03-data-model.md` (`customers`, `simulations`, `uq_customers_country_tax_id`, and all 4 indexes).
* **`db/connection.py`:** Ensure parent DB folder exists, open `sqlite3.connect(..., check_same_thread=False)`, set `row_factory = sqlite3.Row`, run `PRAGMA foreign_keys = ON;`, and expose `get_db()` dependency generator with rollback on exception and `close()` in `finally`.
* **`repositories/customer_repository.py`:**
  * `create(...)`: parameterized `INSERT`; catch `sqlite3.IntegrityError` on `UNIQUE(country_code, tax_id)` and raise `ConflictError(code="DUPLICATE_CUSTOMER", message=...)`.
  * `get_by_id(customer_id: int)`
  * `search(query: str | None, limit: int, offset: int)`: match `company_name` case-insensitively (`LIKE ? ESCAPE '\'`) and normalized `tax_id`, returning `(items, total)` ordered by `created_at DESC, id DESC`.
* **`repositories/simulation_repository.py`:**
  * `create(...)`: parameterized `INSERT` persisting all `*_cents` and `tax_rate_bps` snapshot columns.
  * `list_by_customer(customer_id: int)`: ordered by `created_at DESC, id DESC`.

### Step 4: Schemas, Services, Routers & App Entrypoint
* **`schemas/`:** Pydantic v2 DTOs aligned 1:1 with `02-api-contract.yaml`, converting cents to 2-decimal EUR values at serialization time and normalizing input fields.
* **`services/`:** `CustomerService` and `SimulationService` orchestrating domain checks and repository calls.
* **`routers/`:** Synchronous `def` route handlers using `Depends()` for all 8 endpoints under `/api/v1`:
  * `GET /health`
  * `GET /countries`
  * `GET /plans`
  * `GET /customers`, `POST /customers`, `GET /customers/{customer_id}`, `GET /customers/{customer_id}/simulations`
  * `POST /simulations`
* **`main.py`:** Register exception handlers mapping `NotFoundError` (`404`), `ConflictError` (`409`), `BusinessValidationError` (`422`), `RequestValidationError` (`422` formatted as `ErrorResponse`), and generic `500` errors without leaking SQL/stack traces. Configure `CORSMiddleware` and `lifespan` DB initialization.

---

## 4. Verification & Test Plan (`backend/tests/`)

### A. Unit Tests (`tests/unit/` — Pure Domain, Zero DB/HTTP)
1. **`test_pricing.py`:**
   * User tier boundaries: `0` (`0.00 €` users + `29.00 €` Starter = `29.00 €`), `1`, `10` (`100.00 €`), `11` (`108.00 €`), `15` (`140.00 €` users + `29.00 €` plan = `169.00 €`), `50` (`420.00 €`), `51` (`425.00 €`).
   * `PRO` (`79.00 €`, `100 GB`, `500k`) and `ENTERPRISE` (`199.00 €`, `500 GB`, `2M`) thresholds.
   * Progressive extra storage boundaries: `25` (`0 €`), `26` (`0.50 €`), `75` (`25.00 €`), `76` (`25.80 €`), `85` (`33.00 €`), `225` (`145.00 €`), `226` (`146.20 €`).
   * Progressive extra API calls boundaries: `100,000` (`0 €`), `100,001` (`0.05 €`), `200,000` (`5.00 €`), `250,000` (`9.00 €`), `600,000` (`37.00 €`), `600,001` (`37.12 €`).
   * `HARD_CAP`: succeeds at exact threshold (`25 GB`, `100,000` calls); raises `PLAN_LIMIT_EXCEEDED` at `26 GB` or `100,001` calls.
   * Tax `ROUND_HALF_UP` rounding and `0%` tax (`US`).
2. **`test_tax_id_validator.py`:**
   * Normalization (`"b-58818501 "` $\rightarrow$ `"B58818501"`).
   * Valid & invalid **DNI** (bad check letter, bad length, excluded letters `I`/`O`/`U`).
   * Valid & invalid **NIE** (`X`, `Y`, `Z` prefixes; invalid prefix; wrong check letter).
   * Valid & invalid **CIF**: numeric-only (`A58818501`, `B...` rejecting alpha control), alpha-only (`P...`, `Q...` rejecting numeric control), dual (`C...`, `G...` accepting both), zero-remainder (`0` / `J`).
   * Non-Spanish countries (`FR`, `US`, `PT`): accepts 5–20 alphanumeric chars, rejects `<5` or invalid symbols.

### B. Integration Tests (`tests/integration/` — `TestClient` + Temp SQLite)
1. **`test_system_api.py`:** `GET /api/v1/health` (`200`), `GET /api/v1/countries` (12 entries), `GET /api/v1/plans` (3 entries).
2. **`test_customers_api.py`:**
   * `POST /customers` (`201`, normalized `tax_id` & `contact_email`, default `overage_policy="PROGRESSIVE"`).
   * Duplicate `(country_code, tax_id)` $\rightarrow$ `409 Conflict`.
   * Invalid Spanish CIF/DNI/NIE $\rightarrow$ `422` (`INVALID_SPANISH_TAX_ID`).
   * Unsupported country or invalid email $\rightarrow$ `422`.
   * `GET /customers?q=` matching partial `company_name` and normalized `tax_id` + pagination (`limit`, `offset`, `total`).
   * `GET /customers/{id}` (`200` and `404`).
3. **`test_simulations_api.py`:**
   * `POST /simulations` (`201`): `15 users` + `STARTER` + `20 GB` + `80k API` + `ES (21%)` $\rightarrow$ `169.00 €` subtotal, `35.49 €` tax, `204.49 €` total.
   * `POST /simulations` with `0` active users $\rightarrow$ `201` (`users_cost_eur = 0.0`, `subtotal_eur = 29.0`).
   * `POST /simulations` exceeding limits under `HARD_CAP` $\rightarrow$ `422` (`PLAN_LIMIT_EXCEEDED`), and overriding to `PROGRESSIVE` $\rightarrow$ `201`.
   * `POST /simulations` with nonexistent `customer_id` $\rightarrow$ `404`.
   * `GET /customers/{id}/simulations` returns newest-first history (`200`) and `404` for unknown customer.
4. **Commands:**
   ```powershell
   pytest -v
   ruff check .
   ```

---

## 5. Planned Additions to `README.md` (After Implementation)

Once the backend is implemented and verified, add a **"Backend (FastAPI + SQLite)"** section to `README.md` covering:

1. **Prerequisites:** Python `3.11+` (recommended `3.12`) and `pip`.
2. **Environment & `venv` Setup:**
   ```powershell
   cd backend
   python -m venv .venv
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # Linux / macOS:
   # source .venv/bin/activate
   pip install -r requirements-dev.txt
   ```
3. **Configuration:** Optional `.env` creation from `backend/.env.example` (`DATABASE_PATH`, `CORS_ORIGINS`; SQLite schema initializes automatically on startup).
4. **Running Locally:**
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   * Interactive API docs (Swagger): `http://localhost:8000/docs`
   * Health check: `http://localhost:8000/api/v1/health`
5. **Running Tests & Linter:**
   ```powershell
   cd backend
   pytest -v
   ruff check .
   ```

