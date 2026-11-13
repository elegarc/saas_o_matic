"""Shared API schemas and exact integer-to-EUR serialization helpers."""

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.domain.models import PlanCode


def cents_to_eur(cents: int) -> float:
    """Convert integer EUR cents into a 2-decimal EUR numeric value."""
    return float((Decimal(cents) / Decimal(100)).quantize(Decimal("0.01")))


def bps_to_percent(bps: int) -> float:
    """Convert integer basis points (e.g. 2100) into percentage (21.0)."""
    return float((Decimal(bps) / Decimal(100)).quantize(Decimal("0.01")))


class ErrorResponse(BaseModel):
    """Standardized API error response aligned with OpenAPI contract."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    """Service health check payload."""

    status: str
    database: str


class CountryInfo(BaseModel):
    """Supported country tax metadata."""

    country_code: str
    name: str
    tax_rate_percent: float
    strict_tax_id_validation: bool


class PlanInfo(BaseModel):
    """Subscription plan pricing and threshold metadata."""

    code: PlanCode
    name: str
    fixed_monthly_eur: float
    included_storage_gb: int
    included_api_calls: int

