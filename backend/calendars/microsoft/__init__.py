"""
Microsoft Calendar integration module.
Provides auth, fetch, create, and transform functionality for Microsoft Calendar via Graph API.
"""

from . import auth
from . import fetch
from . import create
from . import transform

__all__ = ['auth', 'fetch', 'create', 'transform']
