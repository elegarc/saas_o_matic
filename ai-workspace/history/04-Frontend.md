# PROMT

Create an implementation plan for the Angular fronted.
Follow the specifications [01-product-spec.md](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/01-product-spec.md)  and [02-api-contract.yaml](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/01-specs/02-api-contract.yaml)  and the architecture guidelines in [agent-guidelines.md](file;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/02-architecture/agent-guidelines.md) 

Provide an Angular implementation plan that includes: 
- exact npm install or ng add commands for all dependencies, 
- file-by-file component/service architecture, 
- tests and specifications
- ng build and deployment steps.
- documentation update
Include designs in the implementation plan with the goal of having a first input to validate before implementing the plan. 
Ask me about design decissions. The look should be clean and modern, use neutral colors , only light team. Avoid excesive animationd and gradients.
Ask me if some details are unclear.

# RESPONSE

Implementation plan, is modified with the next promt.

5. Design Decisions for Your Validation

Before we begin generating code, please confirm or share your preference on the following points:

Customer Registration Flow:
Option A (Recommended): An Angular Material Dialog (MatDialog) modal that opens over the dashboard when clicking + Nuevo Cliente. This keeps the commercial user in their search context.
Option B: A dedicated route /customers/new.
Simulation Studio Placement:
Option A (Recommended - Split screen): Navigating to /customers/:id displays customer metadata at the top, followed by a two-column view (left: sliders & inputs, right: sticky live billing summary card), and the simulation history table below.
Option B: A tabbed interface ([ Simulador ] | [ Historial de Simulaciones ] | [ Datos del Cliente ]).
Primary Accent Color:
Option A (Recommended): Royal Blue / Azure (#2563EB) — standard for modern B2B SaaS, giving clear interactive contrast for sliders and CTAs.
Option B: Deep Slate / Monochrome (#0F172A) — ultra-neutral and restrained.
Slider Range Limits:
Proposed slider default ranges:
Users: 0 to 200 (with numeric input allowing typing up to 100.000).
Storage: 0 to 500 GB (with numeric input up to 100.000 GB).
API Calls: 0 to 2.000.000 (with numeric input up to 100.000.000).
Does this range fit your expectations?

# PROMT
[frontend-implementation-plan.md#L109-109](fileLineRange;file:///d%3A/programming/saas_o_matic/saas_o_matic/ai-workspace/03-plans/frontend-implementation-plan.md#L109-109) The button shuld be Guardar, it is not relevant for the user where or how the simulation is going to be stored.
1. option A, if the user wants to close the dialog and he has input data, it should ask the user to be sure that he wants to close the dialog.
2. option A, add some links at the top so the user can navigate fast to a section
3. A
4. Users shoudl be from 0 to 150, add also a numeric text input so there could be more users, maximum 500.
Change the implementation plan accordingly

# RESPONSE

I have updated the implementation plan in frontend-implementation-plan.md with all your decisions:

Summary of Incorporated Decisions
Button Text: Changed from "Guardar Simulación en SQLite" to simply "Guardar" (clean, user-focused, and agnostic of internal database details).
Customer Registration Modal (customer-create-dialog):
Implemented as an Angular Material MatDialog over the dashboard.
Unsaved Changes Guard: If the form has been edited (form.dirty) and the user attempts to close the dialog (clicking backdrop, pressing Escape, or clicking Cancelar), a ConfirmDialogComponent prompt intercepts:

"¿Desea salir sin guardar los cambios? Los datos introducidos en el formulario se perderán."
Options: [ Continuar editando ] | [ Descartar y salir ]

Customer Detail Quick Navigation:
Added top anchor jump links with smooth scrolling to quickly access sections on /customers/:id: [ ⚙️ Configuración de Consumo ] (#configuracion), [ 💳 Resumen de Facturación ] (#resumen), and [ 📜 Historial de Simulaciones ] (#historial).
Primary Theme Accent: Royal Blue / Azure (#2563EB) configured for active interactive elements, buttons, and slider tracks on a neutral light background (#F8FAFC canvas, #FFFFFF cards, #E2E8F0 borders).
Users Input Controls:
mat-slider range configured from 0 to 150 for immediate dragging.
Paired numeric text matInput allows typing exact values up to 500 users maximum.
# PROMT
proceed with the implementation. I have just installed node

# RESPONSE

Completed full frontend implementation, test verification, and documentation:

## 1. Scaffold & Dependencies
- Initialized Angular 19 standalone project under `frontend/`.
- Configured routing, SCSS styling, and Angular Material dependencies (`@angular/material`, `@angular/cdk`, `@angular/animations`).
- Configured reverse proxy (`proxy.conf.json`) mapping `/api` to `http://localhost:8000`.

## 2. Core Architecture Implemented
- **Models (`core/models/`):** Strongly typed models aligned 1:1 with OpenAPI spec (`catalog.model.ts`, `customer.model.ts`, `simulation.model.ts`, `currency.model.ts`, `async-state.model.ts`, `api-error.model.ts`).
- **Domain Utilities (`core/utils/`):** Pure, framework-agnostic client calculation logic mirroring backend rules for instantaneous 60fps preview (`pricing-calculator.ts`, `currency-formatter.ts`).
- **Services (`core/services/`):**
  - Backend API clients (`catalog-api.service.ts`, `customer-api.service.ts`, `simulation-api.service.ts`).
  - Resilient `CurrencyExchangeService` with 4 states (`loading`, `live`, `cached_fallback`, `offline_eur_only`), 5-second timeout, and localStorage caching.
- **Interceptors (`core/interceptors/`):** `api-error.interceptor.ts` normalizing backend errors into Spanish user messages.

## 3. Shared Components & Pipes
- `CurrencyConvertPipe` and `TaxIdFormatPipe`.
- `LoadingStateComponent`, `EmptyStateComponent`, `StatusBannerComponent`, `CurrencySelectorComponent`, `CostBreakdownCardComponent`, and `ConfirmDialogComponent`.

## 4. Feature Views
- **Customer Dashboard (`features/customers/customer-dashboard`):** Real-time debounced search, responsive grid cards, loading/empty/error states, quick action to open registration modal.
- **Customer Registration Dialog (`features/customers/customer-create-dialog`):** MatDialog modal with live Spanish CIF/DNI/NIE checksum validation, country selector, and dirty-form discard confirmation guard.
- **Simulation Studio (`features/simulations/simulation-studio`):** Interactive sliders (Users 0-150 with input up to 500, storage, API calls), policy toggle (`PROGRESSIVE` vs `HARD_CAP`), live quota badges, 60fps price preview, and "Guardar" persistence button.
- **Customer Detail & History (`features/customers/customer-detail`):** Customer profile header, quick anchor jump links (`#configuracion`, `#resumen`, `#historial`), embedded simulation studio, and responsive simulation history table with tax breakdown.

## 5. Verification & Tests
- **Frontend Unit Tests:** 27/27 Karma + Jasmine specs passing (pricing calculator boundary checks, currency exchange fallback states, pipes, and component rendering).
- **Frontend Production Build:** `npm run build` completed with 0 errors/warnings, producing optimized lazy-loaded bundles under `frontend/dist/frontend/`.
- **Backend Unit & Integration Tests:** 57/57 pytest tests passing, `ruff check .` clean.
- **Documentation:** Updated `README.md` with complete installation, execution, test, and build guides.


# PROMT

Prepare an implementation plan for the following frontend changes :
- check the icon alignment in the buttons, some icons are not correcly aligned
- add some paading to the input to choose the divisa
- in http://localhost:4200/customers, if the user clicks in the customer it should open a screen with the customer details and the historic of simulations. 
- in the customer view, propose different ways of accesing to the simulation part, currently is all in the same screen and it's not clear to the user how to use it
- Remove the top bottons in the customer view Configuracion, Resumend and Historial
- Replace Historial de Simulaciones Guardadas por Historial de Simulaciones