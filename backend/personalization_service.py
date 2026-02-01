"""
Personalization Service for managing user preferences.
Handles loading, saving, and applying learned patterns.
"""

import os
import json
from typing import Optional
from datetime import datetime
from user_preferences import UserPreferences
from logging_utils import app_logger


class PersonalizationService:
    """Service for managing user preferences and personalization"""

    def __init__(self, user_data_dir: str = 'user_data'):
        """
        Initialize personalization service.

        Args:
            user_data_dir: Directory to store user preference files
        """
        self.user_data_dir = user_data_dir
        os.makedirs(self.user_data_dir, exist_ok=True)

    def _get_preferences_path(self, user_id: str) -> str:
        """Get file path for user's preferences"""
        return os.path.join(self.user_data_dir, f'{user_id}_preferences.json')

    def load_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """
        Load user preferences from disk.

        Args:
            user_id: User identifier

        Returns:
            UserPreferences object if exists, None otherwise
        """
        preferences_path = self._get_preferences_path(user_id)

        if not os.path.exists(preferences_path):
            app_logger.info(f"No preferences found for user {user_id}")
            return None

        try:
            with open(preferences_path, 'r') as f:
                data = json.load(f)
                preferences = UserPreferences(**data)
                app_logger.info(f"Loaded preferences for user {user_id} (analyzed {preferences.total_events_analyzed} events)")
                return preferences
        except Exception as e:
            app_logger.error(f"Error loading preferences for user {user_id}: {e}")
            return None

    def save_preferences(self, preferences: UserPreferences) -> bool:
        """
        Save user preferences to disk.

        Args:
            preferences: UserPreferences object to save

        Returns:
            True if successful, False otherwise
        """
        preferences_path = self._get_preferences_path(preferences.user_id)

        try:
            # Update last analyzed timestamp
            preferences.last_analyzed = datetime.utcnow().isoformat() + 'Z'

            with open(preferences_path, 'w') as f:
                json.dump(preferences.model_dump(), f, indent=2)

            app_logger.info(f"Saved preferences for user {preferences.user_id}")
            return True

        except Exception as e:
            app_logger.error(f"Error saving preferences for user {preferences.user_id}: {e}")
            return False

    def delete_preferences(self, user_id: str) -> bool:
        """
        Delete user preferences.

        Args:
            user_id: User identifier

        Returns:
            True if successful, False otherwise
        """
        preferences_path = self._get_preferences_path(user_id)

        try:
            if os.path.exists(preferences_path):
                os.remove(preferences_path)
                app_logger.info(f"Deleted preferences for user {user_id}")
                return True
            else:
                app_logger.warning(f"No preferences to delete for user {user_id}")
                return False

        except Exception as e:
            app_logger.error(f"Error deleting preferences for user {user_id}: {e}")
            return False

    def has_preferences(self, user_id: str) -> bool:
        """
        Check if user has saved preferences.

        Args:
            user_id: User identifier

        Returns:
            True if preferences exist, False otherwise
        """
        preferences_path = self._get_preferences_path(user_id)
        return os.path.exists(preferences_path)

    def get_or_create_preferences(self, user_id: str, settings: dict = None) -> UserPreferences:
        """
        Get existing preferences or create new empty ones.

        Args:
            user_id: User identifier
            settings: Optional Google Calendar settings to initialize with

        Returns:
            UserPreferences object
        """
        # Try to load existing
        preferences = self.load_preferences(user_id)

        if preferences:
            return preferences

        # Create new
        app_logger.info(f"Creating new preferences for user {user_id}")

        preferences = UserPreferences(user_id=user_id)

        # Initialize with Google Calendar settings if provided
        if settings:
            preferences.timezone = settings.get('timezone')
            default_length = settings.get('defaultEventLength')
            if default_length:
                try:
                    preferences.default_event_length = int(default_length)
                except (ValueError, TypeError):
                    pass

        return preferences
