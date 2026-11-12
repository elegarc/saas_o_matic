---
trigger: always_on
description: Angular standalone architecture, Angular Material UI standards, core/features/shared structure, UI state handling, and code quality rules for the SaaS-O-Matic frontend.
---

# Frontend Rules: Angular & Angular Material (SaaS-O-Matic)

These rules apply to all Angular code under `frontend/` and complement `.agents/rules/architecture.md`.

## 1. Standalone Architecture & Modern Angular
* **Standalone Everywhere:** All components, directives, and pipes must be `standalone: true` (Angular 17+ default). Do **not** create `NgModule`s.
* **Functional Configuration:** Configure routing (`provideRouter`), HTTP (`provideHttpClient(withInterceptors([...]))`), and animations (`provideAnimationsAsync()`) in `app.config.ts`.
* **Modern Control Flow:** Use built-in template control flow (`@if`, `@for` with explicit `track`, `@switch`) instead of legacy `*ngIf` / `*ngFor`.
* **Consistent Dependency Management:** Always use `inject(...)` (rather than constructor parameter injection) for services, `NonNullableFormBuilder`, `DestroyRef`, and `ActivatedRoute`, assigned to `private readonly` fields.

## 2. Clean Structure (`core/`, `features/`, `shared/`)
Organize `frontend/src/app/` with strict unidirectional dependencies:

* `core/`: Application-wide singletons (`providedIn: 'root'`), data models, and pure domain helpers.
  * `core/models/`: TypeScript interfaces & enums matching `ai-workspace/01-specs/02-api-contract.yaml` (`Customer`, `Simulation`, `PlanInfo`, `CountryInfo`, `ErrorResponse`).
  * `core/services/`:
    * Backend HTTP clients (`CustomerApiService`, `SimulationApiService`, `CatalogApiService`).
    * `CurrencyExchangeService`: Fetches `https://open.er-api.com/v6/latest/EUR` with `5000 ms` timeout, `localStorage` caching, and fallback state management.
  * `core/interceptors/`: Functional HTTP error normalization interceptor mapping backend `ErrorResponse` into Spanish UI error messages.
  * `core/utils/`: Pure, framework-free functions (`pricing-calculator.ts`, `currency-formatter.ts`) mirroring `01-product-spec.md` for instant slider previews.
* `features/`: Routed feature slices split into **smart (container)** and **presentational (dumb)** components:
  * `features/customers/`: Dashboard & debounced search (`customer-dashboard`), customer registration form (`customer-create`), and customer detail view with simulation history (`customer-detail`).
  * `features/simulations/`: Interactive simulation builder (`simulation-form`) with Material slider (`mat-slider`), storage/API threshold indicators, `PROGRESSIVE` vs `HARD_CAP` guardrails, and live multi-currency breakdown.
* `shared/`: Reusable, stateless UI building blocks (`StatusBannerComponent`, `LoadingStateComponent`, `EmptyStateComponent`, `CurrencySelectorComponent`, `CostBreakdownCardComponent`, custom pipes).
  * **Strict Boundary Rule:** `shared/` components must **never** inject HTTP/API services from `core/services/`—they receive data via `input()` and emit events via `output()`.
  * **Dependency Direction:** `features/` $\rightarrow$ `core/` & `shared/`; `shared/` $\rightarrow$ pure models/pipes only; `core/` $\rightarrow$ never imports from `features/` or `shared/`.

## 3. Angular Material Standards
* **Direct Standalone Imports:** Import only the specific Material modules each standalone component uses (e.g., `MatCardModule`, `MatButtonModule`, `MatFormFieldModule`, `MatInputModule`, `MatSelectModule`, `MatSliderModule`, `MatProgressSpinnerModule`, `MatIconModule`, `MatChipsModule`)—never create a monolithic `SharedMaterialModule` that defeats tree-shaking.
* **Consistent Theme & Layout:** Configure one Material theme (e.g., Azure/Blue or Indigo/Teal custom M3/M2 palette in `styles.scss`), use responsive CSS Grid/Flexbox around `mat-card`s, and pair `mat-form-field` inputs with explicit `mat-error` messages in Spanish.
* **Interactive Controls:** Use `mat-slider` paired with numeric `matInput` for `active_users` (and storage/API controls) so commercial users can both drag smoothly and type exact numbers.

## 4. Explicit UI State Handling (Loading, Error & Empty)
* **No Blank or Silent States:** Every asynchronous data view and external API call must explicitly handle and render:
  1. **Loading:** `mat-spinner` / `mat-progress-bar` (`LoadingStateComponent`) with a Spanish label (e.g., `"Cargando clientes..."`).
  2. **Empty:** Clear empty-state card (`EmptyStateComponent`, e.g., `"No se encontraron clientes"`) with a primary `mat-raised-button` action.
  3. **Error:** Non-destructive warning/error banner (`StatusBannerComponent`) showing the Spanish message and a **Reintentar** button when recoverable.
* **Uniform State Model:** Model async views with a consistent discriminated state (`AsyncState<T>` with `'loading' | 'success' | 'empty' | 'error'`) using Signals (`signal`, `computed`).
* **External Currency API States:** Implement the 4 states defined in `01-product-spec.md` (`loading`, `live`, `cached_fallback`, `offline_eur_only`) so `EUR` remains immediately usable even when `open.er-api.com` fails or times out.

## 5. Code Quality, Maintainability & Reusability
* **Small, Single-Purpose Components:** Keep components focused and concise (aim for `< 150` lines of TypeScript per component). Extract repeated cards, tier breakdown rows, and banners into reusable child or `shared/` components.
* **No Business Math in Templates:** Keep templates declarative. Tiered pricing, overage calculations, and currency conversions must live in `core/utils/` or `core/services/` and be unit-tested independently.
* **Performance & Reactivity:** Use `ChangeDetectionStrategy.OnPush` on all components, prefer Angular Signals (`signal`, `computed`, `input`, `output`) for reactive UI state, and use `takeUntilDestroyed()` for any RxJS subscriptions (like search input debouncing).
* **Typed Reactive Forms:** Use Angular `NonNullableFormBuilder` / typed `FormGroup` with explicit Spanish validation feedback aligned with `01-product-spec.md`.
* **Responsive Design & Language:** Mobile-first responsive cards/grid layout. All code, identifiers, filenames, and comments in **English**; all visible UI labels, buttons, placeholders, tooltips, and validation/error messages in **Spanish**.

