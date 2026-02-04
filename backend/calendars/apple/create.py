"""
Apple Calendar event creation.
Creates events in Apple Calendar from universal format using CalDAV.
"""

from typing import Dict, Any, List, Tuple, Optional

from . import auth, fetch, transform
from database.models import Session


def create_event(
    user_id: str,
    event_data: Dict[str, Any],
    calendar_id: str = 'primary'
) -> Optional[Dict[str, Any]]:
    """
    Create a single event in Apple Calendar.

    Args:
        user_id: User's UUID
        event_data: Event dict in universal (Google Calendar) format
        calendar_id: Calendar ID (default 'primary')

    Returns:
        Created event in universal format, or None if creation failed

    Raises:
        ValueError: If user not authenticated or CalDAV operation fails
    """
    # Get CalDAV client
    client = auth.get_caldav_client(user_id)
    if not client:
        raise ValueError(f"User {user_id} not authenticated with Apple Calendar")

    try:
        # Get default calendar
        calendar = auth.get_default_calendar(client)

        # Convert to iCalendar format
        ical_calendar = transform.from_universal(event_data)

        # Get the iCalendar string
        ical_string = ical_calendar.to_ical().decode('utf-8')

        # Save event to calendar
        calendar.save_event(ical_string)

        # Return the event data (Apple CalDAV doesn't return created event immediately)
        # So we return the original event data with a generated ID
        return event_data

    except Exception as e:
        print(f"Failed to create Apple Calendar event: {str(e)}")
        return None


def create_events_from_session(
    user_id: str,
    session_id: str,
    calendar_id: str = 'primary'
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Create all events from a session's processed_events in Apple Calendar.

    Checks for conflicts before creating each event.

    Args:
        user_id: User's UUID
        session_id: Session UUID containing processed events
        calendar_id: Calendar ID (default 'primary')

    Returns:
        Tuple of (calendar_event_ids, conflicts):
        - calendar_event_ids: List of created event IDs
        - conflicts: List of conflicting events that prevented creation

    Raises:
        ValueError: If session not found, no events in session, or user not authenticated
    """
    # Get session
    session = Session.get_by_id(session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Get events from session
    events = session.get('processed_events', [])
    if not events:
        raise ValueError(f"No processed events in session {session_id}")

    # Check authentication
    if not auth.is_authenticated(user_id):
        raise ValueError(f"User {user_id} not authenticated with Apple Calendar")

    calendar_event_ids = []
    all_conflicts = []

    for event in events:
        # Check for conflicts
        start_time = event.get('start', {}).get('dateTime')
        end_time = event.get('end', {}).get('dateTime')

        if start_time and end_time:
            try:
                conflicts = fetch.check_conflicts(
                    user_id=user_id,
                    start_time=start_time,
                    end_time=end_time,
                    calendar_id=calendar_id
                )

                if conflicts:
                    # Store conflict info
                    conflict_info = {
                        'proposed_event': event,
                        'conflicting_events': conflicts
                    }
                    all_conflicts.append(conflict_info)
                    print(f"Skipping event due to {len(conflicts)} conflict(s): {event.get('summary')}")
                    continue

            except Exception as e:
                print(f"Error checking conflicts for event: {e}")
                # Continue anyway if conflict check fails

        # No conflicts, create the event
        try:
            created_event = create_event(
                user_id=user_id,
                event_data=event,
                calendar_id=calendar_id
            )

            if created_event:
                event_id = created_event.get('id', 'apple-event-' + str(len(calendar_event_ids)))
                calendar_event_ids.append(event_id)
                print(f"Created Apple Calendar event: {created_event.get('summary')} (ID: {event_id})")
            else:
                print(f"Failed to create event: {event.get('summary')}")

        except Exception as e:
            print(f"Error creating event {event.get('summary')}: {e}")
            continue

    return calendar_event_ids, all_conflicts
