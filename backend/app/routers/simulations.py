"""HTTP endpoints for billing simulations."""

from fastapi import APIRouter, Depends, status

from app.routers import get_simulation_service
from app.schemas.simulation import SimulationCreateRequest, SimulationResponse
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulations", tags=["Simulations"])


@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def create_simulation(
    payload: SimulationCreateRequest,
    service: SimulationService = Depends(get_simulation_service),
) -> SimulationResponse:
    """Calculate and persist an immutable SaaS billing simulation."""
    record = service.create_simulation(payload)
    return SimulationResponse.from_record(record)

