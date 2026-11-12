
# Start plan to define the SPECS

Promt :

Act as a Software architect. Read [task.md](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/task.md) and @directory:.agents/rules before taking any action. 

Your goal for Step 1 is purely **Spec-Driven Development**—do NOT generate any backend or frontend application code yet.

1. **Gap & Ambiguity Analysis:** Identify all explicit requirements from the brief as well as implicit requirements needed for a complete, working system (such as inferred GET endpoints for the UI, how secondary simulation inputs behave, tax rates by country, Spanish tax ID validation edge cases, and external currency API failure handling).
2. **Specification Deliverables:** Propose a plan to create three specification files inside `ai-workspace/01-specs/`:
   - `01-product-spec.md`: Complete functional rules, tiered pricing algorithm, tax rules, validation logic, and edge cases (written in Spanish).
   - `02-api-contract.yaml`: OpenAPI 3.0 specification defining all request/response schemas, status codes, and endpoints.
   - `03-data-model.md`: SQLite database schema and a Mermaid ER diagram.

Present your implementation plan for these specification files and list any architectural assumptions you are making so I can review and approve them before you create the files.


# Response

Analyzed task.md:L1-113
Ran list .agents/rules files
Analyzed architecture.md
Analyzed backend-python.md
Analyzed frontend-angular.md
Ran list workspace directory structure
Ran check existing workspace file sizes

