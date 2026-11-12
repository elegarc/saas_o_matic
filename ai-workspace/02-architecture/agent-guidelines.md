# AI Governance Strategy & Agent Guardrails — SaaS-O-Matic

This document explains how the AI coding assistant was configured and constrained during the development of **SaaS-O-Matic**, addressing Section 3.2 (*Definición de la Arquitectura*) of [task.md](../../task.md).

---

## 1. Separation of Concerns: Operational Rules vs. Evaluator Docs

A common pitfall in AI-assisted development is either leaving the agent unconstrained (producing monolithic files, mixed abstractions, and inconsistent styles) or dumping large specification documents into every prompt (wasting context budget).

To solve both problems, governance is split into two distinct layers:

1. **Operational Rules (`.agents/rules/`):** Concise, high-signal directives loaded automatically via `trigger: always_on`. They constrain *how* the agent plans, structures modules, handles errors, and names identifiers on every turn.
2. **Specifications & Architecture Docs (`ai-workspace/01-specs/` & `ai-workspace/02-architecture/`):** Single sources of truth consulted on demand before generating or modifying code, avoiding duplication inside `.agents/rules/` and keeping the active rules context lean.

---

## 2. Rule Topology & Anti-Patterns Prevented

| Rule File | Scope | Primary Anti-Patterns Prevented |
| :--- | :--- | :--- |
| [architecture.md](../../.agents/rules/architecture.md) | All repository areas | Ad-hoc coding without consulting specs; unapproved multi-file rewrites; monolithic classes; mixing Spanish identifiers into English schemas/APIs or English copy into the Spanish UI. |
| [backend-python.md](../../.agents/rules/backend-python.md) | `backend/` (Python, FastAPI, SQLite) | SQL queries inside FastAPI routers; business math coupled to HTTP/DB; IEEE-754 `float` rounding drift on EUR/VAT; blocking `sqlite3` inside `async def` handlers; string-interpolated SQL; missing boundary/DNI/CIF tests. |
| [frontend-angular.md](../../.agents/rules/frontend-angular.md) | `frontend/` (Angular & Material) | Legacy `NgModule` boilerplate; monolithic `SharedMaterialModule` defeating tree-shaking; `shared/` components injecting HTTP services; pricing logic embedded in templates; silent loading/error/empty states on API or currency failures. |

---

## 3. Core Governance Mechanisms

### A. Spec-Driven & Plan-First Workflow
* **Consult Specs First:** The agent must read `ai-workspace/01-specs/01-product-spec.md`, `02-api-contract.yaml`, and `03-data-model.md` before writing code so pricing formulas, `overage_policy` rules (`PROGRESSIVE` vs. `HARD_CAP`), and error codes stay aligned.
* **Human-in-the-Loop Approval:** Before implementing features or multi-file changes, the agent must present an explicit plan (target files, responsibilities, spec alignment, and test strategy) and wait for approval.

### B. Enforced Modularity (Preventing Monolithic Code)
* **Backend Layering:**
  * `app/routers/` handles HTTP transport, status codes, and `Depends()` injection only.
  * `app/domain/` contains pure, framework-agnostic business logic (tiered user/overage pricing, Spanish DNI/NIE/CIF validation, catalog definitions) with **zero FastAPI or SQLite imports**.
  * `app/services/` orchestrates validation, domain calculation, and repository calls.
  * `app/repositories/` & `app/db/` handle parameterized SQLite queries (`?`) and row mapping.
* **Frontend Unidirectional Dependencies:**
  * `features/` (routed smart containers + feature views) $\rightarrow$ imports from `core/` and `shared/`.
  * `shared/` (stateless presentational components using `input()` / `output()` and `OnPush`) $\rightarrow$ pure models/pipes only; **forbidden from injecting `core/services/` HTTP clients**.
  * `core/` (singleton API services, `CurrencyExchangeService` with `localStorage` fallback, pure `pricing-calculator.ts`) $\rightarrow$ never imports from `features/` or `shared/`.
  * **Component Size & Material Tree-Shaking:** Components target `< 150` lines of TypeScript and import only the exact Angular Material standalone modules they render.

### C. Precision, Resilience & Language Discipline
* **Financial Precision:** EUR values are computed and persisted exclusively as integer cents (`*_cents`) with tax rates in basis points (`tax_rate_bps`) using `Decimal` (`ROUND_HALF_UP`).
* **UI Resilience:** All async views use a discriminated `AsyncState<T>` (`loading`, `success`, `empty`, `error`), and the currency selector implements the 4-state fallback flow (`loading`, `live`, `cached_fallback`, `offline_eur_only`) against `open.er-api.com`.
* **Clear Language Boundary:** All code, identifiers, schemas, DB columns, API contracts, and Git commits are written in **English**; **Spanish** is reserved strictly for `01-product-spec.md` and end-user-facing UI labels, tooltips, and validation/error messages.

