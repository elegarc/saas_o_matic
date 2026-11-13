"""System health and reference metadata endpoints."""

import sqlite3

from fastapi import APIRouter, Depends

from app.db.connection import get_db
from app.domain.catalog import COUNTRIES, PLANS
from app.schemas.common import (
    CountryInfo,
    HealthResponse,
    PlanInfo,
    bps_to_percent,
    cents_to_eur,
)

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
def get_health(db: sqlite3.Connection = Depends(get_db)) -> HealthResponse:
    """Verify service liveness and SQLite database connectivity."""
    db.execute("SELECT 1").fetchone()
    return HealthResponse(status="ok", database="connected")


@router.get("/countries", response_model=list[CountryInfo])
def list_countries() -> list[CountryInfo]:
    """Return supported countries, ISO codes, and VAT/Tax rates."""
    return [
        CountryInfo(
            country_code=country.country_code,
            name=country.name,
            tax_rate_percent=bps_to_percent(country.tax_rate_bps),
            strict_tax_id_validation=country.strict_tax_id_validation,
        )
        for country in COUNTRIES.values()
    ]


@router.get("/plans", response_model=list[PlanInfo])
def list_plans() -> list[PlanInfo]:
    """Return available subscription plans and included usage thresholds."""
    return [
        PlanInfo(
            code=plan.code,
            name=plan.name,
            fixed_monthly_eur=cents_to_eur(plan.fixed_monthly_cents),
            included_storage_gb=plan.included_storage_gb,
            included_api_calls=plan.included_api_calls,
        )
        for plan in PLANS.values()
    ]