Before writing any specifications or code, I inspected [task.md](file:///d:/programming/saas_o_matic/saas_o_matic/task.md) and the files under `.agents/rules/`.

> [!NOTE]
> **Workspace State Observation:** All three files in `.agents/rules/` ([architecture.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/architecture.md), [backend-python.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/backend-python.md), and [frontend-angular.md](file:///d:/programming/saas_o_matic/saas_o_matic/.agents/rules/frontend-angular.md)) are currently **empty (0 bytes)**, and `ai-workspace/specs/` already contains three 0-byte placeholder files ([product-spec.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/specs/product-spec.md), [api-contract.yaml](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/specs/api-contract.yaml), [data-model.md](file:///d:/programming/saas_o_matic/saas_o_matic/ai-workspace/specs/data-model.md)). I have not created or modified any files yet.

---

## 1. Gap & Ambiguity Analysis

### A. Explicit Requirements (from [task.md](file:///d:/programming/saas_o_matic/saas_o_matic/task.md))
* **Backend & Persistence:** REST API backed by **SQLite**.
  * `POST /customers`: Registers corporate customer (`company_name`, `tax_id`, `contact_email`, `country`, `plan`).
  * **Spanish Tax ID Validation:** Strict algorithmic validation of DNI/NIF/CIF when `country == España`.
  * `POST /simulations`: Calculates and persists a usage simulation (`customer_id`, `active_users`, `storage_gb`, `estimated_api_calls`).
* **Tiered Pricing Algorithm (EUR base):**
  * Tier 1 (`0–10` users): `10 € / user`
  * Tier 2 (`11–50` users): `8 € / user`
  * Tier 3 (`> 50` users): `5 € / user`
  * Reference check: `15 users = (10 × 10 €) + (5 × 8 €) = 140 €` base cost, plus country-specific Tax/VAT.
* **Frontend Dashboard:**
  * Searchable dashboard (by company name or tax ID).
  * Responsive customer detail cards showing customer data and saved simulation history.
  * Interactive simulation form (slider/dynamic controls) showing real-time monthly cost projection across tiers.
  * Live multi-currency display (`EUR`, `USD`, `GBP`, etc.) using `https://open.er-api.com/v6/latest/EUR` (or similar), with robust loading/error handling.

### B. Implicit Requirements, Gaps & Ambiguities

| Area | Gap / Ambiguity in Brief | Proposed Architectural Resolution |
| :--- | :--- | :--- |
| **Inferred GET Endpoints** | Only `POST /customers` and `POST /simulations` are named, yet the UI needs search, customer cards, and simulation history. | Add `GET /customers` (supports `?q=` search by company name or normalized tax ID + pagination), `GET /customers/{id}` (customer details), `GET /customers/{id}/simulations` (ordered newest-first), `GET /countries` (tax/ISO metadata), and `GET /health`. |
| **Real-Time Slider vs. Persistence** | The slider must update projections in real time without spamming SQLite on every drag event. | Use a deterministic client-side pricing calculator mirroring the backend formula for instant 60fps slider feedback (optionally backed by `POST /simulations/preview` if server validation is desired), and call `POST /simulations` only on explicit "Save Simulation" submission. |
| **Secondary Inputs (`storage`, `api_calls`, `plan`)** | `task.md` specifies exact pricing only for `active_users`, giving no rates or quotas for `plan`, `storage_gb`, or `estimated_api_calls`. Moreover, `15 users` must yield `140 €`. | Treat user-tier pricing as the canonical base formula (`15 users = 140 €`) with **plan-included quotas** or **zero default surcharge** (e.g., `Starter` / `Pro` / `Enterprise` define commercial tier & soft quotas for storage/API calls, or documented optional overage only above free thresholds—preserving `140 €` for standard simulations). *Needs confirmation below.* |
| **Pricing Edge Cases** | Unclear if `0` users is valid ("0 a 10 usuarios"), max bounds, and rounding rules. | Require `active_users >= 1` (or allow `0` = `0.00 €`; integer only), `storage_gb >= 0`, `estimated_api_calls >= 0`. Compute all monetary math in integer cents or `Decimal` with `ROUND_HALF_UP` to 2 decimal places (`EUR`). |
| **Tax / VAT Rules by Country** | No country catalog or VAT/Tax table is provided. | Standardize on ISO 3166-1 alpha-2 codes (`ES`: 21%, `PT`: 23%, `FR`: 20%, `DE`: 19%, `IT`: 22%, `GB`: 20%, `NL`: 21%, `US`: 0%, plus `OTHER` / configurable table). Persist `tax_rate_applied`, `base_cost_eur`, `tax_amount_eur`, and `total_cost_eur` as immutable snapshots on each simulation row. |
| **Spanish Tax ID Edge Cases** | Corporate clients use **CIF** more often than personal **DNI/NIE**, and inputs often contain spaces, hyphens, or lowercase letters. | Normalize before validation/storage (trim, uppercase, strip `-`/spaces). Implement full official checks for: **DNI** (8 digits + Mod-23 letter), **NIE** (`X/Y/Z` + 7 digits + Mod-23 letter), and **CIF** (org prefix + 7 digits + even/odd weighted Luhn-like control digit/letter rules distinguishing numeric-only `ABEH`, letter-only `KPQSNWR`, and dual `CDFGJUV` prefixes). For `country != ES`, validate non-empty alphanumeric format (`5–20` chars). Enforce uniqueness on normalized `(country, tax_id)` returning `409 Conflict`. |
| **External Currency API Failures** | `open.er-api.com` may time out, rate-limit, be offline, or return unexpected payloads. | Keep `EUR` (`1.0`) immediately usable on boot. Fetch rates asynchronously in the frontend with timeout (e.g., 5s), cache valid rates in `localStorage` with `fetched_at` / `next_update` TTL. On failure: (1) fall back to cached rates with a visible stale-rate warning banner, or (2) if no cache exists, lock display to `EUR` with a retry action and error banner so quotes are never silently wrong. |

---

## 2. Implementation Plan for `ai-workspace/01-specs/`

Once approved, I will create the following three specification files in `ai-workspace/01-specs/`:

### 1. `ai-workspace/01-specs/01-product-spec.md` *(in Spanish)*
* **Visión general y glosario:** Propósito de SaaS-O-Matic, moneda canónica (`EUR`) y flujo comercial.
* **Reglas de negocio y algoritmo de tramos:** Fórmula matemática por tramos (`0–10`, `11–50`, `>50`), tabla de ejemplo paso a paso (`0`, `1`, `10`, `11`, `15`, `50`, `51` usuarios), tratamiento de `plan`, `storage_gb` y `estimated_api_calls`, y reglas de redondeo (`ROUND_HALF_UP`, 2 decimales).
* **Tabla de países e impuestos (IVA/Tax):** Códigos ISO, porcentajes de IVA, e inmutabilidad histórica de simulaciones guardadas.
* **Validación algorítmica de Identificador Fiscal:**
  * Normalización de entrada y unicidad (`409 Conflict`).
  * Algoritmo completo paso a paso para **DNI**, **NIE** y **CIF** (con tablas de letras de control y prefijos obligatorios de dígito vs. letra).
  * Validación sintáctica para países no españoles y reglas de email/campos obligatorios.
* **Comportamiento del Frontend y resiliencia multi-divisa:** Vistas (`Buscador/Dashboard`, `Detalle de Cliente`, `Simulador Interactivo`), gestión de estados `loading / cached / error` frente a `open.er-api.com`, y criterios de aceptación verificables.

### 2. `ai-workspace/01-specs/02-api-contract.yaml` *(OpenAPI 3.0.3)*
* **Metadata & Servers:** API v1 spec with standard JSON problem/error schemas (`400`, `404`, `409`, `422`, `500`).
* **Endpoints:**
  * `GET /health` — liveness & DB connectivity check.
  * `GET /countries` — supported country codes, names, and tax rates.
  * `GET /customers` — search (`q` matching company name or normalized tax ID), `limit`, `offset`, total count.
  * `POST /customers` — create corporate customer with strict validation (`201 Created`, `409` on duplicate `tax_id`, `422` on invalid Spanish DNI/NIF/CIF or fields).
  * `GET /customers/{customer_id}` — customer detail (`404` if missing).
  * `GET /customers/{customer_id}/simulations` — simulation history ordered by `created_at DESC`.
  * `POST /simulations` — server-side tiered calculation + country tax snapshot + persistence (`201 Created`, `404` if `customer_id` unknown, `422` on out-of-range inputs).
* **Schemas & Examples:** Concrete payloads (including the `15 users -> 140.00 EUR` base example and CIF validation error response).

### 3. `ai-workspace/01-specs/03-data-model.md`
* **Mermaid ER Diagram (`erDiagram`):** Entities `customers` and `simulations` (plus reference note on `country_tax_rates` config/table), cardinality (`1:N`), primary/foreign keys, and snapshot attributes.
* **SQLite DDL & Constraints:**
  * `PRAGMA foreign_keys = ON;`
  * `customers` table (`id` UUID/TEXT or INTEGER PK, `company_name`, `tax_id` normalized + indexed/unique, `contact_email`, `country_code` ISO-2, `plan` CHECK constraint, `created_at` ISO-8601 UTC).
  * `simulations` table (`id` PK, `customer_id` FK with `ON DELETE CASCADE`, `active_users`, `storage_gb`, `estimated_api_calls`, `base_cost_eur`, `tax_rate_percent`, `tax_amount_eur`, `total_cost_eur`, `tier_breakdown_json` optional/auditability, `created_at`).
  * **Indexes:** Search/lookup indexes on `customers(company_name)`, `customers(tax_id)` (UNIQUE), and `simulations(customer_id, created_at DESC)`.
  * **Monetary Storage Decision:** Store EUR amounts in `INTEGER` cents (`*_cents`) or `NUMERIC` with documented conversion, eliminating SQLite floating-point inaccuracies.

---

## 3. Architectural Assumptions for Your Review & Approval

Please review these assumptions before I generate the files in `ai-workspace/01-specs/`:

1. **Tech Stack:** Based on the filenames in `.agents/rules/`, I assume **Python (FastAPI + SQLite)** for the backend and **Angular** for the frontend. (Even though the spec files are language-agnostic, this informs conventions like snake_case vs camelCase or decimal handling—I plan to use `snake_case` in the REST JSON & SQLite schema per Python/REST conventions unless you prefer `camelCase`.)
2. **Directory Location (`ai-workspace/01-specs/` vs `ai-workspace/specs/`):** I will create the three files inside `ai-workspace/01-specs/` (`01-product-spec.md`, `02-api-contract.yaml`, `03-data-model.md`) as requested. Should I also remove the empty 0-byte placeholders in `ai-workspace/specs/`?
3. **Pricing of `plan`, `storage_gb`, and `estimated_api_calls`:** Should `storage_gb`, `estimated_api_calls`, and `plan` act as **metadata/included-quota tracking without extra cost** (keeping `15 users = 140.00 €` exact regardless of storage/API values), or do you want explicit overage unit prices above a free threshold (e.g., `100 GB` and `100,000` calls free, then overage)?
4. **Minimum `active_users`:** Is `active_users = 0` permitted (`0.00 €` base cost), or should the minimum be `1`?
5. **Spanish Tax ID Scope:** Confirm that "España" accepts **DNI, NIE, and CIF** (crucial since customers are corporate entities), while non-Spanish countries use generic format validation (`5–20` alphanumeric chars).
6. **Monetary Representation in SQLite & API:** Store amounts in **integer cents** in SQLite (`base_cost_cents`, `tax_amount_cents`, `total_cost_cents`) and expose decimal EUR numbers/strings (2 decimal places) in the OpenAPI contract, with canonical `EUR` as the only persisted currency.

Once you confirm or adjust these points, I will write the three specification files in `ai-workspace/01-specs/`.

# Requirements clarification 
1. The stack to be used is Python with FastAPI and SQLite for the Backend and Angular for the Frontend.
2. yes, remove the empty files that are in ai-worspace/specs
3. I want to stablish a thresholds in the storage and estimated api calls. There should be a plan with a fixed rate that includes 25GB of storage and 100.000 api calls. Final price = Plan + Users price + Extra cost from extra extorage and api calls. The plan should include an option to either make the extra costs progressive so the comercial will pay more or keep the plan as it is and not allow extra storage or api calls once limits are reached
4.The minimum active users should be 0. The costs will not be 0 because of the price of the plan
5. Spain accepts DNI, NIE and CIF
6. yes, euros should be the only currency value stored in the databse
