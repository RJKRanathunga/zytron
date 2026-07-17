from __future__ import annotations

from functools import wraps

from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.errors import PermissionDenied, ResourceNotFound
from app.extensions import db
from app.models import User


def current_user() -> User:
    verify_jwt_in_request()
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        raise PermissionDenied("Authentication is required.")
    return user


def role_required(*roles: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if user.role not in roles:
                raise PermissionDenied("This endpoint is not available for your role.")
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_owner_resource(condition: bool):
    if not condition:
        raise ResourceNotFound("The requested resource was not found.")


def ensure_role(user: User, role: str):
    if user.role != role:
        raise PermissionDenied(f"A {role} account is required.")
