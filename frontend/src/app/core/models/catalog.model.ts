export enum PlanCode {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum OveragePolicy {
  PROGRESSIVE = 'PROGRESSIVE',
  HARD_CAP = 'HARD_CAP',
}

export interface PlanInfo {
  code: PlanCode;
  name: string;
  fixed_monthly_eur: number;
  included_storage_gb: number;
  included_api_calls: number;
}

export interface CountryInfo {
  country_code: string;
  name: string;
  tax_rate_percent: number;
  strict_tax_id_validation: boolean;
}
