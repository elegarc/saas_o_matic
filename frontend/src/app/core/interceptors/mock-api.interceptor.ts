import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { CountryInfo, OveragePolicy, PlanCode, PlanInfo } from '../models/catalog.model';
import {
  Customer,
  CustomerCreateRequest,
  CustomerListResponse,
} from '../models/customer.model';
import { Simulation, SimulationCreateRequest } from '../models/simulation.model';
import { calculateSimulationBreakdown } from '../utils/pricing-calculator';
import {
  isValidGenericTaxId,
  isValidSpanishTaxId,
  normalizeTaxId,
} from '../utils/tax-id-validator';

const MOCK_STORAGE_KEY = 'saas_o_matic_mock_state_v1';

interface MockDatabaseState {
  nextCustomerId: number;
  nextSimulationId: number;
  customers: Customer[];
  simulations: Simulation[];
}

export const MOCK_PLANS: readonly PlanInfo[] = [
  {
    code: PlanCode.STARTER,
    name: 'Plan Base / Starter',
    fixed_monthly_eur: 29.0,
    included_storage_gb: 25,
    included_api_calls: 100_000,
  },
  {
    code: PlanCode.PRO,
    name: 'Plan Profesional',
    fixed_monthly_eur: 79.0,
    included_storage_gb: 100,
    included_api_calls: 500_000,
  },
  {
    code: PlanCode.ENTERPRISE,
    name: 'Plan Corporativo',
    fixed_monthly_eur: 199.0,
    included_storage_gb: 500,
    included_api_calls: 2_000_000,
  },
];

export const MOCK_COUNTRIES: readonly CountryInfo[] = [
  { country_code: 'ES', name: 'España', tax_rate_percent: 21.0, strict_tax_id_validation: true },
  { country_code: 'PT', name: 'Portugal', tax_rate_percent: 23.0, strict_tax_id_validation: false },
  { country_code: 'FR', name: 'Francia', tax_rate_percent: 20.0, strict_tax_id_validation: false },
  { country_code: 'DE', name: 'Alemania', tax_rate_percent: 19.0, strict_tax_id_validation: false },
  { country_code: 'IT', name: 'Italia', tax_rate_percent: 22.0, strict_tax_id_validation: false },
  { country_code: 'NL', name: 'Países Bajos', tax_rate_percent: 21.0, strict_tax_id_validation: false },
  { country_code: 'BE', name: 'Bélgica', tax_rate_percent: 21.0, strict_tax_id_validation: false },
  { country_code: 'IE', name: 'Irlanda', tax_rate_percent: 23.0, strict_tax_id_validation: false },
  { country_code: 'GB', name: 'Reino Unido', tax_rate_percent: 20.0, strict_tax_id_validation: false },
  { country_code: 'US', name: 'Estados Unidos', tax_rate_percent: 0.0, strict_tax_id_validation: false },
  { country_code: 'MX', name: 'México', tax_rate_percent: 16.0, strict_tax_id_validation: false },
  { country_code: 'CO', name: 'Colombia', tax_rate_percent: 19.0, strict_tax_id_validation: false },
];

