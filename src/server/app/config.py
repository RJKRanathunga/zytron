from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote, quote_plus

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def build_postgresql_uri(*, database: str | None = None) -> str:
    required = ["PG_HOST", "PG_PORT", "PG_DATABASE", "PG_USER", "PG_PASSWORD"]
    missing = [name for name in required if name not in os.environ]
    if missing:
        raise RuntimeError(f"Missing PostgreSQL environment variable(s): {', '.join(missing)}")

    host = os.environ["PG_HOST"]
    port = os.environ["PG_PORT"]
    db_name = database or os.environ["PG_DATABASE"]
    user = os.environ["PG_USER"]
    password = os.environ["PG_PASSWORD"]

    auth = quote_plus(user)
    if password:
        auth = f"{auth}:{quote_plus(password)}"
    return f"postgresql+psycopg://{auth}@{host}:{port}/{quote(db_name)}"


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-please-32-bytes")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me-please-32-bytes")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = build_postgresql_uri()
    SQLALCHEMY_ENGINE_OPTIONS = {"connect_args": {"connect_timeout": int(os.getenv("PG_CONNECT_TIMEOUT", "10"))}}
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "30")))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "14")))
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174",
        ).split(",")
        if origin.strip()
    ]
    JSON_SORT_KEYS = False
    MAX_PAGE_SIZE = 100
    GOOGLE_MAPS_SERVER_API_KEY = os.getenv("GOOGLE_MAPS_SERVER_API_KEY", "")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        build_postgresql_uri(database=os.getenv("PG_TEST_DATABASE", f"{os.environ['PG_DATABASE']}_test")),
    )


class ProductionConfig(BaseConfig):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config():
    return config_by_name.get(os.getenv("FLASK_ENV", "development"), DevelopmentConfig)
