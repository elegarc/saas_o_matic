"""Unit tests for pure tiered pricing, progressive overage, HARD_CAP, and tax math."""

import pytest

from app.core.exceptions import BusinessValidationError
from app.domain.catalog import COUNTRIES, PLANS
from app.domain.models import OveragePolicy, PlanCode
from app.domain.pricing import (
    calculate_extra_api_cost_cents,
    calculate_extra_storage_cost_cents,
    calculate_simulation,
    calculate_tax_cents,
    calculate_users_cost_cents,
)


@pytest.mark.parametrize(
    ("active_users", "expected_cents"),
    [
        (0, 0),
        (1, 1000),
        (10, 10000),
        (11, 10800),
        (15, 14000),
        (50, 42000),
        (51, 42500),
        (100, 67000),
    ],
)
def test_calculate_users_cost_boundaries(active_users: int, expected_cents: int) -> None:
    """Verify exact cumulative user tier pricing across all boundary values."""
    assert calculate_users_cost_cents(active_users) == expected_cents


@pytest.mark.parametrize(
    ("extra_gb", "expected_cents"),
    [
        (0, 0),
        (1, 50),
        (50, 2500),
        (51, 2580),
        (60, 3300),
        (200, 14500),
        (201, 14620),
    ],
)
def test_calculate_extra_storage_cost_progressive(extra_gb: int, expected_cents: int) -> None:
    """Verify progressive storage overage tiers."""
    assert calculate_extra_storage_cost_cents(extra_gb) == expected_cents


@pytest.mark.parametrize(
    ("extra_calls", "expected_cents"),
    [
        (0, 0),
        (1, 5),
        (1000, 5),
        (100_000, 500),
        (150_000, 900),
        (500_000, 3700),
        (500_001, 3712),
    ],
)
def test_calculate_extra_api_cost_progressive(extra_calls: int, expected_cents: int) -> None:
    """Verify progressive API call overage tiers rounded up in 1k-call blocks."""
    assert calculate_extra_api_cost_cents(extra_calls) == expected_cents


def test_calculate_tax_cents_uses_round_half_up() -> None:
    """Verify 0.5-cent midpoint rounds half-up rather than banker's round-to-even."""
    assert calculate_tax_cents(25, 1000) == 3
    assert calculate_tax_cents(16900, 2100) == 3549
    assert calculate_tax_cents(16900, 0) == 0


def test_simulation_zero_users_charges_plan_fixed_rate() -> None:
    """Verify 0 active users still charges the plan fixed monthly rate plus tax."""
    result = calculate_simulation(
        plan=PLANS[PlanCode.STARTER],
        country=COUNTRIES["ES"],
        overage_policy=OveragePolicy.PROGRESSIVE,
        active_users=0,
        storage_gb=25,
        estimated_api_calls=100_000,
    )
    assert result.users_cost_cents == 0
    assert result.plan_fixed_cents == 2900
    assert result.subtotal_cents == 2900
    assert result.tax_amount_cents == 609
    assert result.total_cents == 3509


def test_simulation_15_users_starter_within_limits_and_progressive_overage() -> None:
    """Verify canonical 15-user scenario both within limits and with progressive overages."""
    within = calculate_simulation(
        plan=PLANS[PlanCode.STARTER],
        country=COUNTRIES["ES"],
        overage_policy=OveragePolicy.HARD_CAP,
        active_users=15,
        storage_gb=25,
        estimated_api_calls=100_000,
    )
    assert within.users_cost_cents == 14000
    assert within.subtotal_cents == 16900
    assert within.tax_amount_cents == 3549
    assert within.total_cents == 20449

    over = calculate_simulation(
        plan=PLANS[PlanCode.STARTER],
        country=COUNTRIES["ES"],
        overage_policy=OveragePolicy.PROGRESSIVE,
        active_users=15,
        storage_gb=85,
        estimated_api_calls=250_000,
    )
    assert over.extra_storage_gb == 60
    assert over.extra_storage_cost_cents == 3300
    assert over.extra_api_calls == 150_000
    assert over.extra_api_cost_cents == 900
    assert over.subtotal_cents == 21100
    assert over.tax_amount_cents == 4431
    assert over.total_cents == 25531


def test_simulation_hard_cap_rejects_over_limit_storage_or_api() -> None:
    """Verify HARD_CAP raises PLAN_LIMIT_EXCEEDED when storage or API exceeds plan quota."""
    with pytest.raises(BusinessValidationError) as storage_exc:
        calculate_simulation(
            plan=PLANS[PlanCode.STARTER],
            country=COUNTRIES["ES"],
            overage_policy=OveragePolicy.HARD_CAP,
            active_users=5,
            storage_gb=26,
            estimated_api_calls=100_000,
        )
    assert storage_exc.value.code == "PLAN_LIMIT_EXCEEDED"

    with pytest.raises(BusinessValidationError) as api_exc:
        calculate_simulation(
            plan=PLANS[PlanCode.PRO],
            country=COUNTRIES["US"],
            overage_policy=OveragePolicy.HARD_CAP,
            active_users=5,
            storage_gb=100,
            estimated_api_calls=500_001,
        )
    assert api_exc.value.code == "PLAN_LIMIT_EXCEEDED"