function createSeedState(): MockDatabaseState {
  const customers: Customer[] = [
    {
      id: 1,
      company_name: 'Iberia Cloud Solutions S.L.',
      tax_id: 'B87654323',
      contact_email: 'facturacion@iberiacloud.es',
      country_code: 'ES',
      country_name: 'España',
      tax_rate_percent: 21.0,
      plan: PlanCode.PRO,
      overage_policy: OveragePolicy.PROGRESSIVE,
      created_at: '2026-01-15T10:30:00Z',
    },
    {
      id: 2,
      company_name: 'Norte Retail Analytics S.A.',
      tax_id: 'A12345674',
      contact_email: 'finanzas@norteretail.es',
      country_code: 'ES',
      country_name: 'España',
      tax_rate_percent: 21.0,
      plan: PlanCode.STARTER,
      overage_policy: OveragePolicy.HARD_CAP,
      created_at: '2026-02-02T09:15:00Z',
    },
    {
      id: 3,
      company_name: 'Lusitania FinTech Lda.',
      tax_id: 'PT509876543',
      contact_email: 'accounts@lusitaniafintech.pt',
      country_code: 'PT',
      country_name: 'Portugal',
      tax_rate_percent: 23.0,
      plan: PlanCode.ENTERPRISE,
      overage_policy: OveragePolicy.PROGRESSIVE,
      created_at: '2026-02-18T16:45:00Z',
    },
  ];

  const seedSimulationsInput: Array<{
    id: number;
    customer: Customer;
    activeUsers: number;
    storageGb: number;
    apiCalls: number;
    createdAt: string;
  }> = [
    {
      id: 1,
      customer: customers[0],
      activeUsers: 42,
      storageGb: 160,
      apiCalls: 750_000,
      createdAt: '2026-02-20T11:00:00Z',
    },
    {
      id: 2,
      customer: customers[1],
      activeUsers: 15,
      storageGb: 20,
      apiCalls: 80_000,
      createdAt: '2026-02-22T14:20:00Z',
    },
    {
      id: 3,
      customer: customers[2],
      activeUsers: 120,
      storageGb: 620,
      apiCalls: 2_500_000,
      createdAt: '2026-02-25T17:05:00Z',
    },
  ];

  const simulations: Simulation[] = seedSimulationsInput.map((seed) => {
    const plan = MOCK_PLANS.find((p) => p.code === seed.customer.plan)!;
    const calc = calculateSimulationBreakdown(
      plan,
      seed.customer.tax_rate_percent,
      seed.customer.overage_policy,
      seed.activeUsers,
      seed.storageGb,
      seed.apiCalls
    );
    return {
      id: seed.id,
      customer_id: seed.customer.id,
      currency: 'EUR',
      plan_applied: seed.customer.plan,
      overage_policy_applied: seed.customer.overage_policy,
      active_users: seed.activeUsers,
      storage_gb: seed.storageGb,
      estimated_api_calls: seed.apiCalls,
      breakdown: calc.breakdown,
      created_at: seed.createdAt,
    };
  });

  return {
    nextCustomerId: 4,
    nextSimulationId: 4,
    customers,
    simulations,
  };
}

function loadState(): MockDatabaseState {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      saveState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<MockDatabaseState>;
    if (
      typeof parsed.nextCustomerId === 'number' &&
      typeof parsed.nextSimulationId === 'number' &&
      Array.isArray(parsed.customers) &&
      Array.isArray(parsed.simulations)
    ) {
      return parsed as MockDatabaseState;
    }
  } catch {
    // Fall back to fresh seed state when storage is unavailable or corrupted.
  }

  const seed = createSeedState();
  saveState(seed);
  return seed;
}

function saveState(state: MockDatabaseState): void {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted browsing contexts.
  }
}

/** Reset the in-browser demo database back to its initial pre-seeded customers and simulations. */
export function resetMockDemoData(): void {
  const seed = createSeedState();
  saveState(seed);
}

function httpError(
  url: string,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        url,
        status,
        statusText: code,
        error: { code, message, details: details ?? {} },
      })
  );
}

function parseQueryParams(req: HttpRequest<unknown>): URLSearchParams {
  const queryIndex = req.url.indexOf('?');
  const rawQuery = queryIndex >= 0 ? req.url.slice(queryIndex + 1) : '';
  const searchParams = new URLSearchParams(rawQuery);

  for (const key of req.params.keys()) {
    const val = req.params.get(key);
    if (val !== null) {
      searchParams.set(key, val);
    }
  }
  return searchParams;
}

function extractPath(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
}

