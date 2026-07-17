from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from flask import jsonify
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError


@dataclass
class ApiError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict[str, Any] | None = None


class PermissionDenied(ApiError):
    def __init__(self, message: str = "You are not allowed to perform this action."):
        super().__init__("permission_denied", message, 403)


class ResourceNotFound(ApiError):
    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__("resource_not_found", message, 404)


class InvalidState(ApiError):
    def __init__(self, message: str = "The requested status transition is not allowed."):
        super().__init__("invalid_status_transition", message, 422)


class Conflict(ApiError):
    def __init__(self, code: str, message: str):
        super().__init__(code, message, 409)


def error_response(code: str, message: str, status_code: int, details: dict[str, Any] | None = None):
    return jsonify({"error": {"code": code, "message": message, "details": details or {}}}), status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return error_response(error.code, error.message, error.status_code, error.details)

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        return error_response("validation_error", "The request could not be processed.", 400, error.messages)

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error: IntegrityError):
        app.logger.warning("Database integrity error: %s", error)
        return error_response("conflict", "The request conflicts with existing data.", 409)

    @app.errorhandler(404)
    def handle_not_found(_error):
        return error_response("resource_not_found", "The requested endpoint was not found.", 404)

    @app.errorhandler(500)
    def handle_unexpected(error):
        app.logger.exception("Unexpected API error: %s", error)
        return error_response("server_error", "An unexpected server error occurred.", 500)
