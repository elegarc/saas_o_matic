"""Application service for calculating and persisting billing simulations."""

from app.core.exceptions import NotFoundError
from app.domain.catalog import get_country_spec, get_plan_spec
from app.domain.models import SimulationRecord
from app.domain.pricing import calculate_simulation
from app.repositories.customer_repository import CustomerRepository
from app.repositories.simulation_repository import SimulationRepository
from app.schemas.simulation import SimulationCreateRequest


class SimulationService:
    """Coordinates simulation calculation and immutable SQLite persistence."""

    def __init__(
        self,
        customer_repo: CustomerRepository,
        simulation_repo: SimulationRepository,
    ) -> None:
        self._customer_repo = customer_repo
        self._simulation_repo = simulation_repo

    def create_simulation(self, payload: SimulationCreateRequest) -> SimulationRecord:
        """Compute billing breakdown for a customer and save an immutable snapshot."""
        customer = self._customer_repo.get_by_id(payload.customer_id)
        if customer is None:
            raise NotFoundError(
                code="CUSTOMER_NOT_FOUND",
                message=f"No se encontró el cliente con identificador {payload.customer_id}.",
                details={"customer_id": payload.customer_id},
            )

        plan = get_plan_spec(customer.plan)
        country = get_country_spec(customer.country_code)
        effective_policy = payload.overage_policy or customer.overage_policy

        calculation = calculate_simulation(
            plan=plan,
            country=country,
            overage_policy=effective_policy,
            active_users=payload.active_users,
            storage_gb=payload.storage_gb,
            estimated_api_calls=payload.estimated_api_calls,
        )
        return self._simulation_repo.create(customer.id, calculation)

    def list_customer_simulations(self, customer_id: int) -> list[SimulationRecord]:
        """Return saved simulations for an existing customer, newest first."""
        customer = self._customer_repo.get_by_id(customer_id)
        if customer is None:
            raise NotFoundError(
                code="CUSTOMER_NOT_FOUND",
                message=f"No se encontró el cliente con identificador {customer_id}.",
                details={"customer_id": customer_id},
            )
        return self._simulation_repo.list_by_customer(customer_id)

