"""
Microsoft Calendar format transformations.
Converts between Microsoft Graph API format and universal (Google Calendar) format.
"""

from typing import Dict, Any, List, Optional


def to_universal(ms_event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert Microsoft Graph event to universal format (Google Calendar format).

    Args:
        ms_event: Event dict from Microsoft Graph API

    Returns:
        Event dict in universal (Google Calendar) format
    """
    # Extract basic fields
    universal_event = {
        'id': ms_event.get('id'),
        'summary': ms_event.get('subject', ''),
        'description': ms_event.get('body', {}).get('content', ''),
        'status': 'confirmed' if not ms_event.get('isCancelled') else 'cancelled'
    }

    # Convert location
    location = ms_event.get('location', {})
    if location.get('displayName'):
        universal_event['location'] = location['displayName']

    # Convert start/end times
    start = ms_event.get('start', {})
    end = ms_event.get('end', {})

    if start:
        universal_event['start'] = {
            'dateTime': start.get('dateTime'),
            'timeZone': start.get('timeZone', 'UTC')
        }

    if end:
        universal_event['end'] = {
            'dateTime': end.get('dateTime'),
            'timeZone': end.get('timeZone', 'UTC')
        }

    # Convert attendees
    attendees = ms_event.get('attendees', [])
    if attendees:
        universal_event['attendees'] = []
        for attendee in attendees:
            email_address = attendee.get('emailAddress', {})
            universal_event['attendees'].append({
                'email': email_address.get('address'),
                'displayName': email_address.get('name'),
                'responseStatus': _convert_response_status(attendee.get('status', {}).get('response'))
            })

    # Recurrence (simplified)
    if ms_event.get('recurrence'):
        universal_event['recurrence'] = ['RRULE:' + str(ms_event.get('recurrence'))]

    # Other fields
    if ms_event.get('isAllDay'):
        # Convert to all-day event format
        universal_event['start'] = {'date': start.get('dateTime', '').split('T')[0]}
        universal_event['end'] = {'date': end.get('dateTime', '').split('T')[0]}

    return universal_event


def from_universal(universal_event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert universal format (Google Calendar) to Microsoft Graph event format.

    Args:
        universal_event: Event dict in universal (Google Calendar) format

    Returns:
        Event dict in Microsoft Graph API format
    """
    # Extract basic fields
    ms_event = {
        'subject': universal_event.get('summary', ''),
        'body': {
            'contentType': 'text',
            'content': universal_event.get('description', '')
        }
    }

    # Convert location
    if universal_event.get('location'):
        ms_event['location'] = {
            'displayName': universal_event['location']
        }

    # Convert start/end times
    start = universal_event.get('start', {})
    end = universal_event.get('end', {})

    # Check if all-day event (has 'date' instead of 'dateTime')
    is_all_day = 'date' in start

    if is_all_day:
        ms_event['isAllDay'] = True
        ms_event['start'] = {
            'dateTime': start.get('date') + 'T00:00:00',
            'timeZone': start.get('timeZone', 'UTC')
        }
        ms_event['end'] = {
            'dateTime': end.get('date') + 'T00:00:00',
            'timeZone': end.get('timeZone', 'UTC')
        }
    else:
        ms_event['isAllDay'] = False
        if start.get('dateTime'):
            ms_event['start'] = {
                'dateTime': start['dateTime'],
                'timeZone': start.get('timeZone', 'UTC')
            }
        if end.get('dateTime'):
            ms_event['end'] = {
                'dateTime': end['dateTime'],
                'timeZone': end.get('timeZone', 'UTC')
            }

    # Convert attendees
    attendees = universal_event.get('attendees', [])
    if attendees:
        ms_event['attendees'] = []
        for attendee in attendees:
            ms_attendee = {
                'emailAddress': {
                    'address': attendee.get('email'),
                    'name': attendee.get('displayName', attendee.get('email'))
                },
                'type': 'required'
            }
            ms_event['attendees'].append(ms_attendee)

    return ms_event


def _convert_response_status(ms_response: Optional[str]) -> str:
    """
    Convert Microsoft response status to Google Calendar format.

    Args:
        ms_response: Microsoft response status (accepted, declined, tentative, etc.)

    Returns:
        Google Calendar response status (accepted, declined, tentativelyAccepted, needsAction)
    """
    if not ms_response:
        return 'needsAction'

    status_map = {
        'accepted': 'accepted',
        'declined': 'declined',
        'tentativelyAccepted': 'tentativelyAccepted',
        'tentative': 'tentativelyAccepted',
        'notResponded': 'needsAction',
        'none': 'needsAction'
    }

    return status_map.get(ms_response.lower(), 'needsAction')
