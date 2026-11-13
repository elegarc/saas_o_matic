import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExchangeRatesResponse } from '../models/currency.model';
import { CurrencyExchangeService } from './currency-exchange.service';

describe('CurrencyExchangeService', () => {
  let service: CurrencyExchangeService;
  let httpMock: HttpTestingController;

  const mockSuccessResponse: ExchangeRatesResponse = {
    result: 'success',
    base_code: 'EUR',
    rates: {
      EUR: 1.0,
      USD: 1.0825,
      GBP: 0.855,
      CHF: 0.952,
      MXN: 21.45,
      COP: 4520.0,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        CurrencyExchangeService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should initialize and set state to live upon successful HTTP response', () => {
    service = TestBed.inject(CurrencyExchangeService);
    const req = httpMock.expectOne('https://open.er-api.com/v6/latest/EUR');
    expect(req.request.method).toBe('GET');

    req.flush(mockSuccessResponse);

    expect(service.state()).toBe('live');
    expect(service.rates()['USD']).toBe(1.0825);
    expect(service.rates()['GBP']).toBe(0.855);
    expect(service.activeRate()).toBe(1.0); // EUR active initially
  });

  it('should enter cached_fallback when HTTP fails but localStorage contains previous rates', () => {
    // Pre-populate cache in localStorage before service initialization
    const cachedData = {
      rates: { EUR: 1.0, USD: 1.05, GBP: 0.84 },
      fetchedAt: new Date(Date.now() - 3600000).toISOString(),
    };
    localStorage.setItem('saas_currency_rates_cache', JSON.stringify(cachedData));

    service = TestBed.inject(CurrencyExchangeService);

    const req = httpMock.expectOne('https://open.er-api.com/v6/latest/EUR');
    req.error(new ProgressEvent('Network error'));

    expect(service.state()).toBe('cached_fallback');
    expect(service.rates()['USD']).toBe(1.05);
    expect(service.lastUpdated()).not.toBeNull();
  });

  it('should enter offline_eur_only when HTTP fails and no cache exists', () => {
    localStorage.clear();
    service = TestBed.inject(CurrencyExchangeService);

    const req = httpMock.expectOne('https://open.er-api.com/v6/latest/EUR');
    req.error(new ProgressEvent('Network error'));

    expect(service.state()).toBe('offline_eur_only');
    expect(service.activeCurrency()).toBe('EUR');
    expect(service.rates()['EUR']).toBe(1.0);
  });

  it('should convert amounts accurately based on active currency', () => {
    service = TestBed.inject(CurrencyExchangeService);
    const req = httpMock.expectOne('https://open.er-api.com/v6/latest/EUR');
    req.flush(mockSuccessResponse);

    service.setCurrency('USD');
    expect(service.activeCurrency()).toBe('USD');
    expect(service.convert(100)).toBeCloseTo(108.25, 2);

    service.setCurrency('GBP');
    expect(service.convert(100)).toBeCloseTo(85.5, 2);
  });
});

