"""
Database module for Supabase integration.
Provides models and client for database operations.
"""

from .supabase_client import get_supabase, SupabaseClient
from .models import User, Session

__all__ = ['get_supabase', 'SupabaseClient', 'User', 'Session']