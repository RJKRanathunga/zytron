from __future__ import annotations

from pathlib import Path

from flask import Flask

from app.commands import register_commands
from app.config import get_config
from app.errors import register_error_handlers
from app.extensions import cors, db, jwt, ma, migrate
from app.routes import register_blueprints


def create_app(config_object=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object or get_config())
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app import models  # noqa: F401
    from app.models import RevokedToken

    @jwt.token_in_blocklist_loader
    def is_token_revoked(_jwt_header, jwt_payload):
        return db.session.get(RevokedToken, jwt_payload["jti"]) is not None

    @jwt.unauthorized_loader
    def missing_token(reason):
        return {"error": {"code": "authentication_required", "message": reason, "details": {}}}, 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return {"error": {"code": "invalid_token", "message": reason, "details": {}}}, 422

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_payload):
        return {"error": {"code": "token_expired", "message": "The token has expired.", "details": {}}}, 401

    @jwt.revoked_token_loader
    def revoked_token(_jwt_header, _jwt_payload):
        return {"error": {"code": "token_revoked", "message": "The token has been revoked.", "details": {}}}, 401

    register_error_handlers(app)
    register_blueprints(app)
    register_commands(app)

    @app.get("/health")
    def health():
        return {"data": {"status": "ok"}}

    return app
