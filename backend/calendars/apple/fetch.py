"""
Apple Calendar event fetching and conflict detection.
Uses CalDAV protocol to retrieve events in universal format.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import caldav

from . import auth, transform


def list_events(
    user_id: str,
    max_results: int = 100,
    time_min: Optional[str] = None,
    calendar_id: str = 'primary'
) -> List[Dict[str, Any]]:
    """
    Fetch events from Apple Calendar in universal format.

    Args:
        user_id: User's UUID
        max_results: Maximum number of events to return (default 100)
        time_min: ISO format datetime to filter events (optional)
        calendar_id: Calendar ID (default 'primary' which uses the user's default calendar)

    Returns:
        List of events in universal (Google Calendar) format

    Raises:
        ValueError: If user not authenticated or CalDAV query fails
    """
    # Get CalDAV client
    client = auth.get_caldav_client(user_id)
    if not client:
        raise ValueError(f"User {user_id} not authenticated with Apple Calendar")

    try:
        # Get default calendar
        calendar = auth.get_default_calendar(client)

        # Parse time_min if provided
        start_date = None
        if time_min:
            start_date = datetime.fromisoformat(time_min.replace('Z', '+00:00'))
        else:
            # Default to today
            start_date = datetime.now()

        # Query events from start_date onwards (next 365 days)
        end_date = start_date + timedelta(days=365)

        # Search for events in date range
        events = calendar.date_search(
            start=start_date,
            end=end_date,
            expand=True
        )

        # Convert to universal format
        universal_events = []
        for event in events[:max_results]:  # Limit results
            try:
                # Get the iCalendar data
                ical_string = event.data

                # Parse and convert to universal format
                parsed_events = transform.parse_ical_string(ical_string)
                universal_events.extend(parsed_events)

            except Exception as e:
                print(f"Error converting Apple event to universal format: {e}")
                continue

        # Sort by start time
        universal_events.sort(
            key=lambda e: e.get('start', {}).get('dateTime') or e.get('start', {}).get('date', '')
        )

        return universal_events[:max_results]

    except Exception as e:
        raise ValueError(f"Failed to fetch Apple Calendar events: {str(e)}")


def check_conflicts(
    user_id: str,
    start_time: str,
    end_time: str,
    calendar_id: str = 'primary'
) -> List[Dict[str, Any]]:
    """
    Check for scheduling conflicts in Apple Calendar.

    Args:
        user_id: User's UUID
        start_time: ISO format start datetime
        end_time: ISO format end datetime
        calendar_id: Calendar ID (default 'primary')

    Returns:
        List of conflicting events in universal format

    Raises:
        ValueError: If user not authenticated or CalDAV query fails
    """
    # Get CalDAV client
    client = auth.get_caldav_client(user_id)
    if not client:
        raise ValueError(f"User {user_id} not authenticated with Apple Calendar")

    try:
        # Get default calendar
        calendar = auth.get_default_calendar(client)

        # Parse start and end times
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))

        # Search for events in date range
        events = calendar.date_search(
            start=start_dt,
            end=end_dt,
            expand=True
        )

        # Convert to universal format
        conflicts = []
        for event in events:
            try:
                # Get the iCalendar data
                ical_string = event.data

                # Parse and convert to universal format
                parsed_events = transform.parse_ical_string(ical_string)

                for parsed_event in parsed_events:
                    # Skip cancelled events
                    if parsed_event.get('status') == 'cancelled':
                        continue

                    # Check if event actually overlaps with the requested time range
                    event_start = parsed_event.get('start', {}).get('dateTime')
                    event_end = parsed_event.get('end', {}).get('dateTime')

                    if event_start and event_end:
                        event_start_dt = datetime.fromisoformat(event_start.replace('Z', '+00:00'))
                        event_end_dt = datetime.fromisoformat(event_end.replace('Z', '+00:00'))

                        # Check for overlap
                        if event_start_dt < end_dt and event_end_dt > start_dt:
                            conflicts.append(parsed_event)

            except Exception as e:
                print(f"Error converting Apple event to universal format: {e}")
                continue

        return conflicts

    except Exception as e:
        raise ValueError(f"Failed to check Apple Calendar conflicts: {str(e)}")
