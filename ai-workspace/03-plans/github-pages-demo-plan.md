# GitHub Pages Static Mockup Deployment Plan — SaaS-O-Matic

> **Specs & Rules Referenced:**
> * [01-product-spec.md](../01-specs/01-product-spec.md)
> * [02-api-contract.yaml](../01-specs/02-api-contract.yaml)
> * [architecture.md](../../.agents/rules/architecture.md)
> * [frontend-angular.md](../../.agents/rules/frontend-angular.md)

---

## 1. Goal & Architecture Approach

Deploy an interactive, standalone **mockup/demo** of the Angular 19 frontend to **GitHub Pages** (`https://elegarc.github.io/saas_o_matic/`) so anyone visiting the GitHub repository can explore the UI directly—without requiring a hosted Python/FastAPI backend—while keeping local full-stack FastAPI mode (`npm start`) 100% unchanged.

### Key Architectural Decisions
1. **Build-Time Environment Toggle (`github-pages` configuration):**
   * Local `ng serve` / `ng build` uses `environment.ts` (`useMockApi: false`) $\rightarrow$ talks to FastAPI via `proxy.conf.json`.
   * GitHub Pages `ng build --configuration=github-pages --base-href=/saas_o_matic/` swaps in `environment.github-pages.ts` (`useMockApi: true`) $\rightarrow$ intercepts `/api/v1/*` calls in-browser while still calling `https://open.er-api.com/v6/latest/EUR` live for multi-currency rates.
2. **Spec-Aligned In-Browser Mock Backend (`mock-api.interceptor.ts` + `localStorage`):**
   * Pre-seeds realistic demo customers and historical simulations on first visit (e.g., *Acme Iberia S.L.* `B58818501`, *Norte Cloud S.A.* `A58818501`, *Berlin Robotics GmbH*, *Lusitania Tech Lda.*).
   * Supports search (`?q=`), pagination, customer registration (enforcing Spanish DNI/NIE/CIF validation and `409 Conflict` duplicate checks), and saving simulations using the exact pure `calculateSimulationBreakdown()` logic (`01-product-spec.md` parity) + `HARD_CAP` rejection (`422`), persisted in the visitor's `localStorage`.
3. **Clean SPA Routing on GitHub Pages:**
   * Copy `dist/frontend/browser/index.html` $\rightarrow$ `404.html` during the CI build so refreshing nested routes (e.g. `/saas_o_matic/customers/1/simulate`) works cleanly without 404 pages.
4. **Automated CI/CD via GitHub Actions:**
   * Official `actions/deploy-pages@v4` workflow builds and publishes `frontend/dist/frontend/browser/` on every push to `main`—keeping `main` clean without committing compiled `dist/` files.

---

## 2. Files to Create or Modify

| File | Responsibility / Change |
| :--- | :--- |
| `frontend/src/environments/environment.ts` | Default environment config (`useMockApi: false`). |
| `frontend/src/environments/environment.github-pages.ts` | GitHub Pages demo environment config (`useMockApi: true`). |
| `frontend/src/app/core/utils/tax-id-validator.ts` | Shared pure Spanish DNI/NIE/CIF normalization & validation helpers (extracted from `CustomerCreateDialogComponent` to avoid duplication). |
| `frontend/src/app/features/customers/customer-create-dialog/customer-create-dialog.component.ts` | Import `isValidSpanishTaxId` / `normalizeTaxId` from `core/utils/tax-id-validator.ts`. |
| `frontend/src/app/core/interceptors/mock-api.interceptor.ts` | Functional `HttpInterceptorFn` handling `/api/v1/*` endpoints against `localStorage` seeded data when `environment.useMockApi` is `true` (passing external currency API requests through untouched). |
| `frontend/src/app/app.config.ts` | Conditionally include `mockApiInterceptor` before `apiErrorInterceptor` when `environment.useMockApi` is `true`. |
| `frontend/src/app/app.component.ts` & `.html` | Display a non-intrusive Spanish demo banner (`Modo Demostración`) with a **"Restablecer datos demo"** action when `environment.useMockApi` is active. |
| `frontend/angular.json` | Add `"github-pages"` build configuration with `fileReplacements` (`environment.ts` $\rightarrow$ `environment.github-pages.ts`). |
| `frontend/package.json` | Add `"build:gh-pages": "ng build --configuration=github-pages --base-href=/saas_o_matic/"` convenience script. |
| `.github/workflows/deploy-gh-pages.yml` | GitHub Actions workflow building `frontend/`, copying `index.html` to `404.html`, and deploying to GitHub Pages. |
| `README.md` | Add live GitHub Pages demo link (`https://elegarc.github.io/saas_o_matic/`) and document how GitHub Pages demo mode works vs. local FastAPI mode. |

---

## 3. Verification & Test Strategy

1. **Unit Tests (`npm test -- --watch=false --browsers=ChromeHeadless`):**
   * Add `mock-api.interceptor.spec.ts` verifying seeded catalog/customers, Spanish CIF/DNI rejection (`422`), duplicate customer conflict (`409`), and simulation creation (`201`) + `HARD_CAP` rejection (`422`) in `localStorage`.
   * Add `tax-id-validator.spec.ts` covering extracted DNI/NIE/CIF helpers.
   * Confirm all existing 32 specs + new specs pass cleanly.
2. **Both Production Builds Verified Locally:**
   * `npm run build` (standard FastAPI build) $\rightarrow$ 0 errors/warnings.
   * `npm run build:gh-pages` (`github-pages` build with `--base-href=/saas_o_matic/`) $\rightarrow$ verify `dist/frontend/browser/index.html` contains `<base href="/saas_o_matic/">` and 0 errors/warnings.
3. **GitHub Settings Step (One-Time Manual Action by Repo Owner):**
   * Push to `main` and enable **Settings $\rightarrow$ Pages $\rightarrow$ Source: GitHub Actions** on `github.com/elegarc/saas_o_matic`.

