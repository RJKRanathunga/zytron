from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

from flask import current_app


@dataclass(frozen=True)
class CheckoutResult:
    checkout_url: str
    provider_reference: str
    provider: str
    status: str = "pending"


@dataclass(frozen=True)
class VerifiedPaymentEvent:
    event_id: str
    event_type: str
    provider_reference: str
    status: str
    metadata: dict[str, Any]


class PaymentProvider(Protocol):
    name: str

    def create_subscription_checkout(self, input: dict[str, Any]) -> CheckoutResult:
        ...

    def create_one_time_checkout(self, input: dict[str, Any]) -> CheckoutResult:
        ...

    def cancel_subscription(self, provider_subscription_id: str) -> None:
        ...

    def verify_webhook(self, payload: dict[str, Any], headers: dict[str, Any]) -> VerifiedPaymentEvent:
        ...

    def get_payment_status(self, provider_payment_id: str) -> str:
        ...


class MockPaymentProvider:
    name = "mock"

    def create_subscription_checkout(self, input: dict[str, Any]) -> CheckoutResult:
        subscription_id = input["subscription_id"]
        return CheckoutResult(
            checkout_url=f"/dev/mock-payments/subscriptions/{subscription_id}",
            provider_reference=f"mock-sub-{subscription_id}",
            provider=self.name,
        )

    def create_one_time_checkout(self, input: dict[str, Any]) -> CheckoutResult:
        listing_payment_id = input["listing_payment_id"]
        return CheckoutResult(
            checkout_url=f"/dev/mock-payments/listings/{listing_payment_id}",
            provider_reference=f"mock-lpay-{listing_payment_id}",
            provider=self.name,
        )

    def cancel_subscription(self, provider_subscription_id: str) -> None:
        return None

    def verify_webhook(self, payload: dict[str, Any], headers: dict[str, Any]) -> VerifiedPaymentEvent:
        del headers
        event_type = payload.get("event_type") or payload.get("type") or ""
        provider_reference = payload.get("provider_reference") or payload.get("provider_payment_id") or ""
        event_id = payload.get("event_id") or f"mock-{event_type}-{provider_reference}"
        status = payload.get("status") or "paid"
        return VerifiedPaymentEvent(
            event_id=event_id,
            event_type=event_type,
            provider_reference=provider_reference,
            status=status,
            metadata=payload.get("metadata") or {},
        )

    def get_payment_status(self, provider_payment_id: str) -> str:
        return "paid" if provider_payment_id else "pending"


def get_payment_provider(provider: str | None = None) -> PaymentProvider:
    provider_name = provider or current_app.config.get("PAYMENT_PROVIDER", "mock")
    if provider_name != "mock":
        raise RuntimeError(f"Payment provider '{provider_name}' is not configured.")
    if current_app.config.get("ENV") == "production" or current_app.config.get("FLASK_ENV") == "production":
        raise RuntimeError("Mock payments are disabled in production.")
    return MockPaymentProvider()


def checkout_payload(*, seller_id: str, package_code: str, amount: Decimal, currency: str, resource_id: str) -> dict[str, Any]:
    return {
        "seller_id": seller_id,
        "package_code": package_code,
        "amount": str(amount),
        "currency": currency,
        "resource_id": resource_id,
    }
