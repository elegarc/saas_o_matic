import { OveragePolicy, PlanCode } from './catalog.model';

export interface SimulationBreakdown {
  plan_fixed_eur: number;
  users_cost_eur: number;
  extra_storage_gb: number;
  extra_storage_cost_eur: number;
  extra_api_calls: number;
  extra_api_cost_eur: number;
  subtotal_eur: number;
  tax_rate_percent: number;
  tax_amount_eur: number;
  total_eur: number;
}

export interface Simulation {
  id: number;
  customer_id: number;
  currency: 'EUR';
  plan_applied: PlanCode;
  overage_policy_applied: OveragePolicy;
  active_users: number;
  storage_gb: number;
  estimated_api_calls: number;
  breakdown: SimulationBreakdown;
  created_at: string;
}

export interface SimulationCreateRequest {
  customer_id: number;
  active_users: number;
  storage_gb: number;
  estimated_api_calls: number;
  overage_policy?: OveragePolicy;
}

