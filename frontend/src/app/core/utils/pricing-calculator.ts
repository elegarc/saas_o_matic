import { OveragePolicy, PlanCode, PlanInfo } from '../models/catalog.model';
import { SimulationBreakdown } from '../models/simulation.model';

export interface PricingCalculationResult {
  breakdown: SimulationBreakdown;
  isHardCapExceeded: boolean;
  hardCapErrorMessage: string | null;
}

export function calculateUsersCostEur(activeUsers: number): number {
  if (activeUsers <= 0) {
    return 0;
  }
  let totalCents = 0;
  const u1 = Math.min(activeUsers, 10);
  const u2 = Math.max(0, Math.min(activeUsers, 50) - 10);
  const u3 = Math.max(0, activeUsers - 50);

  totalCents += u1 * 1000; // 10 EUR / user
  totalCents += u2 * 800;  // 8 EUR / user
  totalCents += u3 * 500;  // 5 EUR / user

  return totalCents / 100;
}

export function calculateExtraStorageCostEur(extraGb: number): number {
  if (extraGb <= 0) {
    return 0;
  }
  let totalCents = 0;
  const g1 = Math.min(extraGb, 50);
  const g2 = Math.max(0, Math.min(extraGb, 200) - 50);
  const g3 = Math.max(0, extraGb - 200);

  totalCents += g1 * 50;  // 0.50 EUR / GB
  totalCents += g2 * 80;  // 0.80 EUR / GB
  totalCents += g3 * 120; // 1.20 EUR / GB

  return totalCents / 100;
}

export function calculateExtraApiCostEur(extraCalls: number): number {
  if (extraCalls <= 0) {
    return 0;
  }
  const blocks = Math.ceil(extraCalls / 1000);
  let totalCents = 0;
  const b1 = Math.min(blocks, 100);
  const b2 = Math.max(0, Math.min(blocks, 500) - 100);
  const b3 = Math.max(0, blocks - 500);

  totalCents += b1 * 5;  // 0.05 EUR / 1k calls
  totalCents += b2 * 8;  // 0.08 EUR / 1k calls
  totalCents += b3 * 12; // 0.12 EUR / 1k calls

  return totalCents / 100;
}

export function roundHalfUp(amount: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function calculateSimulationBreakdown(
  plan: PlanInfo,
  taxRatePercent: number,
  overagePolicy: OveragePolicy,
  activeUsers: number,
  storageGb: number,
  estimatedApiCalls: number
): PricingCalculationResult {
  const safeUsers = Math.max(0, activeUsers);
  const safeStorage = Math.max(0, storageGb);
  const safeApiCalls = Math.max(0, estimatedApiCalls);

  const extraStorageGb = Math.max(0, safeStorage - plan.included_storage_gb);
  const extraApiCalls = Math.max(0, safeApiCalls - plan.included_api_calls);

  const isHardCapExceeded =
    overagePolicy === OveragePolicy.HARD_CAP &&
    (extraStorageGb > 0 || extraApiCalls > 0);

  let hardCapErrorMessage: string | null = null;
  if (isHardCapExceeded) {
    hardCapErrorMessage = `El consumo solicitado supera los límites del plan ${plan.code} bajo política HARD_CAP.`;
  }

  const planFixedEur = plan.fixed_monthly_eur;
  const usersCostEur = calculateUsersCostEur(safeUsers);

  const extraStorageCostEur =
    overagePolicy === OveragePolicy.PROGRESSIVE
      ? calculateExtraStorageCostEur(extraStorageGb)
      : 0;

  const extraApiCostEur =
    overagePolicy === OveragePolicy.PROGRESSIVE
      ? calculateExtraApiCostEur(extraApiCalls)
      : 0;

  const subtotalEur = roundHalfUp(
    planFixedEur + usersCostEur + extraStorageCostEur + extraApiCostEur
  );
  const taxAmountEur = roundHalfUp((subtotalEur * taxRatePercent) / 100);
  const totalEur = roundHalfUp(subtotalEur + taxAmountEur);

  return {
    breakdown: {
      plan_fixed_eur: planFixedEur,
      users_cost_eur: usersCostEur,
      extra_storage_gb: extraStorageGb,
      extra_storage_cost_eur: extraStorageCostEur,
      extra_api_calls: extraApiCalls,
      extra_api_cost_eur: extraApiCostEur,
      subtotal_eur: subtotalEur,
      tax_rate_percent: taxRatePercent,
      tax_amount_eur: taxAmountEur,
      total_eur: totalEur,
    },
    isHardCapExceeded,
    hardCapErrorMessage,
  };
}

