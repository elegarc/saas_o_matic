"""FastAPI HTTP routers and shared dependency factories."""

import sqlite3

from fastapi import Depends

from app.db.connection import get_db
from app.repositories.customer_repository import CustomerRepository
from app.repositories.simulation_repository import SimulationRepository
from app.services.customer_service import CustomerService
from app.services.simulation_service import SimulationService


def get_customer_service(db: sqlite3.Connection = Depends(get_db)) -> CustomerService:
    """Provide a request-scoped CustomerService."""
    return CustomerService(CustomerRepository(db))


def get_simulation_service(db: sqlite3.Connection = Depends(get_db)) -> SimulationService:
    """Provide a request-scoped SimulationService."""
    return SimulationService(CustomerRepository(db), SimulationRepository(db))

