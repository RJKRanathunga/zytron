from __future__ import annotations

from functools import wraps

from app.errors import ApiError, PermissionDenied, ResourceNotFound
from app.extensions import db
from app.firebase_auth import verify_firebase_token
from app.models import User


def current_user() -> User:
    decoded = verify_firebase_token()
    uid = decoded.get("uid")
    email = (decoded.get("email") or "").lower()
    user = User.query.filter_by(firebase_uid=uid).first() if uid else None
    if user is None and email:
        user = User.query.filter_by(email=email).first()
        if user and uid:
            if user.firebase_uid and user.firebase_uid != uid:
                raise ApiError("account_identity_mismatch", "This email is linked to a different Firebase account.", 403)
            user.firebase_uid = uid
            db.session.flush()
    if not user or not user.is_active:
        raise ApiError("account_not_registered", "This Firebase account is not registered in Zytron.", 403)
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
