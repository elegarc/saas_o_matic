# Frontend Implementation Plan — SaaS-O-Matic (Angular & Angular Material)

> **Specs Referenced:**
> * [01-product-spec.md](../01-specs/01-product-spec.md)
> * [02-api-contract.yaml](../01-specs/02-api-contract.yaml)
> * [agent-guidelines.md](../02-architecture/agent-guidelines.md)
> * [architecture.md](../../.agents/rules/architecture.md)
> * [frontend-angular.md](../../.agents/rules/frontend-angular.md)

---

## 1. Environment Preparation & Tooling

### Prerequisites
* **Node.js LTS (v20.x or v22.x)** & **npm (v10.x+)**
* Install Node.js on Windows (if not present on PATH):
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
  Verify in PowerShell:
  ```powershell
  node --version   # v20.x.x or v22.x.x
  npm --version    # 10.x.x
  ```

### CLI & Workspace Initialization
From project root (`d:\programming\saas_o_matic\saas_o_matic`):
```powershell
# 1. Scaffold standalone Angular 19 application
npx -p @angular/cli@19 ng new frontend --routing --style=scss --ssr=false --standalone=true --skip-git=true --package-manager=npm

# 2. Add Angular Material (Light theme, typography, animations)
cd frontend
npx ng add @angular/material --theme=azure-blue --typography=true --animations=include
```

---

## 2. Visual Design & UI Specifications (Neutral Light Theme)

### 2.1. Design Language & Color Palette
* **Theme:** Light theme exclusively, modern B2B SaaS aesthetic.
* **Canvas / Background:** `#F8FAFC` (Slate 50)
* **Surface / Cards:** `#FFFFFF` with fine borders (`1px solid #E2E8F0`) and subtle elevation (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05)`).
* **Typography:** System font stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`) in `#0F172A` (Slate 900) for headings, `#475569` (Slate 600) for body, `#94A3B8` for subtle captions.
* **Primary Accent:** `#2563EB` (Royal Blue / Azure) or `#0F172A` (Neutral Slate) for primary CTAs and active slider tracks.
* **Semantic Accents:**
  * Success / Live rate: `#16A34A` (Emerald 600 badge)
  * Warning / Cached rate: `#D97706` (Amber 600 banner)
  * Error / Offline: `#DC2626` (Red 600 banner)
  * Quota / Over-limit: `#EA580C` (Orange 600 threshold tag)
* **Visual Polish:** Zero heavy gradients; no bounce animations; clean 4px/8px border-radius; high contrast and crisp typography.

---

### 2.2. Layout Wireframes

#### Global Topbar
```text
+-------------------------------------------------------------------------------------------------------+
|  [SaaS-O-Matic Logo]  SaaS-O-Matic  |  Simulador de Suscripciones      [Tasa: Live *] [EUR / USD v]   |
+-------------------------------------------------------------------------------------------------------+
|  [Dashboard Clientes]    [+ Nuevo Cliente]                                                            |
+-------------------------------------------------------------------------------------------------------+
```

#### View 1: Customer Dashboard & Search (`/customers`)
```text
+-------------------------------------------------------------------------------------------------------+
|  Clientes Corporativos                                                                                |
|  Gestione sus cuentas corporativas y acceda a su historial de simulaciones comerciales.              |
|                                                                                                       |
|  [ Icon | Buscar por nombre de empresa o identificador fiscal (CIF/NIF/DNI)...               ] [x]   |
|                                                                                                       |
|  +-----------------------------------+  +-----------------------------------+  +--------------------+ |
|  | ACME IBERIA S.L.             [ES] |  | TECH SOLUTIONS BV            [NL] |  | ...                | |
|  | CIF: B58818501                    |  | Tax ID: NL123456789B01            |  |                    | |
|  | Plan: STARTER (29 €/mes)          |  | Plan: PRO (79 €/mes)              |  |                    | |
|  | Excedentes: Progresivo            |  | Excedentes: Bloqueo estricto      |  |                    | |
|  | Contacto: billing@acme.es         |  | Contacto: ops@techsolutions.nl    |  |                    | |
|  |                                   |  |                                   |  |                    | |
|  | [ Ver Detalle & Simular -> ]      |  | [ Ver Detalle & Simular -> ]      |  |                    | |
|  +-----------------------------------+  +-----------------------------------+  +--------------------+ |
|                                                                                                       |
|  [ < Anterior ]  Mostrando 1-10 de 24 clientes  [ Siguiente > ]                                       |
+-------------------------------------------------------------------------------------------------------+
```