function handleListCustomers(req: HttpRequest<unknown>): Observable<HttpEvent<CustomerListResponse>> {
  const state = loadState();
  const params = parseQueryParams(req);

  const query = (params.get('q') ?? '').trim().toLowerCase();
  const limitRaw = Number.parseInt(params.get('limit') ?? '20', 10);
  const offsetRaw = Number.parseInt(params.get('offset') ?? '0', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  const sorted = [...state.customers].sort((a, b) => b.id - a.id);
  const filtered = query
    ? sorted.filter(
        (c) =>
          c.company_name.toLowerCase().includes(query) ||
          c.tax_id.toLowerCase().includes(query) ||
          c.contact_email.toLowerCase().includes(query)
      )
    : sorted;

  const items = filtered.slice(offset, offset + limit);
  return of(
    new HttpResponse<CustomerListResponse>({
      status: 200,
      body: { items, total: filtered.length, limit, offset },
    })
  );
}

function handleGetCustomer(
  req: HttpRequest<unknown>,
  customerId: number
): Observable<HttpEvent<Customer>> {
  const state = loadState();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) {
    return httpError(
      req.url,
      404,
      'CUSTOMER_NOT_FOUND',
      `No existe ningún cliente con identificador ${customerId}.`,
      { customer_id: customerId }
    );
  }
  return of(new HttpResponse<Customer>({ status: 200, body: customer }));
}

function handleCreateCustomer(req: HttpRequest<unknown>): Observable<HttpEvent<Customer>> {
  const payload = req.body as CustomerCreateRequest;
  const companyName = (payload.company_name ?? '').trim();
  const countryCode = (payload.country_code ?? '').trim().toUpperCase();
  const normalizedTaxId = normalizeTaxId(payload.tax_id ?? '');
  const contactEmail = (payload.contact_email ?? '').trim().toLowerCase();

  if (companyName.length < 2 || companyName.length > 150) {
    return httpError(
      req.url,
      422,
      'VALIDATION_ERROR',
      'La razón social debe tener entre 2 y 150 caracteres.',
      { field: 'company_name' }
    );
  }

  const country = MOCK_COUNTRIES.find((c) => c.country_code === countryCode);
  if (!country) {
    return httpError(
      req.url,
      422,
      'UNSUPPORTED_COUNTRY',
      `El país '${countryCode}' no está soportado en el catálogo fiscal.`,
      { field: 'country_code', country_code: countryCode }
    );
  }

  if (countryCode === 'ES') {
    if (!isValidSpanishTaxId(normalizedTaxId)) {
      return httpError(
        req.url,
        422,
        'INVALID_SPANISH_TAX_ID',
        'El identificador fiscal español (DNI/NIE/CIF) no supera la validación oficial de control.',
        { field: 'tax_id', country_code: countryCode }
      );
    }
  } else if (!isValidGenericTaxId(normalizedTaxId)) {
    return httpError(
      req.url,
      422,
      'INVALID_TAX_ID',
      'El identificador fiscal debe contener entre 5 y 20 caracteres alfanuméricos válidos.',
      { field: 'tax_id', country_code: countryCode }
    );
  }

  const plan = MOCK_PLANS.find((p) => p.code === payload.plan);
  if (!plan) {
    return httpError(req.url, 422, 'INVALID_PLAN', 'El plan seleccionado no es válido.', {
      field: 'plan',
    });
  }

  const state = loadState();
  const duplicate = state.customers.find(
    (c) => c.country_code === countryCode && c.tax_id === normalizedTaxId
  );
  if (duplicate) {
    return httpError(
      req.url,
      409,
      'DUPLICATE_TAX_ID',
      `Ya existe un cliente registrado en ${countryCode} con el identificador fiscal ${normalizedTaxId}.`,
      { country_code: countryCode, tax_id: normalizedTaxId }
    );
  }

  const created: Customer = {
    id: state.nextCustomerId,
    company_name: companyName,
    tax_id: normalizedTaxId,
    contact_email: contactEmail,
    country_code: country.country_code,
    country_name: country.name,
    tax_rate_percent: country.tax_rate_percent,
    plan: payload.plan,
    overage_policy: payload.overage_policy ?? OveragePolicy.PROGRESSIVE,
    created_at: new Date().toISOString(),
  };

  state.nextCustomerId += 1;
  state.customers.push(created);
  saveState(state);

  return of(new HttpResponse<Customer>({ status: 201, body: created }));
}

