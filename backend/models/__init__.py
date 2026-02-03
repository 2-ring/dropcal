"""
Data models for DropCal agents and domain logic.
"""

from .agent_models import (
    # Agent 0: Context Understanding
    UserContext,
    ExtractionGuidance,
    IntentAnalysis,
    ContextResult,

    # Agent 1: Event Identification
    IdentifiedEvent,
    IdentificationResult,

    # Agent 2: Fact Extraction
    RecurrenceInfo,
    ExtractedFacts,

    # Agent 3: Calendar Formatting
    CalendarDateTime,
    CalendarRecurrence,
    CalendarEvent,
)

__all__ = [
    # Agent 0
    "UserContext",
    "ExtractionGuidance",
    "IntentAnalysis",
    "ContextResult",

    # Agent 1
    "IdentifiedEvent",
    "IdentificationResult",

    # Agent 2
    "RecurrenceInfo",
    "ExtractedFacts",

    # Agent 3
    "CalendarDateTime",
    "CalendarRecurrence",
    "CalendarEvent",
]
