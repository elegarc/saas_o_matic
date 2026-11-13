"""Parameterized SQLite repository for billing simulations."""

import sqlite3

from app.domain.models import OveragePolicy, PlanCode, SimulationCalculation, SimulationRecord


def _row_to_simulation(row: sqlite3.Row) -> SimulationRecord:
    """Map a SQLite row into an immutable SimulationRecord."""
    return SimulationRecord(
        id=int(row["id"]),
        customer_id=int(row["customer_id"]),
        plan_applied=PlanCode(row["plan_applied"]),
        overage_policy_applied=OveragePolicy(row["overage_policy_applied"]),
        active_users=int(row["active_users"]),
        storage_gb=int(row["storage_gb"]),
        estimated_api_calls=int(row["estimated_api_calls"]),
        plan_fixed_cents=int(row["plan_fixed_cents"]),
        users_cost_cents=int(row["users_cost_cents"]),
        extra_storage_gb=int(row["extra_storage_gb"]),
        extra_storage_cost_cents=int(row["extra_storage_cost_cents"]),
        extra_api_calls=int(row["extra_api_calls"]),
        extra_api_cost_cents=int(row["extra_api_cost_cents"]),
        subtotal_cents=int(row["subtotal_cents"]),
        tax_rate_bps=int(row["tax_rate_bps"]),
        tax_amount_cents=int(row["tax_amount_cents"]),
        total_cents=int(row["total_cents"]),
        created_at=str(row["created_at"]),
    )


class SimulationRepository:
    """Handles SQLite persistence for immutable simulation snapshots."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection

    def create(self, customer_id: int, calculation: SimulationCalculation) -> SimulationRecord:
        """Persist a calculated simulation snapshot and return the stored record."""
        cursor = self._conn.execute(
            """
            INSERT INTO simulations (
                customer_id,
                plan_applied,
                overage_policy_applied,
                active_users,
                storage_gb,
                estimated_api_calls,
                plan_fixed_cents,
                users_cost_cents,
                extra_storage_gb,
                extra_storage_cost_cents,
                extra_api_calls,
                extra_api_cost_cents,
                subtotal_cents,
                tax_rate_bps,
                tax_amount_cents,
                total_cents
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                customer_id,
                calculation.plan_applied.value,
                calculation.overage_policy_applied.value,
                calculation.active_users,
                calculation.storage_gb,
                calculation.estimated_api_calls,
                calculation.plan_fixed_cents,
                calculation.users_cost_cents,
                calculation.extra_storage_gb,
                calculation.extra_storage_cost_cents,
                calculation.extra_api_calls,
                calculation.extra_api_cost_cents,
                calculation.subtotal_cents,
                calculation.tax_rate_bps,
                calculation.tax_amount_cents,
                calculation.total_cents,
            ),
        )
        self._conn.commit()

        row = self._conn.execute(
            """
            SELECT id, customer_id, plan_applied, overage_policy_applied,
                   active_users, storage_gb, estimated_api_calls,
                   plan_fixed_cents, users_cost_cents, extra_storage_gb,
                   extra_storage_cost_cents, extra_api_calls, extra_api_cost_cents,
                   subtotal_cents, tax_rate_bps, tax_amount_cents, total_cents, created_at
            FROM simulations
            WHERE id = ?
            """,
            (int(cursor.lastrowid),),
        ).fetchone()
        assert row is not None
        return _row_to_simulation(row)

    def list_by_customer(self, customer_id: int) -> list[SimulationRecord]:
        """Return all persisted simulations for a customer ordered newest first."""
        rows = self._conn.execute(
            """
            SELECT id, customer_id, plan_applied, overage_policy_applied,
                   active_users, storage_gb, estimated_api_calls,
                   plan_fixed_cents, users_cost_cents, extra_storage_gb,
                   extra_storage_cost_cents, extra_api_calls, extra_api_cost_cents,
                   subtotal_cents, tax_rate_bps, tax_amount_cents, total_cents, created_at
            FROM simulations
            WHERE customer_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (customer_id,),
        ).fetchall()
        return [_row_to_simulation(row) for row in rows]

