from __future__ import annotations


def test_register_login_and_protected_endpoint(client, auth_header):
    token = "new.collector@example.test"
    response = client.post(
        "/api/v1/auth/register",
        headers=auth_header(token),
        json={
            "first_name": "New",
            "last_name": "Collector",
            "role": "collector",
            "organization_name": "New Collector Co",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["user"]["role"] == "collector"
    assert "accessToken" not in response.get_json()["data"]

    login = client.post("/api/v1/auth/login", headers=auth_header(token), json={})
    assert login.status_code == 200

    protected = client.get("/api/v1/users/me")
    assert protected.status_code == 401


def test_register_owner_and_invalid_password(client):
    token = "new.owner@example.test"
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "New",
            "last_name": "Owner",
            "role": "owner",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["user"]["role"] == "owner"

    invalid = client.post("/api/v1/auth/login", json={})
    assert invalid.status_code == 401


def test_role_restriction(client, collector_token, auth_header):
    response = client.get("/api/v1/dashboard/owner", headers=auth_header(collector_token))
    assert response.status_code == 403


def test_first_google_login_can_create_profile(client, auth_header):
    token = "google.owner@example.test"
    response = client.post(
        "/api/v1/auth/login",
        headers=auth_header(token),
        json={
            "first_name": "Google",
            "last_name": "Owner",
            "role": "owner",
            "organization_name": "Google Owner Co",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["user"]["firebaseUid"] == f"test-{token}"
