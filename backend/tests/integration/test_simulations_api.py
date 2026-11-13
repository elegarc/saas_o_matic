"""Integration tests for billing simulation endpoints."""

from fastapi.testclient import TestClient


def _create_customer(
    client: TestClient,
    overage_policy: str = "PROGRESSIVE",
    tax_id: str = "B58818501",
) -> int:
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "SimTest S.L.",
            "tax_id": tax_id,
            "contact_email": "finance@simtest.es",
            "country_code": "ES",
            "plan": "STARTER",
            "overage_policy": overage_policy,
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def test_create_simulation_15_users_and_progressive_overage(client: TestClient) -> None:
    """Verify POST /simulations persists EUR breakdown and returns chronological history."""
    customer_id = _create_customer(client, overage_policy="PROGRESSIVE")

    first = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer_id,
            "active_users": 15,
            "storage_gb": 20,
            "estimated_api_calls": 80_000,
        },
    )
    assert first.status_code == 201
    first_data = first.json()
    assert first_data["currency"] == "EUR"
    assert first_data["breakdown"] == {
        "plan_fixed_eur": 29.0,
        "users_cost_eur": 140.0,
        "extra_storage_gb": 0,
        "extra_storage_cost_eur": 0.0,
        "extra_api_calls": 0,
        "extra_api_cost_eur": 0.0,
        "subtotal_eur": 169.0,
        "tax_rate_percent": 21.0,
        "tax_amount_eur": 35.49,
        "total_eur": 204.49,
    }

    second = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer_id,
            "active_users": 0,
            "storage_gb": 85,
            "estimated_api_calls": 250_000,
        },
    )
    assert second.status_code == 201
    second_data = second.json()
    assert second_data["breakdown"]["users_cost_eur"] == 0.0
    assert second_data["breakdown"]["extra_storage_cost_eur"] == 33.0
    assert second_data["breakdown"]["extra_api_cost_eur"] == 9.0
    assert second_data["breakdown"]["subtotal_eur"] == 71.0

    history = client.get(f"/api/v1/customers/{customer_id}/simulations")
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 2
    assert items[0]["id"] == second_data["id"]
    assert items[1]["id"] == first_data["id"]


def test_simulation_hard_cap_rejection_and_override(client: TestClient) -> None:
    """Verify HARD_CAP blocks over-limit usage while per-simulation override allows PROGRESSIVE."""
    customer_id = _create_customer(client, overage_policy="HARD_CAP", tax_id="A58818501")

    blocked = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer_id,
            "active_users": 10,
            "storage_gb": 40,
            "estimated_api_calls": 100_000,
        },
    )
    assert blocked.status_code == 422
    assert blocked.json()["code"] == "PLAN_LIMIT_EXCEEDED"

    overridden = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer_id,
            "active_users": 10,
            "storage_gb": 40,
            "estimated_api_calls": 100_000,
            "overage_policy": "PROGRESSIVE",
        },
    )
    assert overridden.status_code == 201
    assert overridden.json()["overage_policy_applied"] == "PROGRESSIVE"
    assert overridden.json()["breakdown"]["extra_storage_cost_eur"] == 7.5


def test_simulation_returns_404_for_unknown_customer(client: TestClient) -> None:
    """Verify POST and GET simulation endpoints return 404 when customer_id is missing."""
    post_resp = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": 9999,
            "active_users": 5,
            "storage_gb": 10,
            "estimated_api_calls": 1000,
        },
    )
    assert post_resp.status_code == 404

    get_resp = client.get("/api/v1/customers/9999/simulations")
    assert get_resp.status_code == 404