#### View 2: Customer Detail & Simulation Studio (`/customers/:id`)
```text
+-------------------------------------------------------------------------------------------------------+
|  <- Volver al Dashboard    ACME IBERIA S.L.  |  CIF: B58818501  |  España (IVA 21%)  |  Plan: STARTER  |
|  Secciones rápidas: [ ⚙️ Configuración ]   [ 💳 Resumen de Facturación ]   [ 📜 Historial ]           |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  +-------------------------------------------------------+  +---------------------------------------+ |
|  | ⚙️ 1. CONFIGURACIÓN DE CONSUMO (#configuracion)        |  | 💳 RESUMEN DE FACTURACIÓN (#resumen)  | |
|  |                                                       |  | Divisa: [ EUR v ] (1 EUR = 1.0000)    | |
|  | Usuarios Activos:                                     |  |                                       | |
|  | [===========O-----------------------]  [ 15 ] usrs    |  | Cuota Plan (STARTER):        29,00 EUR| |
|  | (Slider: 0 - 150 | Input numérico: hasta 500 máx)     |  | Usuarios (15 activos):      140,00 EUR| |
|  | * Tramo 1 (1-10):  10 usuarios x 10 € = 100,00 €      |  | Exceso Almacenamiento:        0,00 EUR| |
|  | * Tramo 2 (11-50):  5 usuarios x  8 € =  40,00 €      |  | Exceso Llamadas API:          0,00 EUR| |
|  | * Tramo 3 (>50):    0 usuarios x  5 € =   0,00 €      |  | ------------------------------------- | |
|  |                                                       |  | Subtotal neto:              169,00 EUR| |
|  | Almacenamiento Contratado:                            |  | IVA / Impuestos (21%):       35,49 EUR| |
|  | [=======O-----------------------------]  [ 20 ] GB    |  | ===================================== | |
|  | [✓ Incluido en plan: 25 GB | 0 GB extra]              |  | TOTAL ESTIMADO:             204,49 EUR| |
|  |                                                       |  | (Equivalente en USD:        $ 218.80) | |
|  | Llamadas API Estimadas / mes:                         |  |                                       | |
|  | [=====O-------------------------------]  [ 80.000 ]   |  | [ Guardar ]                           | |
|  | [✓ Incluido en plan: 100.000 | 0 llamadas extra]      |  +---------------------------------------+ |
|  |                                                       |                                            |
|  | Política de Excedentes:                               |                                            |
|  | (•) Progresiva (tarificación gradual)                 |                                            |
|  | ( ) Bloqueo estricto (HARD_CAP)                       |                                            |
|  +-------------------------------------------------------+                                            |
|                                                                                                       |
|  +--------------------------------------------------------------------------------------------------+ |
|  | 📜 HISTORIAL DE SIMULACIONES GUARDADAS (#historial)                                               | |
|  | Fecha                | Plan    | Usuarios | Storage | API Calls | Subtotal | IVA    | Total EUR  | |
|  | --------------------+---------+----------+---------+-----------+----------+--------+----------- | |
|  | 13/11/2026 12:15 UTC | STARTER | 15       | 20 GB   | 80.000    | 169,00 € | 35,49 €| 204,49 €   | |
|  | 13/11/2026 11:30 UTC | STARTER | 85       | 85 GB   | 250.000   | 574,00 € |120,54 €| 694,54 €   | |
|  +--------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. Modular File Architecture (`frontend/src/app/`)

```text
frontend/src/app/
├── app.config.ts                     # provideRouter, provideHttpClient, provideAnimationsAsync
├── app.routes.ts                     # Customers list, Customer detail/simulator, redirect to /customers
├── app.component.ts                  # App shell, Navbar with CurrencySelector & Live Rate indicator
├── app.component.html
├── app.component.scss
│
├── core/
│   ├── models/
│   │   ├── customer.model.ts         # Customer, CustomerCreateRequest, CustomerListResponse
│   │   ├── simulation.model.ts       # Simulation, SimulationCreateRequest, SimulationBreakdown
│   │   ├── catalog.model.ts          # PlanInfo, CountryInfo, PlanCode, OveragePolicy
│   │   ├── currency.model.ts         # ExchangeRatesResponse, CurrencyState ('loading'|'live'|'cached'|'offline')
│   │   ├── async-state.model.ts      # AsyncState<T> discriminated union
│   │   └── api-error.model.ts        # ErrorResponse interface
│   ├── services/
│   │   ├── customer-api.service.ts   # GET /customers, POST /customers, GET /customers/:id
│   │   ├── simulation-api.service.ts # POST /simulations, GET /customers/:id/simulations
│   │   ├── catalog-api.service.ts    # GET /countries, GET /plans
│   │   └── currency-exchange.service.ts # open.er-api.com client with localStorage TTL & 4-state fallback
│   ├── interceptors/
│   │   └── api-error.interceptor.ts  # Normalizes HTTP errors into Spanish user messages
│   └── utils/
│       ├── pricing-calculator.ts     # Pure deterministic function matching 01-product-spec.md for 60fps sliders
│       └── currency-formatter.ts     # Multi-currency formatting helper (EUR, USD, GBP, etc.)
│
├── shared/                           # Stateless presentational components (NO HTTP services injected)
│   ├── components/
│   │   ├── currency-selector/        # Currency picker with status pill ('En vivo', 'Caché', 'Offline')
│   │   ├── status-banner/            # Non-destructive warning/error banner with 'Reintentar' button
│   │   ├── loading-state/            # Centered mat-spinner with Spanish label
│   │   ├── empty-state/              # Clear empty-state card with icon and optional CTA
│   │   ├── cost-breakdown-card/      # Itemized cost breakdown card with converted currency display
│   │   └── confirm-dialog/           # Reusable confirmation modal for unsaved changes or critical actions
│   └── pipes/
│       ├── currency-convert.pipe.ts  # Formats EUR amount into selected currency based on active exchange rate
│       └── tax-id-format.pipe.ts     # Clean formatting for CIF/DNI/NIE
│
└── features/
    ├── customers/
    │   ├── customer-dashboard/       # Smart view: search input with debounce, customer cards grid, pagination
    │   ├── customer-create-dialog/   # Modal/dialog: Form with real-time Spanish DNI/NIE/CIF validation + dirty guard
    │   └── customer-detail/          # Smart view: Customer header with quick anchor navigation + simulation studio
    └── simulations/
        └── simulation-studio/        # Sliders (0-150) + numeric input (up to 500), quota indicators, live preview & 'Guardar'
