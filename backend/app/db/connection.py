"""SQLite connection management and FastAPI dependency provider."""

import sqlite3
from collections.abc import Iterator
from pathlib import Path

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.db.schema import apply_schema


def create_connection(database_path: str) -> sqlite3.Connection:
    """Open a configured SQLite connection with foreign keys enabled."""
    if database_path != ":memory:":
        Path(database_path).parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def init_db(database_path: str) -> None:
    """Initialize SQLite database file and schema idempotently."""
    connection = create_connection(database_path)
    try:
        if database_path != ":memory:":
            connection.execute("PRAGMA journal_mode = WAL;")
        apply_schema(connection)
    finally:
        connection.close()


def get_db(settings: Settings = Depends(get_settings)) -> Iterator[sqlite3.Connection]:
    """Yield a per-request SQLite connection with rollback and cleanup guarantees."""
    connection = create_connection(settings.database_path)
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

