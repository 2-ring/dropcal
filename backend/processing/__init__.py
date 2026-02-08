"""Processing module for session pipeline integration."""

from .session_processor import SessionProcessor
from .chunked_identification import identify_events_chunked

__all__ = ['SessionProcessor', 'identify_events_chunked']
