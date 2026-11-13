# Frontend UX & Layout Refinement Plan — SaaS-O-Matic

> **Specs & Guidelines Referenced:**
> * [01-product-spec.md](../01-specs/01-product-spec.md)
> * [02-api-contract.yaml](../01-specs/02-api-contract.yaml)
> * [architecture.md](../../.agents/rules/architecture.md)
> * [frontend-angular.md](../../.agents/rules/frontend-angular.md)

---

## 1. Scope of Requested Changes

1. **Fix icon alignment inside buttons** across all Angular Material buttons (`mat-flat-button`, `mat-stroked-button`, `mat-button`, `mat-icon-button`).
2. **Add comfortable padding to the Currency (`Divisa`) selector input** in the top navigation bar.
3. **Make customer cards clickable on `/customers`** so clicking a customer opens their detail view (`/customers/:customerId`) displaying **Customer Details + Historial de Simulaciones**.
4. **Separate the Simulation Studio from the Customer View** and evaluate UX options for how commercial users access the simulation workflow cleanly.
5. **Remove top anchor navigation buttons** (`Configuración`, `Resumen`, `Historial`) from the customer detail view.
6. **Rename section title** `"Historial de Simulaciones Guardadas"` $\rightarrow$ `"Historial de Simulaciones"`.

---

## 2. Technical Audit & Detailed Changes

### 2.1. Button Icon Alignment Fixes
**Root Cause Identified in Current Code:**
* In Angular Material 19 (MDC), button content is wrapped internally inside `<span class="mdc-button__label">`. Applying `display: flex; align-items: center; gap: ...` directly to `<button>` (e.g., `.create-btn`, `.action-btn`, `.save-btn`, `.back-btn`) does not flex-align children inside `.mdc-button__label`.
* `CustomerDashboardComponent` pagination (`Siguiente <mat-icon>chevron_right</mat-icon>`) places the icon after text without `iconPositionEnd`, causing baseline misalignment.
* `CurrencySelectorComponent` `.retry-btn` (`mat-icon-button`) overrides `width: 32px; height: 32px;` while keeping MDC's default `12px` padding on a `48px` icon button, pushing the `18px` `refresh` icon off-center.
* `CostBreakdownCardComponent` and `CustomerCreateDialogComponent` wrap `<mat-icon>` and `<span>` inside `<ng-container>` blocks where Material's direct-child icon selectors do not apply uniformly.

**Planned Fixes:**
* **`frontend/src/styles.scss`:** Add standardized MDC button label alignment rules so every `mat-button`, `mat-flat-button`, `mat-stroked-button`, and `mat-raised-button` aligns `<mat-icon>`, `<mat-spinner>`, and text vertically centered on the same flex cross-axis:
  ```scss
  .mat-mdc-button .mdc-button__label,
  .mat-mdc-unelevated-button .mdc-button__label,
  .mat-mdc-outlined-button .mdc-button__label,
  .mat-mdc-raised-button .mdc-button__label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .mat-mdc-button .mat-icon,
  .mat-mdc-unelevated-button .mat-icon,
  .mat-mdc-outlined-button .mat-icon,
  .mat-mdc-raised-button .mat-icon {
    margin: 0 !important;
    font-size: 18px;
    width: 18px;
    height: 18px;
    line-height: 18px;
  }
  ```
* **`currency-selector.component.ts`:** Fix `.retry-btn` (`mat-icon-button`) by setting `padding: 0; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;` and `--mdc-icon-button-state-layer-size: 36px;` so the `refresh` icon sits centered inside the circular ripple target.
* **`customer-dashboard.component.ts`:** Use `iconPositionEnd` (or clean `<span>` + `<mat-icon>`) on `"Siguiente"` pagination button and clean redundant button flex styles.

---

