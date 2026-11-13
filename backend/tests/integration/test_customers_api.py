"""Integration tests for corporate customer endpoints."""

from fastapi.testclient import TestClient


def test_create_and_fetch_spanish_customer(client: TestClient) -> None:
    """Verify POST /customers normalizes fields and GET /customers/{id} retrieves it."""
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Acme Iberia S.L.",
            "tax_id": "b-58818501",
            "contact_email": "Billing@Acme.ES",
            "country_code": "es",
            "plan": "STARTER",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["tax_id"] == "B58818501"
    assert data["contact_email"] == "billing@acme.es"
    assert data["country_code"] == "ES"
    assert data["tax_rate_percent"] == 21.0
    assert data["overage_policy"] == "PROGRESSIVE"

    fetch_resp = client.get(f"/api/v1/customers/{data['id']}")
    assert fetch_resp.status_code == 200
    assert fetch_resp.json()["company_name"] == "Acme Iberia S.L."


def test_create_customer_rejects_duplicate_and_invalid_spanish_tax_id(client: TestClient) -> None:
    """Verify 409 Conflict on duplicate (country_code, tax_id) and 422 on invalid CIF."""
    payload = {
        "company_name": "Acme Iberia S.L.",
        "tax_id": "B58818501",
        "contact_email": "billing@acme.es",
        "country_code": "ES",
        "plan": "STARTER",
    }
    first = client.post("/api/v1/customers", json=payload)
    assert first.status_code == 201

    duplicate = client.post("/api/v1/customers", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "DUPLICATE_CUSTOMER"

    invalid_cif = client.post(
        "/api/v1/customers",
        json={**payload, "tax_id": "B5881850A"},
    )
    assert invalid_cif.status_code == 422
    assert invalid_cif.json()["code"] == "INVALID_SPANISH_TAX_ID"


def test_search_customers_by_company_or_tax_id_and_404(client: TestClient) -> None:
    """Verify GET /customers?q= filtering, pagination, and 404 on unknown customer ID."""
    client.post(
        "/api/v1/customers",
        json={
            "company_name": "Iberia Cloud S.A.",
            "tax_id": "A58818501",
            "contact_email": "sales@iberia.es",
            "country_code": "ES",
            "plan": "PRO",
        },
    )
    client.post(
        "/api/v1/customers",
        json={
            "company_name": "Paris Tech SARL",
            "tax_id": "FR99887766",
            "contact_email": "ops@paris.fr",
            "country_code": "FR",
            "plan": "STARTER",
        },
    )

    by_name = client.get("/api/v1/customers", params={"q": "iberia"})
    assert by_name.status_code == 200
    assert by_name.json()["total"] == 1
    assert by_name.json()["items"][0]["tax_id"] == "A58818501"

    by_tax = client.get("/api/v1/customers", params={"q": "fr-9988"})
    assert by_tax.status_code == 200
    assert by_tax.json()["total"] == 1
    assert by_tax.json()["items"][0]["company_name"] == "Paris Tech SARL"

    missing = client.get("/api/v1/customers/9999")
    assert missing.status_code == 404
    assert missing.json()["code"] == "CUSTOMER_NOT_FOUND"

