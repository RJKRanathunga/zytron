from __future__ import annotations

from flask import Blueprint
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import Organization, RevokedToken, User
from app.models.base import new_id
from app.routes.helpers import data_response, load_payload
from app.schemas import ChangePasswordSchema, LoginSchema, RegisterSchema
from app.services.workflows import snapshot_for
from app.errors import ApiError, PermissionDenied

bp = Blueprint("auth", __name__, url_prefix="/auth")


def auth_user(user: User) -> dict:
    org_name = user.organization.name if user.organization else user.display_name
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "name": org_name,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "organization": org_name,
    }


def token_payload(user: User) -> dict:
    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=user.id, additional_claims={"role": user.role})
    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": auth_user(user),
        "snapshot": snapshot_for(user) if user.role in {"collector", "owner"} else None,
    }


@bp.post("/register")
def register():
    payload = load_payload(RegisterSchema())
    email = payload["email"].lower()
    if User.query.filter_by(email=email).first():
        raise ApiError("email_already_registered", "An account with this email already exists.", 409)

    org_name = payload.get("organization_name") or f"{payload['first_name']} {payload['last_name']}"
    organization = Organization(
        id=new_id("org"),
        name=org_name,
        organization_type=payload["role"],
        email=email,
        phone=payload.get("phone") or "",
    )
    user = User(
        id=new_id("usr"),
        email=email,
        password_hash=generate_password_hash(payload["password"]),
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        phone=payload.get("phone") or "",
        role=payload["role"],
        organization=organization,
        is_active=True,
        is_verified=True,
        vehicle_capacity_kg=100 if payload["role"] == "collector" else 0,
    )
    db.session.add_all([organization, user])
    db.session.commit()
    return data_response(token_payload(user), 201)


@bp.post("/login")
def login():
    payload = load_payload(LoginSchema())
    user = User.query.filter_by(email=payload["email"].lower()).first()
    if not user or not check_password_hash(user.password_hash, payload["password"]):
        raise PermissionDenied("Invalid email or password.")
    if not user.is_active:
        raise PermissionDenied("This account is inactive.")
    user.touch_login()
    db.session.commit()
    return data_response(token_payload(user))


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        raise PermissionDenied("Authentication is required.")
    return data_response({"accessToken": create_access_token(identity=user.id, additional_claims={"role": user.role})})


@bp.post("/logout")
@jwt_required(verify_type=False)
def logout():
    token = get_jwt()
    revoked = RevokedToken(jti=token["jti"], token_type=token.get("type", "access"), user_id=get_jwt_identity())
    db.session.merge(revoked)
    db.session.commit()
    return data_response({"revoked": True})


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        raise PermissionDenied("Authentication is required.")
    return data_response({"user": auth_user(user), "snapshot": snapshot_for(user) if user.role in {"collector", "owner"} else None})


@bp.post("/change-password")
@jwt_required()
def change_password():
    payload = load_payload(ChangePasswordSchema())
    user = db.session.get(User, get_jwt_identity())
    if not user or not check_password_hash(user.password_hash, payload["current_password"]):
        raise PermissionDenied("Current password is incorrect.")
    user.password_hash = generate_password_hash(payload["new_password"])
    db.session.commit()
    return data_response({"changed": True})