### 2.2. Padding & Spacing on the `Divisa` Selector (`currency-selector.component.ts`)
**Root Cause Identified in Current Code:**
* `density="compact"` is not a valid directive/attribute in Angular Material 19, and `margin-bottom: -1.25em` pulls the outline box tightly against the toolbar edges.
* `width: 105px` with default outline field geometry makes the `Divisa` floating label and selected code (`EUR`, `USD`) look cramped inside the `64px` topbar.

**Planned Fixes:**
* Replace `density="compact"` and `margin-bottom: -1.25em` with Angular Material's built-in `subscriptSizing="dynamic"` on `<mat-form-field appearance="outline" subscriptSizing="dynamic" class="select-field">`.
* Increase `.select-field` width to `124px` and apply comfortable internal padding & vertical sizing tokens:
  * `--mat-form-field-container-height: 40px;`
  * `--mat-form-field-container-vertical-padding: 8px;`
  * `--mat-form-field-outlined-container-shape: 8px;`
  * Add horizontal breathing room (`padding: 0 4px`) inside the trigger wrapper and `gap: 12px` between the status pill (`En vivo` / `Caché`) and the selector, plus subtle vertical margin in `.main-toolbar` (`min-height: 68px`).

---

### 2.3. Clickable Customer Cards on `/customers` (`customer-dashboard.component.ts`)
**Planned Changes:**
* Make the entire `<mat-card class="customer-card">` clickable to open `/customers/:customerId`:
  * Add `(click)="viewCustomer(customer.id)"`, `(keydown.enter)="viewCustomer(customer.id)"`, `tabindex="0"`, `role="button"`, and `cursor: pointer;` with a subtle hover border highlight (`border-color: #93c5fd`).
* Update the card footer action button so it clearly reflects opening the customer details & history (e.g., `"Ver Detalle e Historial"` with `arrow_forward` icon using `iconPositionEnd`)—or keep a subtle link hint if the chosen simulation option adds a direct shortcut button with `event.stopPropagation()`.

---

### 2.4. Customer Detail Cleanup (`customer-detail.component.ts`)
**Planned Changes:**
1. **Remove top anchor buttons:** Delete the entire `.quick-nav-links` block (`Ir a: Configuración | Resumen | Historial`) from `.top-nav-bar`, leaving a clean breadcrumb bar with `"Volver al Dashboard"` on the left (and, depending on the selected option in Section 3, a primary `"Nueva Simulación"` action button on the right).
2. **Rename section title:** Change `"Historial de Simulaciones Guardadas"` to **`"Historial de Simulaciones"`**.
3. **Update empty state message:** Align subtitle copy so it guides the user cleanly to the chosen simulation trigger.

---

## 3. Selected UX Flow for Accessing the Simulation Studio (Option A — Approved)

> **User Selection Confirmed:** Dedicated sub-route (`/customers/:customerId/simulate`) + clicking anywhere on a customer card (or its `"Ver Detalle e Historial"` button) opens Customer Details & History (`/customers/:customerId`).

### Option A (Selected): Dedicated Sub-Route (`/customers/:customerId/simulate`)
* **Customer Detail (`/customers/:customerId`):** Displays **only** the Customer Profile Card and the **`Historial de Simulaciones`** table, with a prominent primary CTA button **`+ Nueva Simulación`** at the top-right (and inside the empty state when there are no simulations yet).
* **Simulation Page (`/customers/:customerId/simulate`):** Dedicated focus view containing:
  * Top navigation: `"← Volver a la Ficha del Cliente"` + compact customer/plan context header (`Empresa`, `Plan`, `IVA`).
  * Two-column layout: Sliders on the left + Sticky Cost Breakdown card on the right with **`Guardar`**.
  * On **`Guardar`**, persists via `POST /api/v1/simulations`, shows confirmation toast, and navigates back to `/customers/:customerId` where the new simulation appears at the top of `Historial de Simulaciones`.

