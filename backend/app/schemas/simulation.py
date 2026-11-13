"""Pydantic schemas for billing simulation endpoints."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.models import OveragePolicy, PlanCode, SimulationRecord
from app.schemas.common import bps_to_percent, cents_to_eur


class SimulationCreateRequest(BaseModel):
    """Request payload for POST /simulations."""

    model_config = ConfigDict(extra="forbid")

    customer_id: int = Field(ge=1)
    active_users: int = Field(ge=0, le=100_000)
    storage_gb: int = Field(ge=0, le=100_000)
    estimated_api_calls: int = Field(ge=0, le=100_000_000)
    overage_policy: OveragePolicy | None = None


class SimulationBreakdown(BaseModel):
    """Itemized EUR cost breakdown for a persisted simulation."""

    plan_fixed_eur: float
    users_cost_eur: float
    extra_storage_gb: int
    extra_storage_cost_eur: float
    extra_api_calls: int
    extra_api_cost_eur: float
    subtotal_eur: float
    tax_rate_percent: float
    tax_amount_eur: float
    total_eur: float


class SimulationResponse(BaseModel):
    """Response payload representing an immutable simulation snapshot."""

    id: int
    customer_id: int
    currency: Literal["EUR"] = "EUR"
    plan_applied: PlanCode
    overage_policy_applied: OveragePolicy
    active_users: int
    storage_gb: int
    estimated_api_calls: int
    breakdown: SimulationBreakdown
    created_at: str

    @classmethod
    def from_record(cls, record: SimulationRecord) -> "SimulationResponse":
        """Build response DTO from a persisted SimulationRecord."""
        return cls(
            id=record.id,
            customer_id=record.customer_id,
            currency="EUR",
            plan_applied=record.plan_applied,
            overage_policy_applied=record.overage_policy_applied,
            active_users=record.active_users,
            storage_gb=record.storage_gb,
            estimated_api_calls=record.estimated_api_calls,
            breakdown=SimulationBreakdown(
                plan_fixed_eur=cents_to_eur(record.plan_fixed_cents),
                users_cost_eur=cents_to_eur(record.users_cost_cents),
                extra_storage_gb=record.extra_storage_gb,
                extra_storage_cost_eur=cents_to_eur(record.extra_storage_cost_cents),
                extra_api_calls=record.extra_api_calls,
                extra_api_cost_eur=cents_to_eur(record.extra_api_cost_cents),
                subtotal_eur=cents_to_eur(record.subtotal_cents),
                tax_rate_percent=bps_to_percent(record.tax_rate_bps),
                tax_amount_eur=cents_to_eur(record.tax_amount_cents),
                total_eur=cents_to_eur(record.total_cents),
            ),
            created_at=record.created_at,
        )

