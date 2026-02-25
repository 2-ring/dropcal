"""
In-memory event stream for real-time session updates via SSE.

The pipeline pushes events here as they're resolved/personalized.
The SSE endpoint reads from here and streams to the frontend.
"""

import threading
import time
import logging
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)

# Streams older than this (in seconds) are cleaned up automatically
_STREAM_TTL_SECONDS = 600  # 10 minutes


class SessionStream:
    """Thread-safe stream for a single session's events."""

    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self.title: Optional[str] = None
        self.icon: Optional[str] = None
        self.event_count: Optional[int] = None  # Known count before resolution
        self.stage: Optional[str] = None  # Current pipeline stage
        self.done = False
        self.error: Optional[str] = None
        self._revision = 0  # Bumped on any event list change
        self._condition = threading.Condition()
        self._created_at = time.monotonic()

    def push_event(self, event_data: Dict[str, Any]):
        with self._condition:
            self.events.append(event_data)
            self._revision += 1
            self._condition.notify_all()

    def clear_events(self):
        """Clear events list (thread-safe). Use instead of events.clear()."""
        with self._condition:
            self.events.clear()
            self._revision += 1
            self._condition.notify_all()

    def set_event_count(self, count: int):
        """Set the known event count (from extraction, before resolution)."""
        with self._condition:
            self.event_count = count
            self._condition.notify_all()

    def set_title(self, title: str):
        with self._condition:
            self.title = title
            self._condition.notify_all()

    def set_stage(self, stage: str):
        """Set the current pipeline stage (extracting, resolving, personalizing)."""
        with self._condition:
            self.stage = stage
            self._condition.notify_all()

    def set_icon(self, icon: str):
        with self._condition:
            self.icon = icon
            self._condition.notify_all()

    def mark_done(self):
        with self._condition:
            self.done = True
            self._condition.notify_all()

    def mark_error(self, error: str):
        with self._condition:
            self.error = error
            self.done = True
            self._condition.notify_all()

    def wait_for_update(self, timeout: float = 1.0) -> bool:
        """Block until notified or timeout. Returns True if notified."""
        with self._condition:
            return self._condition.wait(timeout=timeout)

    @property
    def age_seconds(self) -> float:
        """How many seconds since this stream was created."""
        return time.monotonic() - self._created_at


# Global registry of active session streams
_streams: Dict[str, SessionStream] = {}
_lock = threading.Lock()


def init_stream(session_id: str) -> SessionStream:
    """Create a stream for a session (call before starting the pipeline)."""
    stream = SessionStream()
    with _lock:
        _streams[session_id] = stream
    # Opportunistically clean up stale streams
    _cleanup_stale_streams()
    return stream


def get_stream(session_id: str) -> Optional[SessionStream]:
    """Get the stream for a session (returns None if not found)."""
    with _lock:
        return _streams.get(session_id)


def cleanup_stream(session_id: str):
    """Remove a completed session's stream."""
    with _lock:
        _streams.pop(session_id, None)


def _cleanup_stale_streams():
    """Remove streams that have exceeded their TTL (done/errored or just old).

    Called opportunistically from init_stream to avoid needing a background timer.
    """
    now = time.monotonic()
    stale = []
    with _lock:
        for sid, stream in _streams.items():
            age = now - stream._created_at
            # Remove streams that are done/errored and at least 60s old,
            # or any stream older than the TTL regardless of state
            if (stream.done and age > 60) or age > _STREAM_TTL_SECONDS:
                stale.append(sid)
        for sid in stale:
            del _streams[sid]
    if stale:
        logger.debug(f"Cleaned up {len(stale)} stale stream(s): {stale}")
