"""HTTP endpoints for corporate customer operations."""

from fastapi import APIRouter, Depends, Query, status

from app.routers import get_customer_service, get_simulation_service
from app.schemas.customer import (
    CustomerCreateRequest,
    CustomerListResponse,
    CustomerResponse,
)
from app.schemas.simulation import SimulationResponse
from app.services.customer_service import CustomerService
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers(
    q: str | None = Query(default=None, max_length=150),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: CustomerService = Depends(get_customer_service),
) -> CustomerListResponse:
    """Search and paginate registered corporate customers."""
    records, total = service.list_customers(query=q, limit=limit, offset=offset)
    return CustomerListResponse(
        items=[CustomerResponse.from_record(record) for record in records],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreateRequest,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerResponse:
    """Register a corporate customer with algorithmic tax ID verification."""
    record = service.create_customer(payload)
    return CustomerResponse.from_record(record)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer_by_id(
    customer_id: int,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerResponse:
    """Retrieve details of a single corporate customer."""
    record = service.get_customer(customer_id)
    return CustomerResponse.from_record(record)


@router.get("/{customer_id}/simulations", response_model=list[SimulationResponse])
def list_customer_simulations(
    customer_id: int,
    service: SimulationService = Depends(get_simulation_service),
) -> list[SimulationResponse]:
    """List saved billing simulations for a customer ordered newest first."""
    records = service.list_customer_simulations(customer_id)
    return [SimulationResponse.from_record(record) for record in records]

