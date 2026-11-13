export type CurrencyState = 'loading' | 'live' | 'cached_fallback' | 'offline_eur_only';

export interface ExchangeRatesResponse {
  result: string;
  provider?: string;
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code: string;
  rates: Record<string, number>;
}

export interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: string;
  nextUpdateUnix?: number;
}

