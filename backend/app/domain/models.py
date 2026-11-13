"""Immutable domain entities and value objects."""

from dataclasses import dataclass
from enum import StrEnum


class PlanCode(StrEnum):
    """Supported SaaS subscription plan codes."""

    STARTER = "STARTER"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class OveragePolicy(StrEnum):
    """Behavior when storage or API calls exceed plan thresholds."""

    PROGRESSIVE = "PROGRESSIVE"
    HARD_CAP = "HARD_CAP"


@dataclass(frozen=True)
class PlanSpec:
    """Static definition of a subscription plan in canonical EUR cents."""

    code: PlanCode
    name: str
    fixed_monthly_cents: int
    included_storage_gb: int
    included_api_calls: int


@dataclass(frozen=True)
class CountrySpec:
    """Country tax configuration using basis points (100 bps = 1.00%)."""

    country_code: str
    name: str
    tax_rate_bps: int
    strict_tax_id_validation: bool


@dataclass(frozen=True)
class SimulationCalculation:
    """Deterministic EUR-cent breakdown of a single billing simulation."""

    plan_applied: PlanCode
    overage_policy_applied: OveragePolicy
    active_users: int
    storage_gb: int
    estimated_api_calls: int
    plan_fixed_cents: int
    users_cost_cents: int
    extra_storage_gb: int
    extra_storage_cost_cents: int
    extra_api_calls: int
    extra_api_cost_cents: int
    subtotal_cents: int
    tax_rate_bps: int
    tax_amount_cents: int
    total_cents: int


@dataclass(frozen=True)
class CustomerRecord:
    """Persisted corporate customer domain record."""

    id: int
    company_name: str
    tax_id: str
    contact_email: str
    country_code: str
    plan: PlanCode
    overage_policy: OveragePolicy
    created_at: str


@dataclass(frozen=True)
class SimulationRecord:
    """Persisted immutable billing simulation snapshot."""

    id: int
    customer_id: int
    plan_applied: PlanCode
    overage_policy_applied: OveragePolicy
    active_users: int
    storage_gb: int
    estimated_api_calls: int
    plan_fixed_cents: int
    users_cost_cents: int
    extra_storage_gb: int
    extra_storage_cost_cents: int
    extra_api_calls: int
    extra_api_cost_cents: int
    subtotal_cents: int
    tax_rate_bps: int
    tax_amount_cents: int
    total_cents: int
    created_at: str

