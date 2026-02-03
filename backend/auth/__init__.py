"""Authentication module for DropCal."""

from .middleware import require_auth

__all__ = ['require_auth']
