"""Pydantic schemas for corporate customer endpoints."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domain.catalog import get_country_spec
from app.domain.models import CustomerRecord, OveragePolicy, PlanCode
from app.schemas.common import bps_to_percent


class CustomerCreateRequest(BaseModel):
    """Request payload for POST /customers."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    company_name: str = Field(min_length=2, max_length=150)
    tax_id: str = Field(min_length=5, max_length=20)
    contact_email: EmailStr = Field(max_length=254)
    country_code: str = Field(pattern=r"^[A-Za-z]{2}$")
    plan: PlanCode
    overage_policy: OveragePolicy = OveragePolicy.PROGRESSIVE

    @field_validator("contact_email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        """Normalize contact email to lowercase."""
        return str(value).strip().lower()

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str) -> str:
        """Normalize ISO 3166-1 alpha-2 country code to uppercase."""
        return value.strip().upper()


class CustomerResponse(BaseModel):
    """Response payload representing a registered corporate customer."""

    id: int
    company_name: str
    tax_id: str
    contact_email: EmailStr
    country_code: str
    country_name: str
    tax_rate_percent: float
    plan: PlanCode
    overage_policy: OveragePolicy
    created_at: str

    @classmethod
    def from_record(cls, record: CustomerRecord) -> "CustomerResponse":
        """Build response DTO from a persisted CustomerRecord."""
        country = get_country_spec(record.country_code)
        return cls(
            id=record.id,
            company_name=record.company_name,
            tax_id=record.tax_id,
            contact_email=record.contact_email,
            country_code=record.country_code,
            country_name=country.name,
            tax_rate_percent=bps_to_percent(country.tax_rate_bps),
            plan=record.plan,
            overage_policy=record.overage_policy,
            created_at=record.created_at,
        )


class CustomerListResponse(BaseModel):
    """Paginated response payload for GET /customers."""

    items: list[CustomerResponse]
    total: int
    limit: int
    offset: int

