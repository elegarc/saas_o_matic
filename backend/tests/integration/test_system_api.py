"""Integration tests for system health and reference metadata endpoints."""

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/health reports database connectivity."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_countries_and_plans_catalog_endpoints(client: TestClient) -> None:
    """Verify GET /countries and GET /plans return expected catalogs."""
    countries_resp = client.get("/api/v1/countries")
    assert countries_resp.status_code == 200
    countries = countries_resp.json()
    assert len(countries) == 12
    spain = next(item for item in countries if item["country_code"] == "ES")
    assert spain["tax_rate_percent"] == 21.0
    assert spain["strict_tax_id_validation"] is True

    plans_resp = client.get("/api/v1/plans")
    assert plans_resp.status_code == 200
    plans = plans_resp.json()
    assert [plan["code"] for plan in plans] == ["STARTER", "PRO", "ENTERPRISE"]
    starter = plans[0]
    assert starter["fixed_monthly_eur"] == 29.0
    assert starter["included_storage_gb"] == 25
    assert starter["included_api_calls"] == 100_000