```text
/customers/:id                                  /customers/:id/simulate
+-------------------------------------------+   +-------------------------------------------+
| <- Volver al Dashboard                    |   | <- Volver a Acme Iberia S.L.              |
+-------------------------------------------+   +-------------------------------------------+
| [Ficha del Cliente]    [+ Nueva Simulación]|  | Acme Iberia S.L. | Plan PRO | IVA 21%     |
+-------------------------------------------+   +---------------------+---------------------+
| Historial de Simulaciones                 |   | Sliders de Consumo  | Resumen Facturación |
| [Fecha | Plan | Usuarios | ... | Total]   |   | (0-150 / max 500)   | [   Guardar   ]     |
+-------------------------------------------+   +---------------------+---------------------+
```

*(Alternative options evaluated during planning: Option B — Wide `MatDialog` modal; Option C — Two-tab `MatTabGroup` on `/customers/:customerId`.)*

---

## 4. Files to Create or Modify

| File | Responsibility / Change |
| :--- | :--- |
| `frontend/src/styles.scss` | Global MDC button `.mdc-button__label` flex alignment & `mat-icon` spacing fix. |
| `frontend/src/app/app.component.scss` | Adjust `.main-toolbar` vertical spacing (`min-height: 68px`) for comfortable `Divisa` padding. |
| `frontend/src/app/shared/components/currency-selector/currency-selector.component.ts` | Add `subscriptSizing="dynamic"`, comfortable width (`124px`) & padding tokens, fix `.retry-btn` (`mat-icon-button`) centering. |
| `frontend/src/app/features/customers/customer-dashboard/customer-dashboard.component.ts` | Clickable `.customer-card` navigation (`cursor: pointer`, keyboard support), update CTA to `"Ver Detalle e Historial"`, fix pagination button `iconPositionEnd`. |
| `frontend/src/app/features/customers/customer-detail/customer-detail.component.ts` | Remove top anchor links (`Configuración`, `Resumen`, `Historial`), rename heading to `Historial de Simulaciones`, remove inline studio, add `+ Nueva Simulación` button routing to `/customers/:customerId/simulate`. |
| `frontend/src/app/features/simulations/simulation-page/simulation-page.component.ts` | New standalone routed container at `/customers/:customerId/simulate` displaying breadcrumb back to customer, compact customer/plan banner, and `SimulationStudioComponent`. |
| `frontend/src/app/app.routes.ts` | Register lazy route `customers/:customerId/simulate`. |
| `frontend/src/app/shared/components/cost-breakdown-card/cost-breakdown-card.component.ts` | Clean button `<ng-container>` markup so spinner/icon align consistently. |
| `frontend/src/app/features/customers/customer-create-dialog/customer-create-dialog.component.ts` | Clean button `<ng-container>` markup for consistent icon alignment. |

---

## 5. Verification & Test Strategy

1. **Unit Tests (Karma + Jasmine Headless Chrome):**
   * Verify all existing 27 unit tests pass without regression.
   * Add/update component spec coverage for:
     * `CustomerDashboardComponent`: clicking a customer card navigates to `/customers/:customerId`.
     * `CustomerDetailComponent`: renders `"Historial de Simulaciones"`, does not render removed top anchor links, and triggers the chosen simulation access flow.
     * `CurrencySelectorComponent`: renders with `EUR` selected and emits currency/retry events cleanly.
2. **Production Build Verification:**
   * Run `npm run build` inside `frontend/` and verify 0 errors/warnings.
3. **Visual / Manual Inspection:**
   * Verify icon vertical/horizontal centering inside all buttons (`Registrar Nuevo Cliente`, `Ver Detalle`, `Anterior` / `Siguiente`, `Volver al Dashboard`, `Guardar`, `Registrar Cliente`, retry `mat-icon-button`).
   * Verify `Divisa` select padding inside the navbar across desktop and mobile widths.
   * Verify full flow: `/customers` $\rightarrow$ click card $\rightarrow$ view details & history $\rightarrow$ open simulation $\rightarrow$ save $\rightarrow$ see updated history.
