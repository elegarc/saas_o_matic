"""Idempotent SQLite schema initialization aligned with 03-data-model.md."""

import sqlite3

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name    TEXT    NOT NULL CHECK (length(trim(company_name)) BETWEEN 2 AND 150),
    tax_id          TEXT    NOT NULL CHECK (length(tax_id) BETWEEN 5 AND 20),
    contact_email   TEXT    NOT NULL CHECK (length(contact_email) <= 254),
    country_code    TEXT    NOT NULL CHECK (
                        length(country_code) = 2 AND country_code = upper(country_code)
                    ),
    plan            TEXT    NOT NULL CHECK (plan IN ('STARTER', 'PRO', 'ENTERPRISE')),
    overage_policy  TEXT    NOT NULL DEFAULT 'PROGRESSIVE'
                            CHECK (overage_policy IN ('PROGRESSIVE', 'HARD_CAP')),
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

    CONSTRAINT uq_customers_country_tax_id UNIQUE (country_code, tax_id)
);

CREATE TABLE IF NOT EXISTS simulations (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id               INTEGER NOT NULL,
    plan_applied              TEXT    NOT NULL CHECK (
                                  plan_applied IN ('STARTER', 'PRO', 'ENTERPRISE')
                              ),
    overage_policy_applied    TEXT    NOT NULL CHECK (
                                  overage_policy_applied IN ('PROGRESSIVE', 'HARD_CAP')
                              ),

    active_users              INTEGER NOT NULL CHECK (active_users >= 0),
    storage_gb                INTEGER NOT NULL CHECK (storage_gb >= 0),
    estimated_api_calls       INTEGER NOT NULL CHECK (estimated_api_calls >= 0),

    plan_fixed_cents          INTEGER NOT NULL CHECK (plan_fixed_cents >= 0),
    users_cost_cents          INTEGER NOT NULL CHECK (users_cost_cents >= 0),
    extra_storage_gb          INTEGER NOT NULL CHECK (extra_storage_gb >= 0),
    extra_storage_cost_cents  INTEGER NOT NULL CHECK (extra_storage_cost_cents >= 0),
    extra_api_calls           INTEGER NOT NULL CHECK (extra_api_calls >= 0),
    extra_api_cost_cents      INTEGER NOT NULL CHECK (extra_api_cost_cents >= 0),
    subtotal_cents            INTEGER NOT NULL CHECK (subtotal_cents >= 0),

    tax_rate_bps              INTEGER NOT NULL CHECK (tax_rate_bps >= 0 AND tax_rate_bps <= 10000),
    tax_amount_cents          INTEGER NOT NULL CHECK (tax_amount_cents >= 0),
    total_cents               INTEGER NOT NULL CHECK (total_cents >= 0),

    created_at                TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

    CONSTRAINT fk_simulations_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_company_name
    ON customers (company_name COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_customers_tax_id
    ON customers (tax_id);

CREATE INDEX IF NOT EXISTS idx_customers_created_at
    ON customers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulations_customer_history
    ON simulations (customer_id, created_at DESC, id DESC);
"""


def apply_schema(connection: sqlite3.Connection) -> None:
    """Create tables and indexes if they do not already exist."""
    connection.executescript(SCHEMA_SQL)
    connection.commit()

