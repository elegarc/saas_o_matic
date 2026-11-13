"""Pure tiered pricing, progressive overage, and tax calculation logic."""

from decimal import ROUND_HALF_UP, Decimal

from app.core.exceptions import BusinessValidationError
from app.domain.models import CountrySpec, OveragePolicy, PlanSpec, SimulationCalculation

# Each tuple represents (inclusive_upper_bound | None, rate_in_eur_cents).
_USER_TIERS: tuple[tuple[int | None, int], ...] = (
    (10, 1000),
    (50, 800),
    (None, 500),
)

_STORAGE_OVERAGE_TIERS: tuple[tuple[int | None, int], ...] = (
    (50, 50),
    (200, 80),
    (None, 120),
)

_API_BLOCK_OVERAGE_TIERS: tuple[tuple[int | None, int], ...] = (
    (100, 5),
    (500, 8),
    (None, 12),
)


def _calculate_tiered_cost_cents(
    units: int,
    tiers: tuple[tuple[int | None, int], ...],
) -> int:
    """Compute accumulative cost in integer cents across progressive upper-bounded tiers."""
    if units <= 0:
        return 0

    total_cents = 0
    previous_limit = 0
    for upper_limit, rate_cents in tiers:
        if upper_limit is None:
            tier_units = max(0, units - previous_limit)
            total_cents += tier_units * rate_cents
            break

        tier_units = max(0, min(units, upper_limit) - previous_limit)
        total_cents += tier_units * rate_cents
        previous_limit = upper_limit

    return total_cents


def calculate_users_cost_cents(active_users: int) -> int:
    """Calculate monthly active users cost using cumulative 10 EUR / 8 EUR / 5 EUR tiers."""
    return _calculate_tiered_cost_cents(active_users, _USER_TIERS)


def calculate_extra_storage_cost_cents(extra_gb: int) -> int:
    """Calculate progressive monthly cost for storage GB above the plan threshold."""
    return _calculate_tiered_cost_cents(extra_gb, _STORAGE_OVERAGE_TIERS)


def calculate_extra_api_cost_cents(extra_calls: int) -> int:
    """Calculate progressive monthly cost for API calls above threshold in 1k-call blocks."""
    if extra_calls <= 0:
        return 0
    billable_blocks = (extra_calls + 999) // 1000
    return _calculate_tiered_cost_cents(billable_blocks, _API_BLOCK_OVERAGE_TIERS)


def calculate_tax_cents(subtotal_cents: int, tax_rate_bps: int) -> int:
    """Calculate VAT/Tax in integer cents using exact Decimal ROUND_HALF_UP."""
    raw_tax = (Decimal(subtotal_cents) * Decimal(tax_rate_bps)) / Decimal(10000)
    return int(raw_tax.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def calculate_simulation(
    plan: PlanSpec,
    country: CountrySpec,
    overage_policy: OveragePolicy,
    active_users: int,
    storage_gb: int,
    estimated_api_calls: int,
) -> SimulationCalculation:
    """Validate thresholds and compute an immutable EUR-cent billing breakdown."""
    if active_users < 0 or storage_gb < 0 or estimated_api_calls < 0:
        raise BusinessValidationError(
            code="INVALID_USAGE_VALUES",
            message=(
                "Los valores de usuarios, almacenamiento y llamadas API no pueden ser negativos."
            ),
        )

    extra_storage_gb = max(0, storage_gb - plan.included_storage_gb)
    extra_api_calls = max(0, estimated_api_calls - plan.included_api_calls)

    if overage_policy == OveragePolicy.HARD_CAP and (
        extra_storage_gb > 0 or extra_api_calls > 0
    ):
        raise BusinessValidationError(
            code="PLAN_LIMIT_EXCEEDED",
            message=(
                f"El consumo solicitado supera los límites del plan {plan.code.value} "
                "bajo política HARD_CAP."
            ),
            details={
                "included_storage_gb": plan.included_storage_gb,
                "requested_storage_gb": storage_gb,
                "included_api_calls": plan.included_api_calls,
                "requested_api_calls": estimated_api_calls,
            },
        )

    users_cost_cents = calculate_users_cost_cents(active_users)
    extra_storage_cost_cents = (
        calculate_extra_storage_cost_cents(extra_storage_gb)
        if overage_policy == OveragePolicy.PROGRESSIVE
        else 0
    )
    extra_api_cost_cents = (
        calculate_extra_api_cost_cents(extra_api_calls)
        if overage_policy == OveragePolicy.PROGRESSIVE
        else 0
    )

    subtotal_cents = (
        plan.fixed_monthly_cents
        + users_cost_cents
        + extra_storage_cost_cents
        + extra_api_cost_cents
    )
    tax_amount_cents = calculate_tax_cents(subtotal_cents, country.tax_rate_bps)
    total_cents = subtotal_cents + tax_amount_cents

    return SimulationCalculation(
        plan_applied=plan.code,
        overage_policy_applied=overage_policy,
        active_users=active_users,
        storage_gb=storage_gb,
        estimated_api_calls=estimated_api_calls,
        plan_fixed_cents=plan.fixed_monthly_cents,
        users_cost_cents=users_cost_cents,
        extra_storage_gb=extra_storage_gb,
        extra_storage_cost_cents=extra_storage_cost_cents,
        extra_api_calls=extra_api_calls,
        extra_api_cost_cents=extra_api_cost_cents,
        subtotal_cents=subtotal_cents,
        tax_rate_bps=country.tax_rate_bps,
        tax_amount_cents=tax_amount_cents,
        total_cents=total_cents,
    )