function handleListCustomerSimulations(
  req: HttpRequest<unknown>,
  customerId: number
): Observable<HttpEvent<Simulation[]>> {
  const state = loadState();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) {
    return httpError(
      req.url,
      404,
      'CUSTOMER_NOT_FOUND',
      `No existe ningún cliente con identificador ${customerId}.`,
      { customer_id: customerId }
    );
  }

  const items = state.simulations
    .filter((s) => s.customer_id === customerId)
    .sort((a, b) => b.id - a.id);

  return of(new HttpResponse<Simulation[]>({ status: 200, body: items }));
}

function handleCreateSimulation(req: HttpRequest<unknown>): Observable<HttpEvent<Simulation>> {
  const payload = req.body as SimulationCreateRequest;
  const state = loadState();
  const customer = state.customers.find((c) => c.id === payload.customer_id);
  if (!customer) {
    return httpError(
      req.url,
      404,
      'CUSTOMER_NOT_FOUND',
      `No existe ningún cliente con identificador ${payload.customer_id}.`,
      { customer_id: payload.customer_id }
    );
  }

  const plan = MOCK_PLANS.find((p) => p.code === customer.plan);
  if (!plan) {
    return httpError(req.url, 422, 'INVALID_PLAN', 'El plan del cliente no es válido.');
  }

  const policy = payload.overage_policy ?? customer.overage_policy;
  const calculation = calculateSimulationBreakdown(
    plan,
    customer.tax_rate_percent,
    policy,
    payload.active_users,
    payload.storage_gb,
    payload.estimated_api_calls
  );

  if (calculation.isHardCapExceeded) {
    return httpError(
      req.url,
      422,
      'HARD_CAP_EXCEEDED',
      calculation.hardCapErrorMessage ??
        'Se ha superado el límite del plan bajo la política HARD_CAP.',
      {
        plan: customer.plan,
        overage_policy: policy,
        included_storage_gb: plan.included_storage_gb,
        included_api_calls: plan.included_api_calls,
      }
    );
  }

  const created: Simulation = {
    id: state.nextSimulationId,
    customer_id: customer.id,
    currency: 'EUR',
    plan_applied: customer.plan,
    overage_policy_applied: policy,
    active_users: payload.active_users,
    storage_gb: payload.storage_gb,
    estimated_api_calls: payload.estimated_api_calls,
    breakdown: calculation.breakdown,
    created_at: new Date().toISOString(),
  };

  state.nextSimulationId += 1;
  state.simulations.push(created);
  saveState(state);

  return of(new HttpResponse<Simulation>({ status: 201, body: created }));
}

/**
 * In-browser mock API interceptor for static deployments (e.g. GitHub Pages).
 * Intercepts /api/v1/* calls using localStorage and real pricing/tax logic,
 * while passing external requests (such as open.er-api.com) straight through.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const path = extractPath(req.url);
  if (!path.startsWith('/api/v1')) {
    return next(req);
  }

  if (req.method === 'GET' && path === '/api/v1/countries') {
    return of(new HttpResponse<CountryInfo[]>({ status: 200, body: [...MOCK_COUNTRIES] }));
  }

  if (req.method === 'GET' && path === '/api/v1/plans') {
    return of(new HttpResponse<PlanInfo[]>({ status: 200, body: [...MOCK_PLANS] }));
  }

  if (req.method === 'GET' && path === '/api/v1/customers') {
    return handleListCustomers(req);
  }

  if (req.method === 'POST' && path === '/api/v1/customers') {
    return handleCreateCustomer(req);
  }

  const customerSimMatch = /^\/api\/v1\/customers\/(\d+)\/simulations$/.exec(path);
  if (req.method === 'GET' && customerSimMatch) {
    return handleListCustomerSimulations(req, Number.parseInt(customerSimMatch[1], 10));
  }

  const customerIdMatch = /^\/api\/v1\/customers\/(\d+)$/.exec(path);
  if (req.method === 'GET' && customerIdMatch) {
    return handleGetCustomer(req, Number.parseInt(customerIdMatch[1], 10));
  }

  if (req.method === 'POST' && path === '/api/v1/simulations') {
    return handleCreateSimulation(req);
  }

  return httpError(req.url, 404, 'NOT_FOUND', `Ruta no implementada en modo demo: ${path}`);
};
