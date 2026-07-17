from __future__ import annotations

from app.services.seed_data import DEMO_PASSWORD


def test_register_login_refresh_and_protected_endpoint(client, auth_header):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.collector@example.test",
            "password": "StrongPass123!",
            "first_name": "New",
            "last_name": "Collector",
            "role": "collector",
            "organization_name": "New Collector Co",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["user"]["role"] == "collector"

    login = client.post("/api/v1/auth/login", json={"email": "new.collector@example.test", "password": "StrongPass123!"})
    assert login.status_code == 200
    refresh_token = login.get_json()["data"]["refreshToken"]

    refreshed = client.post("/api/v1/auth/refresh", headers=auth_header(refresh_token))
    assert refreshed.status_code == 200
    assert refreshed.get_json()["data"]["accessToken"]

    protected = client.get("/api/v1/users/me")
    assert protected.status_code == 401


def test_register_owner_and_invalid_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.owner@example.test",
            "password": "StrongPass123!",
            "first_name": "New",
            "last_name": "Owner",
            "role": "owner",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["user"]["role"] == "owner"

    invalid = client.post("/api/v1/auth/login", json={"email": "owner@polyloop.demo", "password": "wrong"})
    assert invalid.status_code == 403


def test_role_restriction(client, collector_token, auth_header):
    response = client.get("/api/v1/dashboard/owner", headers=auth_header(collector_token))
    assert response.status_code == 403


def test_change_password(client, owner_token, auth_header):
    response = client.post(
        "/api/v1/auth/change-password",
        headers=auth_header(owner_token),
        json={"current_password": DEMO_PASSWORD, "new_password": "UpdatedPass123!"},
    )
    assert response.status_code == 200
