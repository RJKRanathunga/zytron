from __future__ import annotations

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.services.seed_data import DEMO_PASSWORD, seed_database


class TestConfig(TestingConfig):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-change-me-please-32-bytes"
    SECRET_KEY = "test-secret-change-me-please-32-bytes"


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
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.get_json()
    return response.get_json()["data"]["accessToken"]


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
