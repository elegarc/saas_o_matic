import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OveragePolicy, PlanCode } from '../../../core/models/catalog.model';
import { Customer } from '../../../core/models/customer.model';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { CustomerDashboardComponent } from './customer-dashboard.component';

describe('CustomerDashboardComponent', () => {
  const mockCustomer: Customer = {
    id: 42,
    company_name: 'Acme Iberia S.L.',
    tax_id: 'B58818501',
    contact_email: 'billing@acme.es',
    country_code: 'ES',
    country_name: 'España',
    tax_rate_percent: 21,
    plan: PlanCode.PRO,
    overage_policy: OveragePolicy.PROGRESSIVE,
    created_at: '2026-11-12T10:00:00Z',
  };

  let customerApiSpy: jasmine.SpyObj<CustomerApiService>;

  beforeEach(async () => {
    customerApiSpy = jasmine.createSpyObj<CustomerApiService>('CustomerApiService', [
      'getCustomers',
    ]);
    customerApiSpy.getCustomers.and.returnValue(
      of({
        items: [mockCustomer],
        total: 1,
        limit: 12,
        offset: 0,
      })
    );

    await TestBed.configureTestingModule({
      imports: [CustomerDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: CustomerApiService, useValue: customerApiSpy },
      ],
    }).compileComponents();
  });

  it('should navigate to /customers/:id when clicking anywhere on a customer card', () => {
    const fixture = TestBed.createComponent(CustomerDashboardComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector(
      '.customer-card'
    ) as HTMLElement;
    expect(card).toBeTruthy();

    card.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/customers', 42]);
  });
});

