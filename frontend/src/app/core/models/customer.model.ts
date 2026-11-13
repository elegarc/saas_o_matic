import { OveragePolicy, PlanCode } from './catalog.model';

export interface Customer {
  id: number;
  company_name: string;
  tax_id: string;
  contact_email: string;
  country_code: string;
  country_name: string;
  tax_rate_percent: number;
  plan: PlanCode;
  overage_policy: OveragePolicy;
  created_at: string;
}

export interface CustomerCreateRequest {
  company_name: string;
  tax_id: string;
  contact_email: string;
  country_code: string;
  plan: PlanCode;
  overage_policy?: OveragePolicy;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
}

