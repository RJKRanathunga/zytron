from __future__ import annotations

import json
from typing import Any

from flask import current_app, request

from app.errors import ApiError

try:
    import firebase_admin
    from firebase_admin import auth as firebase_admin_auth
    from firebase_admin import credentials
except ImportError:  # pragma: no cover - exercised only before dependencies are installed
    firebase_admin = None
    firebase_admin_auth = None
    credentials = None


class FirebaseAuthError(ApiError):
    def __init__(self, message: str = "Authentication is required.", status_code: int = 401):
        super().__init__("authentication_required", message, status_code)


def init_firebase_admin(app) -> None:
    if app.config.get("FIREBASE_TOKEN_VERIFIER"):
        return
    if firebase_admin is None:
        app.logger.warning("firebase-admin is not installed; Firebase token verification is unavailable.")
        return
    if firebase_admin._apps:
        app.logger.info("Firebase Admin already initialized; reusing existing app.")
        return

    options = {}
    if app.config.get("FIREBASE_PROJECT_ID"):
        options["projectId"] = app.config["FIREBASE_PROJECT_ID"]

    credentials_json = app.config.get("FIREBASE_CREDENTIALS_JSON")
    credentials_file = app.config.get("FIREBASE_CREDENTIALS_FILE")
    if credentials_json:
        credential = credentials.Certificate(json.loads(credentials_json))
    elif credentials_file:
        credential = credentials.Certificate(credentials_file)
    else:
        credential = credentials.ApplicationDefault()

    firebase_admin.initialize_app(credential, options or None)
    app.logger.info("Firebase Admin initialized for project %s.", options.get("projectId") or "from credentials")


def bearer_token() -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        current_app.logger.warning(
            "Firebase auth rejected %s %s: missing or malformed Authorization bearer token.",
            request.method,
            request.path,
        )
        raise FirebaseAuthError()
    return token


def verify_firebase_token(id_token: str | None = None) -> dict[str, Any]:
    token = id_token or bearer_token()
    verifier = current_app.config.get("FIREBASE_TOKEN_VERIFIER")
    if verifier:
        return verifier(token)
    if firebase_admin_auth is None:
        raise FirebaseAuthError("Firebase Admin is not configured on the server.")
    try:
        decoded = firebase_admin_auth.verify_id_token(token, check_revoked=True)
        firebase_user = firebase_admin_auth.get_user(decoded["uid"])
    except Exception as error:  # Firebase Admin raises several concrete auth errors.
        message = str(error)
        current_app.logger.warning(
            "Firebase auth rejected %s %s: invalid Firebase ID token (%s).",
            request.method,
            request.path,
            message,
        )
        if "disabled" in message.lower():
            raise FirebaseAuthError("This account has been disabled.", 403) from error
        raise FirebaseAuthError("Your session could not be verified.") from error
    if firebase_user.disabled:
        current_app.logger.warning(
            "Firebase auth rejected %s %s: disabled Firebase user %s.",
            request.method,
            request.path,
            decoded.get("uid"),
        )
        raise FirebaseAuthError("This account has been disabled.", 403)
    return decoded
