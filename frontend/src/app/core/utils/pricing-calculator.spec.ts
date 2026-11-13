import { OveragePolicy, PlanCode, PlanInfo } from '../models/catalog.model';
import {
  calculateExtraApiCostEur,
  calculateExtraStorageCostEur,
  calculateSimulationBreakdown,
  calculateUsersCostEur,
  roundHalfUp,
} from './pricing-calculator';

describe('PricingCalculator (Pure Domain Logic)', () => {
  const starterPlan: PlanInfo = {
    code: PlanCode.STARTER,
    name: 'Plan Base / Starter',
    fixed_monthly_eur: 29.0,
    included_storage_gb: 25,
    included_api_calls: 100000,
  };

  describe('calculateUsersCostEur', () => {
    it('should return 0.00 € for 0 or negative users', () => {
      expect(calculateUsersCostEur(0)).toBe(0);
      expect(calculateUsersCostEur(-5)).toBe(0);
    });

    it('should calculate Tier 1 (1 to 10 users @ 10 €/user)', () => {
      expect(calculateUsersCostEur(1)).toBe(10);
      expect(calculateUsersCostEur(10)).toBe(100);
    });

    it('should calculate Tier 2 (11 to 50 users @ 8 €/user)', () => {
      expect(calculateUsersCostEur(11)).toBe(108); // (10 * 10) + (1 * 8)
      expect(calculateUsersCostEur(15)).toBe(140); // (10 * 10) + (5 * 8) -> matches task.md example
      expect(calculateUsersCostEur(50)).toBe(420); // (10 * 10) + (40 * 8)
    });

    it('should calculate Tier 3 (> 50 users @ 5 €/user)', () => {
      expect(calculateUsersCostEur(51)).toBe(425); // 420 + 5
      expect(calculateUsersCostEur(100)).toBe(670); // 420 + (50 * 5)
      expect(calculateUsersCostEur(500)).toBe(2670); // 420 + (450 * 5)
    });
  });

  describe('calculateExtraStorageCostEur', () => {
    it('should return 0 € when extra GB is 0 or negative', () => {
      expect(calculateExtraStorageCostEur(0)).toBe(0);
      expect(calculateExtraStorageCostEur(-10)).toBe(0);
    });

    it('should calculate Tier 1 overage (1 to 50 GB @ 0.50 €/GB)', () => {
      expect(calculateExtraStorageCostEur(1)).toBe(0.5);
      expect(calculateExtraStorageCostEur(50)).toBe(25);
    });

    it('should calculate Tier 2 overage (51 to 200 GB @ 0.80 €/GB)', () => {
      expect(calculateExtraStorageCostEur(51)).toBe(25.8);
      expect(calculateExtraStorageCostEur(60)).toBe(33); // 25 + (10 * 0.80)
      expect(calculateExtraStorageCostEur(200)).toBe(145); // 25 + (150 * 0.80)
    });

    it('should calculate Tier 3 overage (> 200 GB @ 1.20 €/GB)', () => {
      expect(calculateExtraStorageCostEur(201)).toBe(146.2);
      expect(calculateExtraStorageCostEur(300)).toBe(265); // 145 + (100 * 1.20)
    });
  });

  describe('calculateExtraApiCostEur', () => {
    it('should return 0 € when extra API calls is 0 or negative', () => {
      expect(calculateExtraApiCostEur(0)).toBe(0);
      expect(calculateExtraApiCostEur(-100)).toBe(0);
    });

    it('should round up to the nearest 1k block and calculate Tier 1 (1 to 100 blocks @ 0.05 €)', () => {
      expect(calculateExtraApiCostEur(1)).toBe(0.05); // 1 call rounds up to 1 block
      expect(calculateExtraApiCostEur(1000)).toBe(0.05);
      expect(calculateExtraApiCostEur(100000)).toBe(5.0); // 100 blocks
    });

    it('should calculate Tier 2 overage (101 to 500 blocks @ 0.08 €)', () => {
      expect(calculateExtraApiCostEur(150000)).toBe(9.0); // 5.0 + (50 * 0.08)
      expect(calculateExtraApiCostEur(500000)).toBe(37.0); // 5.0 + (400 * 0.08)
    });

    it('should calculate Tier 3 overage (> 500 blocks @ 0.12 €)', () => {
      expect(calculateExtraApiCostEur(500001)).toBe(37.12); // 501 blocks
    });
  });

  describe('roundHalfUp', () => {
    it('should break ties half-up at 2 decimals', () => {
      expect(roundHalfUp(35.485)).toBe(35.49);
      expect(roundHalfUp(255.305)).toBe(255.31);
      expect(roundHalfUp(10.0)).toBe(10.0);
    });
  });

  describe('calculateSimulationBreakdown', () => {
    it('should calculate exact breakdown for 15 users in Spain (21% IVA) within plan limits', () => {
      const res = calculateSimulationBreakdown(
        starterPlan,
        21.0,
        OveragePolicy.PROGRESSIVE,
        15,
        20,
        80000
      );

      expect(res.isHardCapExceeded).toBeFalse();
      expect(res.breakdown.plan_fixed_eur).toBe(29.0);
      expect(res.breakdown.users_cost_eur).toBe(140.0);
      expect(res.breakdown.extra_storage_gb).toBe(0);
      expect(res.breakdown.extra_storage_cost_eur).toBe(0);
      expect(res.breakdown.extra_api_calls).toBe(0);
      expect(res.breakdown.extra_api_cost_eur).toBe(0);
      expect(res.breakdown.subtotal_eur).toBe(169.0);
      expect(res.breakdown.tax_rate_percent).toBe(21.0);
      expect(res.breakdown.tax_amount_eur).toBe(35.49);
      expect(res.breakdown.total_eur).toBe(204.49);
    });

    it('should calculate exact breakdown for 15 users with progressive overages (85 GB, 250k API calls)', () => {
      const res = calculateSimulationBreakdown(
        starterPlan,
        21.0,
        OveragePolicy.PROGRESSIVE,
        15,
        85,
        250000
      );

      expect(res.isHardCapExceeded).toBeFalse();
      expect(res.breakdown.extra_storage_gb).toBe(60);
      expect(res.breakdown.extra_storage_cost_eur).toBe(33.0);
      expect(res.breakdown.extra_api_calls).toBe(150000);
      expect(res.breakdown.extra_api_cost_eur).toBe(9.0);
      expect(res.breakdown.subtotal_eur).toBe(211.0);
      expect(res.breakdown.tax_amount_eur).toBe(44.31);
      expect(res.breakdown.total_eur).toBe(255.31);
    });

    it('should flag HARD_CAP violation when storage or API exceeds plan threshold', () => {
      const res = calculateSimulationBreakdown(
        starterPlan,
        21.0,
        OveragePolicy.HARD_CAP,
        15,
        26, // exceeds 25 GB limit
        100000
      );

      expect(res.isHardCapExceeded).toBeTrue();
      expect(res.hardCapErrorMessage).toContain('HARD_CAP');
      expect(res.breakdown.extra_storage_cost_eur).toBe(0);
    });
  });
});