```

---

## 4. Key Implementation Details

### 4.1. Currency Exchange Service (`CurrencyExchangeService`)
* **Endpoint:** `https://open.er-api.com/v6/latest/EUR` with `timeout(5000)`.
* **State Management via Signals:**
  * `activeCurrency = signal<string>('EUR')`
  * `exchangeRates = signal<Record<string, number>>({ EUR: 1.0 })`
  * `currencyState = signal<CurrencyState>('loading')`
  * `lastUpdated = signal<Date | null>(null)`
* **Fallback Strategy:**
  1. Boot immediately with `EUR` (`1.0`) so the UI is instantly interactive.
  2. If network request succeeds $\rightarrow$ update signals to `'live'`, persist to `localStorage` (`saas_rates_cache`).
  3. If network fails and cache exists $\rightarrow$ load cache, set state to `'cached_fallback'` and surface non-blocking warning banner.
  4. If network fails and no cache exists $\rightarrow$ lock selector to `EUR`, set state to `'offline_eur_only'` and show retry banner.

### 4.2. Instant Client-Side Preview vs. Backend Persist
* **Active Users Control:**
  * Interactive `mat-slider` with immediate drag range from `0` to `150` users.
  * Paired numeric `matInput` allowing commercial users to type exact numbers or simulate larger accounts up to **`500`** users maximum.
* **Storage & API Call Controls:**
  * `mat-slider` + numeric input paired with clear badges indicating plan-included quota (e.g. `25 GB` and `100.000` calls on Starter).
