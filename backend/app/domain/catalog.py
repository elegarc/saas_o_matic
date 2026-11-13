"""Static domain catalogs for subscription plans and supported countries."""

from app.core.exceptions import BusinessValidationError
from app.domain.models import CountrySpec, PlanCode, PlanSpec

PLANS: dict[PlanCode, PlanSpec] = {
    PlanCode.STARTER: PlanSpec(
        code=PlanCode.STARTER,
        name="Plan Base / Starter",
        fixed_monthly_cents=2900,
        included_storage_gb=25,
        included_api_calls=100_000,
    ),
    PlanCode.PRO: PlanSpec(
        code=PlanCode.PRO,
        name="Plan Profesional",
        fixed_monthly_cents=7900,
        included_storage_gb=100,
        included_api_calls=500_000,
    ),
    PlanCode.ENTERPRISE: PlanSpec(
        code=PlanCode.ENTERPRISE,
        name="Plan Corporativo",
        fixed_monthly_cents=19900,
        included_storage_gb=500,
        included_api_calls=2_000_000,
    ),
}

COUNTRIES: dict[str, CountrySpec] = {
    "ES": CountrySpec("ES", "España", 2100, True),
    "PT": CountrySpec("PT", "Portugal", 2300, False),
    "FR": CountrySpec("FR", "Francia", 2000, False),
    "DE": CountrySpec("DE", "Alemania", 1900, False),
    "IT": CountrySpec("IT", "Italia", 2200, False),
    "NL": CountrySpec("NL", "Países Bajos", 2100, False),
    "BE": CountrySpec("BE", "Bélgica", 2100, False),
    "IE": CountrySpec("IE", "Irlanda", 2300, False),
    "GB": CountrySpec("GB", "Reino Unido", 2000, False),
    "US": CountrySpec("US", "Estados Unidos", 0, False),
    "MX": CountrySpec("MX", "México", 1600, False),
    "CO": CountrySpec("CO", "Colombia", 1900, False),
}


def get_plan_spec(plan: PlanCode) -> PlanSpec:
    """Return the PlanSpec for a valid PlanCode."""
    return PLANS[plan]


def get_country_spec(country_code: str) -> CountrySpec:
    """Normalize and look up a supported country, raising 422 if unknown."""
    normalized = country_code.strip().upper()
    country = COUNTRIES.get(normalized)
    if country is None:
        raise BusinessValidationError(
            code="UNSUPPORTED_COUNTRY",
            message=f"El país '{normalized}' no está soportado en el catálogo fiscal.",
            details={"field": "country_code", "country_code": normalized},
        )
    return country

