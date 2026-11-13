import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OveragePolicy, PlanCode, PlanInfo } from '../../../core/models/catalog.model';
import { Customer } from '../../../core/models/customer.model';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { SimulationApiService } from '../../../core/services/simulation-api.service';
import { CustomerDetailComponent } from './customer-detail.component';

describe('CustomerDetailComponent', () => {
  const mockCustomer: Customer = {
    id: 7,
    company_name: 'Norte Cloud S.A.',
    tax_id: 'A58818501',
    contact_email: 'ops@norte.es',
    country_code: 'ES',
    country_name: 'España',
    tax_rate_percent: 21,
    plan: PlanCode.STARTER,
    overage_policy: OveragePolicy.PROGRESSIVE,
    created_at: '2026-11-12T10:00:00Z',
  };

  const mockPlans: PlanInfo[] = [
    {
      code: PlanCode.STARTER,
      name: 'Plan Base / Starter',
      fixed_monthly_eur: 29,
      included_storage_gb: 25,
      included_api_calls: 100000,
    },
  ];

  let customerApiSpy: jasmine.SpyObj<CustomerApiService>;
  let simulationApiSpy: jasmine.SpyObj<SimulationApiService>;
  let catalogApiSpy: jasmine.SpyObj<CatalogApiService>;

  beforeEach(async () => {
    customerApiSpy = jasmine.createSpyObj<CustomerApiService>('CustomerApiService', [
      'getCustomerById',
    ]);
    simulationApiSpy = jasmine.createSpyObj<SimulationApiService>('SimulationApiService', [
      'getCustomerSimulations',
    ]);
    catalogApiSpy = jasmine.createSpyObj<CatalogApiService>('CatalogApiService', ['getPlans']);

    customerApiSpy.getCustomerById.and.returnValue(of(mockCustomer));
    simulationApiSpy.getCustomerSimulations.and.returnValue(of([]));
    catalogApiSpy.getPlans.and.returnValue(of(mockPlans));

    await TestBed.configureTestingModule({
      imports: [CustomerDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CustomerApiService, useValue: customerApiSpy },
        { provide: SimulationApiService, useValue: simulationApiSpy },
        { provide: CatalogApiService, useValue: catalogApiSpy },
      ],
    }).compileComponents();
  });

  it('should render Historial de Simulaciones without old top anchor buttons or inline studio', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerId', '7');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent || '';

    expect(text).toContain('Historial de Simulaciones');
    expect(text).not.toContain('Historial de Simulaciones Guardadas');
    expect(el.querySelector('.quick-nav-links')).toBeNull();
    expect(el.querySelector('app-simulation-studio')).toBeNull();
  });

  it('should navigate to /customers/:id/simulate when clicking Nueva Simulación', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentRef.setInput('customerId', '7');
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.new-sim-btn'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/customers', 7, 'simulate']);
  });
});

