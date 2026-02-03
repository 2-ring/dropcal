"""
Supabase client singleton for database operations.
"""

import os
from supabase import create_client, Client
from typing import Optional


class SupabaseClient:
    """Singleton class for Supabase client management."""

    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client singleton."""
        if cls._instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")

            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

            cls._instance = create_client(url, key)

        return cls._instance


def get_supabase() -> Client:
    """Convenience function to get Supabase client."""
    return SupabaseClient.get_client()
