"""
Guest Calendar Formatting Agent (Agent 3 Alternative).

This agent is used for:
1. Guest users (no authentication)
2. Authenticated users with little/no calendar history

Applies standard formatting rules and improvements WITHOUT personalization.
Uses industry-standard calendar best practices and common conventions.
"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Optional, Dict, Any
from pydantic import ValidationError
import logging

from extraction.models import ExtractedFacts, CalendarEvent

logger = logging.getLogger(__name__)


class GuestFormattingAgent:
    """
    Agent that formats calendar events using standard rules (no personalization).

    Designed for guests and users with minimal history.
    Applies:
    - Standard calendar conventions
    - Title capitalization and formatting
    - Location/description improvements
    - Timezone handling
    - Duration estimation
    """

    def __init__(self, llm: ChatAnthropic):
        """
        Initialize the Guest Formatting Agent.

        Args:
            llm: ChatAnthropic instance for structured output
        """
        self.llm = llm.with_structured_output(CalendarEvent)

    def execute(
        self,
        facts: ExtractedFacts,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> CalendarEvent:
        """
        Format extracted facts into a calendar event using standard rules.

        Args:
            facts: Extracted event facts from Agent 2
            user_preferences: Optional user preferences (timezone, date format)

        Returns:
            CalendarEvent with standard formatting applied

        Raises:
            ValidationError: If structured output doesn't match CalendarEvent schema
        """
        # Get timezone from preferences or default
        timezone = 'America/New_York'
        if user_preferences and 'timezone' in user_preferences:
            timezone = user_preferences['timezone']

        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(facts, timezone)

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        try:
            calendar_event = self.llm.invoke(messages)
            logger.info(f"Guest formatting completed for: {calendar_event.title}")
            return calendar_event

        except ValidationError as e:
            logger.error(f"Validation error in guest formatting: {e}")
            raise

    def _build_system_prompt(self) -> str:
        """Build system prompt with standard formatting rules."""
        return """You are a calendar event formatter that applies industry-standard best practices.

Your job: Transform extracted event facts into a well-formatted calendar event.

## Standard Formatting Rules

### Title Formatting:
- Use Title Case (capitalize major words)
- Keep concise (3-8 words ideal)
- Remove redundant words ("Event:", "Meeting:", etc. unless meaningful)
- Examples:
  * "team meeting" → "Team Meeting"
  * "coffee with john" → "Coffee with John"
  * "CS101 lecture" → "CS101 Lecture"

### Description Formatting:
- Start with event purpose/context
- Include key details (agenda, topics, participants)
- Add any special notes or requirements
- Use markdown for structure if needed
- Keep professional and clear

### Location Handling:
- Clean up messy locations
- Standardize building/room formats
- Add context if unclear (e.g., "Zoom" → "Zoom Call")
- Examples:
  * "rm 301" → "Room 301"
  * "zoom" → "Zoom Call"
  * "starbucks on main" → "Starbucks, Main Street"

### Duration Estimation:
- If no end time specified, estimate based on event type:
  * Meetings: 1 hour default
  * Lectures/Classes: Match typical duration
  * Coffee/Casual: 30-60 minutes
  * Workshops: 2-3 hours
  * Conferences: Full day

### Timezone:
- Always use the provided timezone
- Ensure start/end times are in same timezone

### Recurrence:
- Only set if explicitly mentioned ("weekly", "every Monday", etc.)
- Follow RFC 5545 iCalendar format
- Be conservative - don't assume recurrence

## Quality Checks:
- Title is clear and professional
- Times make logical sense (end > start)
- Location is clean and useful
- Description adds value beyond title
- All required fields are filled

Output a properly formatted calendar event."""

    def _build_user_prompt(self, facts: ExtractedFacts, timezone: str) -> str:
        """Build user prompt with extracted facts."""
        return f"""Format this event using standard calendar best practices:

**Extracted Facts:**
- Title: {facts.title}
- Date: {facts.date}
- Start Time: {facts.start_time}
- End Time: {facts.end_time or "Not specified - estimate based on event type"}
- Location: {facts.location or "Not specified"}
- Description: {facts.description or ""}
- Recurrence: {facts.recurrence_rule or "None"}

**Timezone:** {timezone}

**Your Task:**
1. Clean and format the title (Title Case, concise)
2. Improve the description (add context, structure)
3. Format the location (standardize, add clarity)
4. Estimate end time if missing (based on event type)
5. Format recurrence if specified

Apply standard calendar conventions and best practices.
Make it look professional and ready for a calendar app."""
