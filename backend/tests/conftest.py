"""Shared pytest fixtures using an isolated temporary SQLite database."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture()
def test_settings(tmp_path: Path) -> Settings:
    """Provide isolated Settings pointing to a fresh temporary SQLite file."""
    db_file = tmp_path / "test_saas_o_matic.db"
    return Settings(database_path=str(db_file))


@pytest.fixture()
def client(test_settings: Settings) -> Iterator[TestClient]:
    """Provide a FastAPI TestClient wired to the isolated temporary database."""
    app = create_app(test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    with TestClient(app) as test_client:
        yield test_client

