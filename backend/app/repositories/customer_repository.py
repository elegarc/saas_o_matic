"""Parameterized SQLite repository for corporate customers."""

import sqlite3

from app.core.exceptions import ConflictError
from app.domain.models import CustomerRecord, OveragePolicy, PlanCode
from app.domain.tax_id_validator import normalize_tax_id


def _escape_like(value: str) -> str:
    """Escape SQLite LIKE special characters."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _row_to_customer(row: sqlite3.Row) -> CustomerRecord:
    """Map a SQLite row into an immutable CustomerRecord."""
    return CustomerRecord(
        id=int(row["id"]),
        company_name=str(row["company_name"]),
        tax_id=str(row["tax_id"]),
        contact_email=str(row["contact_email"]),
        country_code=str(row["country_code"]),
        plan=PlanCode(row["plan"]),
        overage_policy=OveragePolicy(row["overage_policy"]),
        created_at=str(row["created_at"]),
    )


class CustomerRepository:
    """Handles SQLite persistence for the customers table."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection

    def create(
        self,
        company_name: str,
        tax_id: str,
        contact_email: str,
        country_code: str,
        plan: PlanCode,
        overage_policy: OveragePolicy,
    ) -> CustomerRecord:
        """Insert a new corporate customer and return the persisted record."""
        try:
            cursor = self._conn.execute(
                """
                INSERT INTO customers (
                    company_name,
                    tax_id,
                    contact_email,
                    country_code,
                    plan,
                    overage_policy
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    company_name,
                    tax_id,
                    contact_email,
                    country_code,
                    plan.value,
                    overage_policy.value,
                ),
            )
            self._conn.commit()
        except sqlite3.IntegrityError as exc:
            self._conn.rollback()
            raise ConflictError(
                code="DUPLICATE_CUSTOMER",
                message=(
                    f"Ya existe un cliente registrado en '{country_code}' "
                    f"con el identificador fiscal '{tax_id}'."
                ),
                details={"country_code": country_code, "tax_id": tax_id},
            ) from exc

        customer_id = cursor.lastrowid
        created = self.get_by_id(int(customer_id))
        assert created is not None
        return created

    def get_by_id(self, customer_id: int) -> CustomerRecord | None:
        """Fetch a customer by primary key, or None if not found."""
        row = self._conn.execute(
            """
            SELECT id, company_name, tax_id, contact_email, country_code,
                   plan, overage_policy, created_at
            FROM customers
            WHERE id = ?
            """,
            (customer_id,),
        ).fetchone()
        return _row_to_customer(row) if row is not None else None

    def search(
        self,
        query: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[CustomerRecord], int]:
        """Search customers by company_name or normalized tax_id with pagination."""
        cleaned_query = query.strip() if query else ""

        if cleaned_query:
            company_pattern = f"%{_escape_like(cleaned_query)}%"
            normalized_query = normalize_tax_id(cleaned_query)
            tax_pattern = f"%{_escape_like(normalized_query)}%"

            where_clause = (
                "WHERE company_name LIKE ? ESCAPE '\\' OR tax_id LIKE ? ESCAPE '\\'"
            )
            filter_params: tuple[str, ...] = (company_pattern, tax_pattern)
        else:
            where_clause = ""
            filter_params = ()

        total_row = self._conn.execute(
            f"SELECT COUNT(*) AS total FROM customers {where_clause}",
            filter_params,
        ).fetchone()
        total = int(total_row["total"]) if total_row is not None else 0

        rows = self._conn.execute(
            f"""
            SELECT id, company_name, tax_id, contact_email, country_code,
                   plan, overage_policy, created_at
            FROM customers
            {where_clause}
            ORDER BY created_at DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            (*filter_params, limit, offset),
        ).fetchall()

        return [_row_to_customer(row) for row in rows], total

