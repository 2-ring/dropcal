"""
Apple Calendar authentication and credential management.
Handles CalDAV credentials (Apple ID + app-specific password).
"""

from typing import Optional, Dict, Any
import caldav

from database.models import User


CALDAV_URL = 'https://caldav.icloud.com'


def load_credentials(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Load Apple Calendar credentials from database.

    Args:
        user_id: User's UUID from Supabase auth

    Returns:
        Dict with apple_id and app_password or None if not connected

    Raises:
        ValueError: If user not found
    """
    user = User.get_by_id(user_id)

    if not user:
        raise ValueError(f"User {user_id} not found")

    # Get decrypted tokens (which for Apple are apple_id and app_password)
    tokens = User.get_provider_tokens(user_id, 'apple')

    if not tokens:
        # User hasn't connected Apple Calendar yet
        return None

    apple_id = tokens.get('apple_id')
    app_password = tokens.get('app_password')

    if not apple_id or not app_password:
        # Missing credentials
        raise ValueError(f"Invalid Apple Calendar credentials for user {user_id}")

    return {
        'apple_id': apple_id,
        'app_password': app_password
    }


def is_authenticated(user_id: str) -> bool:
    """
    Check if user has valid Apple Calendar credentials.

    Args:
        user_id: User's UUID

    Returns:
        True if user has valid credentials
    """
    try:
        credentials = load_credentials(user_id)
        if not credentials:
            return False

        # Try to create a client to verify credentials work
        client = get_caldav_client(user_id)
        return client is not None
    except Exception:
        return False


def get_caldav_client(user_id: str) -> Optional[caldav.DAVClient]:
    """
    Get a configured CalDAV client for the user.

    Args:
        user_id: User's UUID

    Returns:
        Configured caldav.DAVClient instance or None if not authenticated

    Raises:
        ValueError: If credentials invalid or connection fails
    """
    credentials = load_credentials(user_id)
    if not credentials:
        return None

    apple_id = credentials['apple_id']
    app_password = credentials['app_password']

    try:
        # Create CalDAV client
        client = caldav.DAVClient(
            url=CALDAV_URL,
            username=apple_id,
            password=app_password
        )

        # Test connection by getting principal
        principal = client.principal()
        if not principal:
            raise ValueError("Failed to connect to Apple Calendar")

        return client

    except Exception as e:
        raise ValueError(f"Failed to create CalDAV client: {str(e)}")


def get_default_calendar(client: caldav.DAVClient):
    """
    Get the user's default calendar from CalDAV.

    Args:
        client: Configured caldav.DAVClient instance

    Returns:
        caldav.Calendar instance

    Raises:
        ValueError: If no calendars found
    """
    try:
        principal = client.principal()
        calendars = principal.calendars()

        if not calendars:
            raise ValueError("No calendars found in Apple Calendar account")

        # Return first calendar (usually the default)
        return calendars[0]

    except Exception as e:
        raise ValueError(f"Failed to get default calendar: {str(e)}")


def store_apple_credentials(user_id: str, apple_id: str, app_password: str) -> None:
    """
    Store Apple Calendar credentials (app-specific password).

    This should be called when the user connects their Apple Calendar.
    Ensures the provider connection exists and has 'calendar' in usage array.

    Args:
        user_id: User's Supabase user ID
        apple_id: User's Apple ID (email)
        app_password: App-specific password generated from appleid.apple.com

    Raises:
        ValueError: If credentials are invalid or connection test fails
    """
    if not apple_id or not app_password:
        raise ValueError("Both apple_id and app_password are required")

    # Test credentials before storing
    try:
        test_client = caldav.DAVClient(
            url=CALDAV_URL,
            username=apple_id,
            password=app_password
        )
        test_principal = test_client.principal()
        if not test_principal:
            raise ValueError("Invalid Apple Calendar credentials")
    except Exception as e:
        raise ValueError(f"Failed to verify Apple Calendar credentials: {str(e)}")

    # Get user to check provider connections
    user = User.get_by_id(user_id)
    if not user:
        raise ValueError(f"User {user_id} not found")

    # Check if Apple provider connection exists
    apple_conn = User.get_provider_connection(user_id, 'apple')

    if not apple_conn:
        # No Apple connection yet - create one
        User.add_provider_connection(
            user_id=user_id,
            provider='apple',
            provider_id=apple_id,  # Use Apple ID as provider_id
            email=apple_id,
            usage=['calendar']
        )
    else:
        # Update usage to include 'calendar' if not already present
        usage = apple_conn.get('usage', [])
        if 'calendar' not in usage:
            usage.append('calendar')
            User.update_provider_usage(user_id, 'apple', usage)

    # Store the encrypted credentials
    User.update_provider_tokens(
        user_id=user_id,
        provider='apple',
        tokens={
            'apple_id': apple_id,
            'app_password': app_password
        }
    )

    # Set as primary calendar provider if none is set
    if not user.get('primary_calendar_provider'):
        User.set_primary_calendar(user_id, 'apple')
