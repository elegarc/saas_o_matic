import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { timeout } from 'rxjs/operators';
import {
  CachedRates,
  CurrencyState,
  ExchangeRatesResponse,
} from '../models/currency.model';
import { formatCurrency } from '../utils/currency-formatter';

const CACHE_STORAGE_KEY = 'saas_currency_rates_cache';
const API_URL = 'https://open.er-api.com/v6/latest/EUR';
const TIMEOUT_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class CurrencyExchangeService {
  private readonly http = inject(HttpClient);

  readonly activeCurrency = signal<string>('EUR');
  readonly rates = signal<Record<string, number>>({ EUR: 1.0 });
  readonly state = signal<CurrencyState>('loading');
  readonly lastUpdated = signal<Date | null>(null);

  readonly defaultCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'COP'];

  readonly activeRate = computed(() => {
    const cur = this.activeCurrency();
    const allRates = this.rates();
    return allRates[cur] ?? 1.0;
  });

  constructor() {
    this.initRates();
  }

  private initRates(): void {
    // Attempt to load cached rates first for immediate responsiveness if offline
    const cached = this.readCache();
    if (cached) {
      this.rates.set({ EUR: 1.0, ...cached.rates });
      this.lastUpdated.set(new Date(cached.fetchedAt));
    }

    this.fetchRates();
  }

  fetchRates(): void {
    this.state.set('loading');

    this.http
      .get<ExchangeRatesResponse>(API_URL)
      .pipe(timeout(TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          if (response && response.result === 'success' && response.rates) {
            const newRates = { EUR: 1.0, ...response.rates };
            this.rates.set(newRates);
            const now = new Date();
            this.lastUpdated.set(now);
            this.state.set('live');
            this.writeCache(newRates, now.toISOString(), response.time_next_update_unix);
          } else {
            this.handleFallback();
          }
        },
        error: () => {
          this.handleFallback();
        },
      });
  }

  private handleFallback(): void {
    const cached = this.readCache();
    if (cached && Object.keys(cached.rates).length > 0) {
      this.rates.set({ EUR: 1.0, ...cached.rates });
      this.lastUpdated.set(new Date(cached.fetchedAt));
      this.state.set('cached_fallback');
    } else {
      this.rates.set({ EUR: 1.0 });
      this.activeCurrency.set('EUR');
      this.state.set('offline_eur_only');
    }
  }

  setCurrency(currencyCode: string): void {
    const code = currencyCode.toUpperCase();
    if (this.state() === 'offline_eur_only' && code !== 'EUR') {
      return;
    }
    this.activeCurrency.set(code);
  }

  convert(amountEur: number, targetCurrency?: string): number {
    const currency = targetCurrency ?? this.activeCurrency();
    const rate = this.rates()[currency] ?? 1.0;
    return amountEur * rate;
  }

  formatConverted(amountEur: number, targetCurrency?: string): string {
    const currency = targetCurrency ?? this.activeCurrency();
    const converted = this.convert(amountEur, currency);
    return formatCurrency(converted, currency);
  }

  private readCache(): CachedRates | null {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as CachedRates;
      }
    } catch {
      // LocalStorage unavailable or corrupt
    }
    return null;
  }

  private writeCache(
    rates: Record<string, number>,
    fetchedAt: string,
    nextUpdateUnix?: number
  ): void {
    try {
      const data: CachedRates = {
        rates,
        fetchedAt,
        nextUpdateUnix,
      };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // LocalStorage write failed (quota exceeded or disabled)
    }
  }
}

