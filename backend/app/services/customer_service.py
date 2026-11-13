"""Application service for corporate customer registration and queries."""

from app.core.exceptions import NotFoundError
from app.domain.catalog import get_country_spec
from app.domain.models import CustomerRecord
from app.domain.tax_id_validator import validate_tax_id
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreateRequest


class CustomerService:
    """Coordinates domain validation and repository persistence for customers."""

    def __init__(self, customer_repo: CustomerRepository) -> None:
        self._customer_repo = customer_repo

    def create_customer(self, payload: CustomerCreateRequest) -> CustomerRecord:
        """Validate country and tax ID algorithmically, then persist customer."""
        country = get_country_spec(payload.country_code)
        normalized_tax_id = validate_tax_id(country.country_code, payload.tax_id)
        return self._customer_repo.create(
            company_name=payload.company_name.strip(),
            tax_id=normalized_tax_id,
            contact_email=str(payload.contact_email).strip().lower(),
            country_code=country.country_code,
            plan=payload.plan,
            overage_policy=payload.overage_policy,
        )

    def get_customer(self, customer_id: int) -> CustomerRecord:
        """Return a customer by ID or raise NotFoundError."""
        customer = self._customer_repo.get_by_id(customer_id)
        if customer is None:
            raise NotFoundError(
                code="CUSTOMER_NOT_FOUND",
                message=f"No se encontró el cliente con identificador {customer_id}.",
                details={"customer_id": customer_id},
            )
        return customer

    def list_customers(
        self,
        query: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[CustomerRecord], int]:
        """Search customers by company name or tax ID."""
        return self._customer_repo.search(query=query, limit=limit, offset=offset)

