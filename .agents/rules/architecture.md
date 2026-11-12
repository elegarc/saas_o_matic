---
trigger: always_on
description: General project workflow, architectural principles, modularity, and Spanish language rules applied across all areas of SaaS-O-Matic.
---

# Reglas Generales de Arquitectura y Forma de Trabajo (SaaS-O-Matic)

These rules apply unconditionally to **all areas** of the repository (backend, frontend, database, documentation, and tooling).

## 1. Spec-Driven Development (Desarrollo Guiado por Especificaciones)
* **Always consult the specs first:** Before generating, refactoring, or modifying any code, read `ai-workspace/01-specs/01-product-spec.md` (as well as `ai-workspace/01-specs/02-api-contract.yaml` and `ai-workspace/01-specs/03-data-model.md`).
* **Specs are the source of truth:** Do not invent business rules, endpoints, pricing formulas, or database fields outside the specification. If a requirement changes, update the files in `ai-workspace/01-specs/` first and obtain approval before changing implementation code.

## 2. Planning Before Execution (Planificación Previa)
* **Plan first, code second:** For every new feature, architectural change, or multi-file modification, produce a concise implementation plan detailing:
  * Files to create or modify and their responsibilities.
  * Alignment with `01-specs/01-product-spec.md` and API/data contracts.
  * Verification / test strategy.
* **Wait for user approval** before writing or modifying implementation files.

## 3. Modularity & Single Responsibility (Arquitectura Modular y SRP)
* **Single Responsibility Principle:** Every module, class, service, router, repository, and UI component must have one clear, cohesive responsibility. Avoid monolithic files or "god" services/components.
* **Backend separation of concerns (Python / FastAPI / SQLite):**
  * **Routers / API layer:** HTTP request/response handling, status codes, and schema serialization only. No business math or raw SQL.
  * **Domain / Services layer:** Pure business logic (tiered pricing, progressive overage calculations, Spanish DNI/NIE/CIF validation, tax calculations). Must be unit-testable without HTTP or database dependencies.
  * **Persistence / Repository layer:** SQLite connections, parameterized queries, and row-to-domain mapping only.
* **Frontend separation of concerns (Angular):**
  * **Components:** Presentation and user interaction only; split smart/container views from reusable presentational cards/widgets.
  * **Services:** Dedicated services for backend HTTP communication, external exchange-rate API + cache/fallback state, and shared client-side pricing preview calculations.
  * **Models & Utilities:** Strongly typed interfaces and pure calculation/formatting helpers separated from component templates.

## 4. Language & Naming Conventions (Idioma)
* **Code, schemas, database, API, and commits in English:** All code, domain identifiers, variable names, function/method names, class names, module/file names, database tables/columns, API endpoints/schemas, comments, docstrings, and Git commit messages must be written in **English** (e.g., `customers`, `simulations`, `company_name`, `tax_id`, `active_users`, `calculate_users_cost()`, commit: `feat: implement Spanish CIF validator`), staying aligned with `02-api-contract.yaml` and `03-data-model.md`.
* **Spanish strictly for `01-product-spec.md` and User-Facing Strings:** `ai-workspace/01-specs/01-product-spec.md` and every string shown to the end user—UI labels, headings, buttons, placeholders, tooltips, status badges, currency/error banners, and user-facing validation/error messages—must be written in **Spanish**.