* **Guardrails (`HARD_CAP`):**
  * When `HARD_CAP` is active, storage and API sliders have `[max]="includedThreshold"`.
  * If a user manually types a higher number, an inline warning displays: *"Límite de plan alcanzado (HARD_CAP). Cambie a política Progresiva para permitir excesos."*
* **"Guardar" Button:**
  * Clean user action labeled simply **"Guardar"**.
  * Calls `SimulationApiService.createSimulation()`, persists to backend SQLite database, shows a non-intrusive Spanish toast notification (*"Simulación guardada correctamente"*), and immediately updates the history list with the new snapshot.

### 4.3. Customer Registration Modal & Unsaved Changes Guard
* **Dialog UX (`customer-create-dialog`):**
  * Opens via Angular Material `MatDialog` over the customer dashboard when clicking `+ Registrar Nuevo Cliente`.
  * Real-time algorithmic validation of Spanish DNI/NIE/CIF (with instant green/red status indicator).
* **Dirty Form Guard:**
  * If the form has been modified (`form.dirty`) and the user attempts to close the dialog (clicking the backdrop, pressing `Escape`, or clicking `Cancelar`), closure is intercepted:
  * A confirmation prompt (`ConfirmDialogComponent`) appears:
    > *"¿Desea salir sin guardar los cambios? Los datos introducidos en el formulario se perderán."*
    > Actions: `[ Continuar editando ]` | `[ Descartar y salir ]`

### 4.4. Fast Section Navigation Links in Customer Detail
* At the top of `/customers/:id`, anchor jump links allow fast navigation across long pages:
  * `[ ⚙️ Configuración de Consumo ]` $\rightarrow$ `#configuracion`
  * `[ 💳 Resumen de Facturación ]` $\rightarrow$ `#resumen`
  * `[ 📜 Historial de Simulaciones ]` $\rightarrow$ `#historial`
* Uses smooth native scrolling (`scroll-behavior: smooth`) for instant access without losing page state.

---

## 5. Testing & Verification Plan

### A. Unit Tests (`*.spec.ts`)
1. **`pricing-calculator.spec.ts`:**
   * User tier boundaries: `0`, `1`, `10`, `11`, `15` (exact `140.00 €` users cost), `50`, `51`.
   * Progressive storage overages: `0`, `25`, `26`, `85` (`33.00 €` extra).
   * Progressive API call overages: `100k`, `101k`, `250k` (`9.00 €` extra).
   * `HARD_CAP` violation checks and tax calculation rounding (`ROUND_HALF_UP`).
2. **`currency-exchange.service.spec.ts`:**
   * Test `live` state on successful HTTP response.
   * Test `cached_fallback` with stale `localStorage` data on HTTP error.
   * Test `offline_eur_only` when both HTTP and cache fail.
3. **`customer-create-dialog.spec.ts`:**
   * Form validation for company name, email, country, and algorithmic feedback for Spanish CIF/DNI/NIE.

### B. End-to-End / Integration Verification
* Run `ng build --configuration production` to verify zero compile or tree-shaking issues.
* Verify end-to-end flow with backend:
  1. Register customer via dialog (`POST /customers`).
  2. Search by company name and CIF (`GET /customers?q=...`).
  3. Open simulation studio, adjust sliders, verify live currency conversion to `USD` / `GBP`.
  4. Save simulation (`POST /simulations`), verify persistence in history list.

---

## 6. Build, Deployment & Proxy Setup

### Development Proxy (`frontend/proxy.conf.json`)
```json
{
  "/api": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```
Run development server:
```powershell
ng serve --proxy-config proxy.conf.json
```

### Production Build
```powershell
ng build --configuration production
```
Outputs optimized static assets to `frontend/dist/frontend/browser/`.

---

## 7. README & Documentation Updates
Add a dedicated **"Frontend (Angular 19 + Angular Material)"** section in `README.md`:
* Prerequisites: Node.js 20+ / 22+
* Install dependencies: `cd frontend && npm install`
* Start local dev server: `npm start` (with backend proxy to `:8000`)
* Run tests: `npm test`
* Production build: `npm run build`

