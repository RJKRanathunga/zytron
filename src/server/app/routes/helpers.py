from __future__ import annotations

from typing import Any

from flask import jsonify, request
from marshmallow import Schema

from app.errors import ApiError


def data_response(data: Any = None, status: int = 200, meta: dict[str, Any] | None = None):
    body: dict[str, Any] = {"data": data if data is not None else {}}
    if meta is not None:
        body["meta"] = meta
    return jsonify(body), status


def load_payload(schema: Schema) -> dict[str, Any]:
    if not request.is_json:
        raise ApiError("validation_error", "Expected a JSON request body.", 400)
    return schema.load(request.get_json() or {})


def pagination_args(default_per_page: int = 20, max_per_page: int = 100) -> tuple[int, int]:
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", default_per_page)), 1), max_per_page)
    return page, per_page


def paginated_response(query, serializer, *, default_per_page: int = 20):
    page, per_page = pagination_args(default_per_page)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    meta = {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }
    return data_response([serializer(item) for item in pagination.items], meta=meta)
