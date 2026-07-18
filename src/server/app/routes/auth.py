from __future__ import annotations

from flask import Blueprint, current_app, request

from app.extensions import db
from app.firebase_auth import verify_firebase_token
from app.models import Organization, User
from app.models.base import new_id
from app.routes.helpers import data_response, load_payload
from app.schemas import LoginSchema, RegisterSchema
from app.services.workflows import snapshot_for
from app.errors import ApiError, PermissionDenied

bp = Blueprint("auth", __name__, url_prefix="/auth")


def auth_user(user: User) -> dict:
    org_name = user.organization.name if user.organization else user.display_name
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "firebaseUid": user.firebase_uid,
        "name": org_name,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "organization": org_name,
    }


def auth_payload(user: User) -> dict:
    return {
        "user": auth_user(user),
        "snapshot": snapshot_for(user) if user.role in {"collector", "owner"} else None,
    }


def firebase_identity() -> tuple[str, str]:
    decoded = verify_firebase_token()
    uid = decoded.get("uid")
    email = (decoded.get("email") or "").lower()
    if not uid or not email:
        current_app.logger.warning(
            "Authentication failed for %s %s: Firebase token missing uid or email.",
            request.method,
            request.path,
        )
        raise ApiError("invalid_firebase_profile", "Firebase did not return a verified user email.", 401)
    return uid, email


def find_user(uid: str, email: str) -> User | None:
    user = User.query.filter_by(firebase_uid=uid).first()
    if user:
        return user
    user = User.query.filter_by(email=email).first()
    if user:
        if not user.firebase_uid:
            current_app.logger.info("Linking PostgreSQL user %s to Firebase uid %s.", user.id, uid)
            user.firebase_uid = uid
        db.session.flush()
    return user


def create_user(uid: str, email: str, payload: dict) -> User:
    role = payload["role"]
    org_name = payload.get("organization_name") or f"{payload['first_name']} {payload['last_name']}"
    organization = Organization(
        id=new_id("org"),
        name=org_name,
        organization_type=role,
        email=email,
        phone=payload.get("phone") or "",
    )
    user = User(
        id=new_id("usr"),
        email=email,
        firebase_uid=uid,
        password_hash=None,
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        phone=payload.get("phone") or "",
        role=role,
        organization=organization,
        is_active=True,
        is_verified=True,
        vehicle_capacity_kg=100 if role == "collector" else 0,
    )
    db.session.add_all([organization, user])
    return user


@bp.post("/register")
def register():
    payload = load_payload(RegisterSchema())
    uid, email = firebase_identity()
    user = find_user(uid, email)
    if user and user.firebase_uid != uid:
        current_app.logger.warning("Registration rejected for %s: email is linked to another Firebase uid.", email)
        raise ApiError("email_already_registered", "An account with this email already exists.", 409)
    if user is None:
        current_app.logger.info("Creating PostgreSQL %s user for Firebase uid %s email %s.", payload["role"], uid, email)
        user = create_user(uid, email, payload)
    elif user.role != payload["role"]:
        current_app.logger.warning(
            "Registration rejected for %s: requested role %s but existing role is %s.",
            email,
            payload["role"],
            user.role,
        )
        raise PermissionDenied(f"Please sign in with your existing {user.role} account.")
    if not user.is_active:
        current_app.logger.warning("Registration rejected for %s: PostgreSQL user is inactive.", email)
        raise PermissionDenied("This account is inactive.")
    user.touch_login()
    db.session.commit()
    return data_response(auth_payload(user), 201)


@bp.post("/login")
def login():
    payload = load_payload(LoginSchema())
    uid, email = firebase_identity()
    user = find_user(uid, email)
    if user and user.firebase_uid != uid:
        current_app.logger.warning("Login rejected for %s: email is linked to another Firebase uid.", email)
        raise ApiError("account_identity_mismatch", "This email is linked to a different Firebase account.", 403)
    if user is None:
        if not payload.get("role") or not payload.get("first_name") or not payload.get("last_name"):
            current_app.logger.warning(
                "Login rejected for Firebase uid %s email %s: PostgreSQL user is missing and role/profile data was not supplied.",
                uid,
                email,
            )
            raise ApiError(
                "account_setup_required",
                "Choose a role and create your Zytron profile before continuing.",
                403,
            )
        current_app.logger.info("Creating PostgreSQL %s user during first login for Firebase uid %s email %s.", payload["role"], uid, email)
        user = create_user(uid, email, payload)
    if not user.is_active:
        current_app.logger.warning("Login rejected for %s: PostgreSQL user is inactive.", email)
        raise PermissionDenied("This account is inactive.")
    user.touch_login()
    db.session.commit()
    return data_response(auth_payload(user))


@bp.post("/logout")
def logout():
    return data_response({"signedOut": True})


@bp.get("/me")
def me():
    uid, email = firebase_identity()
    user = find_user(uid, email)
    if not user or not user.is_active:
        current_app.logger.warning(
            "Current-user lookup rejected for Firebase uid %s email %s: no active PostgreSQL user.",
            uid,
            email,
        )
        raise PermissionDenied("Authentication is required.")
    db.session.commit()
    return data_response({"user": auth_user(user), "snapshot": snapshot_for(user) if user.role in {"collector", "owner"} else None})
