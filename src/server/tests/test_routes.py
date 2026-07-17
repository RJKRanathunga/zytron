from __future__ import annotations


def test_create_route_add_remove_and_reorder(client, collector_token, auth_header):
    created = client.post(
        "/api/v1/routes",
        headers=auth_header(collector_token),
        json={"lotIds": ["lot-uom-pp", "lot-kesbewa-pp"], "date": "Sat 18 Jul", "name": "Saturday route"},
    )
    assert created.status_code == 201, created.get_json()
    route = created.get_json()["data"]
    assert route["estimatedTotalWeightKg"] > 0
    assert len(route["stops"]) == 2

    route_id = route["id"]
    stop_id = route["stops"][0]["id"]
    removed = client.delete(f"/api/v1/routes/{route_id}/stops/{stop_id}", headers=auth_header(collector_token))
    assert removed.status_code == 200

    reordered = client.post(
        f"/api/v1/routes/{route_id}/reorder",
        headers=auth_header(collector_token),
        json={"stopIds": [stop["id"] for stop in removed.get_json()["data"]["stops"]]},
    )
    assert reordered.status_code == 200


def test_route_ownership_enforced(client, second_collector_token, auth_header):
    response = client.get("/api/v1/routes/route-pp-saturday", headers=auth_header(second_collector_token))
    assert response.status_code == 404
