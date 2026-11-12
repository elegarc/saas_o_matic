---
trigger: always_on
description: Python, FastAPI, and SQLite coding standards, layered architecture, and testing practices for the SaaS-O-Matic backend.
---

# Backend Rules: Python, FastAPI & SQLite (SaaS-O-Matic)

These rules apply to all Python backend code under `backend/` and complement `.agents/rules/architecture.md`.

## 1. Layered Package Structure
Organize `backend/` cleanly with strict single-responsibility boundaries:
* `app/main.py`: FastAPI app factory/entrypoint, CORS middleware (allowing Angular dev origin), lifespan DB initialization, global exception handlers, and `/api/v1` router mounting.
* `app/core/`: Configuration/settings and custom domain exceptions (`DomainError`, `NotFoundError`, `ConflictError`, `BusinessValidationError`).
* `app/schemas/`: Pydantic v2 request/response models aligned 1:1 with `ai-workspace/01-specs/02-api-contract.yaml`.
* `app/routers/`: Thin `APIRouter` endpoints (`status_code`, `response_model`, `Depends()`). **No raw SQL and no pricing/tax/DNI math in routers.**
* `app/domain/`: Pure, framework-agnostic business logic (`catalog.py`, `pricing.py`, `tax_id_validator.py`)—must have zero FastAPI or SQLite imports.
* `app/services/`: Application use-case orchestrators coordinating validation, domain calculation, and repository persistence.
* `app/repositories/` & `app/db/`: SQLite connection management, schema initialization (`03-data-model.md`), parameterized SQL queries, and row mapping.
* `tests/`: `pytest` unit tests (`tests/unit/`) and FastAPI `TestClient` integration tests (`tests/integration/`).

## 2. Python Coding Practices
* **Type Annotations Everywhere:** Use explicit PEP 484 / PEP 604 type hints (`int | None`, `list[Customer]`, `Decimal`) on all function parameters, return values, and class attributes.
* **Exact Financial & Tax Arithmetic:** Never use `float` for monetary or tax calculations.
  * Store and compute all EUR values in **integer euro cents** (`*_cents: int`) and tax rates in integer basis points (`tax_rate_bps: int`).
  * Use `decimal.Decimal` with `ROUND_HALF_UP` for tax computation; convert cents to 2-decimal EUR values only when serializing API response DTOs.
* **Pure Functions & Immutable Models:** Prefer `@dataclass(frozen=True)` for domain entities/breakdowns and pure deterministic functions for pricing and validation.
* **Clean Control Flow:** Keep functions small and focused; use early returns to avoid deep nesting; raise explicit domain exceptions rather than returning sentinel `None` or using bare `except:`.
* **Style & Documentation:** Follow PEP 8 (`ruff` / `black` conventions, max line length 100, grouped imports). Write concise English docstrings on public modules, classes, and functions; keep code/identifiers/comments in English and user-facing error `message` strings in Spanish.

## 3. FastAPI Best Practices
* **Pydantic v2 Boundary Validation:** Enforce `min_length`, `max_length`, `ge`, `le`, `EmailStr`, and `Enum` types (`PlanCode`, `OveragePolicy`) on input schemas (`model_config = ConfigDict(...)`). Normalize strings (`strip()`, uppercase `country_code` / `tax_id`, lowercase `contact_email`) cleanly via validators or domain normalization helpers.
* **Dependency Injection (`Depends`):** Inject DB connections (using generator dependencies with `try / finally` cleanup and rollback on exception) and service instances via `Depends()` so tests can override them cleanly via `app.dependency_overrides`.
* **Sync Endpoints for `sqlite3`:** Because Python's standard `sqlite3` driver is synchronous/blocking, declare SQLite-backed FastAPI path operations as regular `def` functions (letting FastAPI execute them in its threadpool without blocking the async event loop).
* **Standardized Error Responses:** Register FastAPI exception handlers that map domain exceptions to `ErrorResponse` (`code`, `message`, `details`) matching `02-api-contract.yaml` (`404`, `409`, `422`, `500`), without leaking internal stack traces or SQL details in HTTP responses.

## 4. SQLite & Security Hygiene
* **Parameterized Queries Only:** Always use `?` placeholders in `sqlite3` queries—never build SQL strings with f-strings, `%`, or `+`.
* **Foreign Keys & Integrity:** Execute `PRAGMA foreign_keys = ON;` on every SQLite connection. Translate `sqlite3.IntegrityError` for duplicate `(country_code, tax_id)` explicitly into `ConflictError` (`409 Conflict`).
* **Immutable Snapshots:** Persist calculated cost breakdowns and applied policy/tax rates on each `simulations` row so historical records never drift if catalog rates change later.

## 5. Testing & Verification Standards
* **Unit Tests (Pure Domain):** Cover every pricing boundary (`0, 10, 11, 15, 50, 51` users), progressive storage/API overage tiers, `HARD_CAP` violations, tax rounding (`ROUND_HALF_UP`), and valid/invalid Spanish **DNI**, **NIE**, and **CIF** edge cases.
* **Integration Tests (API + Temp SQLite):** Exercise every endpoint in `02-api-contract.yaml` with `TestClient` against an isolated temporary SQLite database, verifying `200`/`201`, `404`, `409`, and `422` responses.

