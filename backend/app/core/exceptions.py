"""Custom domain and application exceptions."""

from typing import Any


class DomainError(Exception):
    """Base exception for all controlled business and persistence errors."""

    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details


class NotFoundError(DomainError):
    """Raised when a requested resource does not exist (HTTP 404)."""


class ConflictError(DomainError):
    """Raised when a uniqueness constraint is violated (HTTP 409)."""


class BusinessValidationError(DomainError):
    """Raised when domain or business validation rules fail (HTTP 422)."""

