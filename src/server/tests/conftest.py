from __future__ import annotations

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.services.seed_data import DEMO_PASSWORD, seed_database


class TestConfig(TestingConfig):
    JWT_SECRET_KEY = "test-jwt-secret-change-me-please-32-bytes"
    SECRET_KEY = "test-secret-change-me-please-32-bytes"

    @staticmethod
    def FIREBASE_TOKEN_VERIFIER(token: str):
        email = token.lower()
        return {"uid": f"test-{email}", "email": email}


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_database()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def login(client, email: str, password: str = DEMO_PASSWORD) -> str:
    del password
    response = client.post("/api/v1/auth/login", headers={"Authorization": f"Bearer {email}"}, json={})
    assert response.status_code == 200, response.get_json()
    return email


@pytest.fixture()
def owner_token(client):
    return login(client, "owner@polyloop.demo")


@pytest.fixture()
def collector_token(client):
    return login(client, "collector@polyloop.demo")


@pytest.fixture()
def second_collector_token(client):
    return login(client, "secondlife.collector@polyloop.demo")


@pytest.fixture()
def auth_header():
    def build(token: str):
        return {"Authorization": f"Bearer {token}"}

    return build
