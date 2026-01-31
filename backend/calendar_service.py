"""
Google Calendar API integration service.
Handles OAuth 2.0 authentication and calendar operations.
"""

import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from typing import Dict, Optional, List
from datetime import datetime


class CalendarService:
    """Service class for Google Calendar API operations"""

    # OAuth 2.0 scopes - request access to read and write calendar events
    SCOPES = ['https://www.googleapis.com/auth/calendar']

    # OAuth redirect URI - must match what's configured in Google Cloud Console
    REDIRECT_URI = 'http://localhost:5000/api/oauth/callback'

    def __init__(self, credentials_file: str = 'credentials.json', token_file: str = 'token.json'):
        """
        Initialize the Calendar Service.

        Args:
            credentials_file: Path to OAuth 2.0 client credentials from Google Cloud Console
            token_file: Path to store user access tokens
        """
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.credentials = None

        # Load existing credentials if available
        self._load_credentials()

    def _load_credentials(self) -> None:
        """Load credentials from token file if it exists"""
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file, 'r') as token:
                    creds_data = json.load(token)
                    self.credentials = Credentials.from_authorized_user_info(creds_data, self.SCOPES)
            except Exception as e:
                print(f"Error loading credentials: {e}")
                self.credentials = None

    def _save_credentials(self) -> None:
        """Save credentials to token file"""
        if self.credentials:
            try:
                with open(self.token_file, 'w') as token:
                    token.write(self.credentials.to_json())
            except Exception as e:
                print(f"Error saving credentials: {e}")

    def get_authorization_url(self) -> str:
        """
        Generate OAuth 2.0 authorization URL for user to grant access.
        Supports both environment variables and credentials file.

        Returns:
            Authorization URL to redirect user to
        """
        # Check for environment variables first
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

        if client_id and client_secret:
            # Create flow from environment variables
            client_config = {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.REDIRECT_URI]
                }
            }
            flow = Flow.from_client_config(
                client_config,
                scopes=self.SCOPES,
                redirect_uri=self.REDIRECT_URI
            )
        elif os.path.exists(self.credentials_file):
            # Fall back to credentials file
            flow = Flow.from_client_secrets_file(
                self.credentials_file,
                scopes=self.SCOPES,
                redirect_uri=self.REDIRECT_URI
            )
        else:
            raise FileNotFoundError(
                "No OAuth credentials found. Either:\n"
                "1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables, or\n"
                f"2. Place credentials.json file at '{self.credentials_file}'\n"
                "Please follow GOOGLE_CALENDAR_SETUP.md for setup instructions."
            )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )

        return authorization_url

    def handle_oauth_callback(self, authorization_response: str) -> bool:
        """
        Handle OAuth callback and exchange authorization code for access token.
        Supports both environment variables and credentials file.

        Args:
            authorization_response: Full callback URL with authorization code

        Returns:
            True if authentication successful, False otherwise
        """
        try:
            # Check for environment variables first
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

            if client_id and client_secret:
                # Create flow from environment variables
                client_config = {
                    "web": {
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.REDIRECT_URI]
                    }
                }
                flow = Flow.from_client_config(
                    client_config,
                    scopes=self.SCOPES,
                    redirect_uri=self.REDIRECT_URI
                )
            else:
                # Fall back to credentials file
                flow = Flow.from_client_secrets_file(
                    self.credentials_file,
                    scopes=self.SCOPES,
                    redirect_uri=self.REDIRECT_URI
                )

            flow.fetch_token(authorization_response=authorization_response)
            self.credentials = flow.credentials
            self._save_credentials()

            return True
        except Exception as e:
            print(f"Error handling OAuth callback: {e}")
            return False

    def is_authenticated(self) -> bool:
        """Check if user is authenticated and credentials are valid"""
        return self.credentials is not None and self.credentials.valid

    def refresh_credentials(self) -> bool:
        """
        Refresh expired credentials if refresh token is available.

        Returns:
            True if refresh successful, False otherwise
        """
        if self.credentials and self.credentials.expired and self.credentials.refresh_token:
            try:
                self.credentials.refresh()
                self._save_credentials()
                return True
            except Exception as e:
                print(f"Error refreshing credentials: {e}")
                return False
        return False

    def create_event(self, event_data: Dict) -> Optional[Dict]:
        """
        Create a new event in the user's Google Calendar.

        Args:
            event_data: Event data in Google Calendar API format:
                {
                    'summary': 'Event title',
                    'start': {'dateTime': '2026-02-01T14:00:00-05:00', 'timeZone': 'America/New_York'},
                    'end': {'dateTime': '2026-02-01T15:00:00-05:00', 'timeZone': 'America/New_York'},
                    'location': 'Conference Room',
                    'description': 'Event description',
                    'recurrence': ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
                    'attendees': [{'email': 'person@example.com'}]
                }

        Returns:
            Created event data from Google Calendar API, or None if failed
        """
        if not self.is_authenticated():
            # Try to refresh credentials if expired
            if not self.refresh_credentials():
                raise Exception("Not authenticated. Please authorize first.")

        try:
            # Build Calendar API service
            service = build('calendar', 'v3', credentials=self.credentials)

            # Create event
            event = service.events().insert(
                calendarId='primary',
                body=event_data
            ).execute()

            return event

        except HttpError as error:
            print(f"An error occurred: {error}")
            return None

    def list_events(self, max_results: int = 10, time_min: Optional[str] = None) -> List[Dict]:
        """
        List upcoming events from user's calendar.

        Args:
            max_results: Maximum number of events to return
            time_min: Lower bound for event start time (ISO format)

        Returns:
            List of event dictionaries
        """
        if not self.is_authenticated():
            if not self.refresh_credentials():
                raise Exception("Not authenticated. Please authorize first.")

        try:
            service = build('calendar', 'v3', credentials=self.credentials)

            # If no time_min specified, use current time
            if not time_min:
                time_min = datetime.utcnow().isoformat() + 'Z'

            events_result = service.events().list(
                calendarId='primary',
                timeMin=time_min,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()

            return events_result.get('items', [])

        except HttpError as error:
            print(f"An error occurred: {error}")
            return []

    def check_conflicts(self, start_time: str, end_time: str) -> List[Dict]:
        """
        Check for scheduling conflicts using the Freebusy API.

        Args:
            start_time: Start time in ISO format (e.g., '2026-02-01T14:00:00-05:00')
            end_time: End time in ISO format

        Returns:
            List of busy time periods that conflict with the proposed time
        """
        if not self.is_authenticated():
            if not self.refresh_credentials():
                raise Exception("Not authenticated. Please authorize first.")

        try:
            service = build('calendar', 'v3', credentials=self.credentials)

            body = {
                "timeMin": start_time,
                "timeMax": end_time,
                "items": [{"id": "primary"}]
            }

            freebusy_result = service.freebusy().query(body=body).execute()

            # Extract busy periods for primary calendar
            busy_periods = freebusy_result.get('calendars', {}).get('primary', {}).get('busy', [])

            return busy_periods

        except HttpError as error:
            print(f"An error occurred: {error}")
            return []
