from __future__ import annotations


def test_owner_cannot_edit_another_owner_bin(client, auth_header):
    registered = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other.owner@example.test",
            "password": "StrongPass123!",
            "first_name": "Other",
            "last_name": "Owner",
            "role": "owner",
        },
    )
    token = registered.get_json()["data"]["accessToken"]
    response = client.patch("/api/v1/bins/bin-a-03", headers=auth_header(token), json={"name": "Nope"})
    assert response.status_code == 404


def test_owner_cannot_accept_offer_on_another_owner_lot(client, auth_header):
    registered = client.post(
        "/api/v1/auth/register",
        json={
            "email": "separate.owner@example.test",
            "password": "StrongPass123!",
            "first_name": "Separate",
            "last_name": "Owner",
            "role": "owner",
        },
    )
    token = registered.get_json()["data"]["accessToken"]
    response = client.post("/api/v1/offers/offer-greennova/accept", headers=auth_header(token), json={})
    assert response.status_code == 404


def test_message_permissions_and_send(client, collector_token, second_collector_token, auth_header):
    sent = client.post(
        "/api/v1/message-threads/thread-greennova-uom/messages",
        headers=auth_header(collector_token),
        json={"message": "Arriving soon."},
    )
    assert sent.status_code == 201
    assert sent.get_json()["data"]["body"] == "Arriving soon."

    denied = client.get("/api/v1/message-threads/thread-greennova-uom/messages", headers=auth_header(second_collector_token))
    assert denied.status_code == 404


def test_dashboards_and_impact(client, owner_token, collector_token, auth_header):
    owner_dashboard = client.get("/api/v1/dashboard/owner", headers=auth_header(owner_token))
    assert owner_dashboard.status_code == 200
    assert owner_dashboard.get_json()["data"]["smartBins"]

    collector_dashboard = client.get("/api/v1/dashboard/collector", headers=auth_header(collector_token))
    assert collector_dashboard.status_code == 200
    assert collector_dashboard.get_json()["data"]["lots"]

    impact = client.get("/api/v1/impact/summary", headers=auth_header(owner_token))
    assert impact.status_code == 200
    assert "estimatedCo2SavingsKg" in impact.get_json()["data"]
