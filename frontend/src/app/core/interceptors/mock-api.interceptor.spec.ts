import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CountryInfo, OveragePolicy, PlanCode, PlanInfo } from '../models/catalog.model';
import { Customer, CustomerListResponse } from '../models/customer.model';
import { Simulation } from '../models/simulation.model';
import { apiErrorInterceptor } from './api-error.interceptor';
import { mockApiInterceptor, resetMockDemoData } from './mock-api.interceptor';

describe('mockApiInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    resetMockDemoData();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor, mockApiInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should return catalog countries and plans', () => {
    let countries: CountryInfo[] = [];
    let plans: PlanInfo[] = [];

    http.get<CountryInfo[]>('/api/v1/countries').subscribe((res) => (countries = res));
    http.get<PlanInfo[]>('/api/v1/plans').subscribe((res) => (plans = res));

    expect(countries.length).toBe(12);
    expect(countries.find((c) => c.country_code === 'ES')?.tax_rate_percent).toBe(21.0);
    expect(plans.length).toBe(3);
    expect(plans.find((p) => p.code === PlanCode.STARTER)?.fixed_monthly_eur).toBe(29.0);
  });

  it('should list seeded customers and filter by query string', () => {
    let allRes: CustomerListResponse | undefined;
    let searchRes: CustomerListResponse | undefined;

    http.get<CustomerListResponse>('/api/v1/customers').subscribe((res) => (allRes = res));
    http
      .get<CustomerListResponse>('/api/v1/customers', { params: { q: 'Lusitania' } })
      .subscribe((res) => (searchRes = res));

    expect(allRes?.total).toBe(3);
    expect(searchRes?.total).toBe(1);
    expect(searchRes?.items[0].country_code).toBe('PT');
  });

  it('should create a new customer and reject duplicates with 409', () => {
    let created: Customer | undefined;
    http
      .post<Customer>('/api/v1/customers', {
        company_name: 'Consultora Demo S.L.',
        country_code: 'es',
        tax_id: '12.345.678-z',
        contact_email: 'Admin@Demo.es',
        plan: PlanCode.PRO,
        overage_policy: OveragePolicy.PROGRESSIVE,
      })
      .subscribe((res) => (created = res));

    expect(created).toBeDefined();
    expect(created?.tax_id).toBe('12345678Z');
    expect(created?.country_code).toBe('ES');
    expect(created?.contact_email).toBe('admin@demo.es');

    let duplicateError: Error | undefined;
    http
      .post<Customer>('/api/v1/customers', {
        company_name: 'Duplicada S.L.',
        country_code: 'ES',
        tax_id: '12345678Z',
        contact_email: 'dup@demo.es',
        plan: PlanCode.STARTER,
        overage_policy: OveragePolicy.PROGRESSIVE,
      })
      .subscribe({ error: (err: Error) => (duplicateError = err) });

    expect(duplicateError?.message).toContain('12345678Z');
  });

  it('should reject invalid Spanish tax ID on customer creation', () => {
    let error: Error | undefined;
    http
      .post<Customer>('/api/v1/customers', {
        company_name: 'Empresa Inválida S.L.',
        country_code: 'ES',
        tax_id: '12345678A',
        contact_email: 'bad@demo.es',
        plan: PlanCode.STARTER,
        overage_policy: OveragePolicy.PROGRESSIVE,
      })
      .subscribe({ error: (err: Error) => (error = err) });

    expect(error?.message).toContain('validación oficial');
  });

  it('should create simulation and enforce HARD_CAP overage limits', () => {
    let sim: Simulation | undefined;
    http
      .post<Simulation>('/api/v1/simulations', {
        customer_id: 2, // Starter plan, ES 21% IVA, HARD_CAP default
        active_users: 15,
        storage_gb: 20,
        estimated_api_calls: 80_000,
        overage_policy: OveragePolicy.PROGRESSIVE,
      })
      .subscribe((res) => (sim = res));

    expect(sim?.breakdown.total_eur).toBe(204.49);

    let hardCapError: Error | undefined;
    http
      .post<Simulation>('/api/v1/simulations', {
        customer_id: 2,
        active_users: 15,
        storage_gb: 30, // exceeds Starter 25 GB under HARD_CAP
        estimated_api_calls: 80_000,
        overage_policy: OveragePolicy.HARD_CAP,
      })
      .subscribe({ error: (err: Error) => (hardCapError = err) });

    expect(hardCapError?.message).toContain('HARD_CAP');
  });

  it('should pass non-/api/v1 requests (external currency API) through to network', () => {
    let ratesResponse: unknown;
    http.get('https://open.er-api.com/v6/latest/EUR').subscribe((res) => (ratesResponse = res));

    const req = httpMock.expectOne('https://open.er-api.com/v6/latest/EUR');
    req.flush({ result: 'success', rates: { USD: 1.08 } });
    expect(ratesResponse).toEqual({ result: 'success', rates: { USD: 1.08 } });
  });
});
