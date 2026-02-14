"""
Agent 3: Personalization & Inference

Applies user's learned preferences to a CalendarEvent using:
- Discovered patterns (calendar summaries, style stats)
- Few-shot learning from similar historical events (with temporal data)
- Correction learning from past user edits
- Surrounding events for temporal constraint awareness
- Location history for location resolution
"""

import statistics
import logging
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from typing import List, Dict, Optional
from datetime import datetime

from core.base_agent import BaseAgent
from core.prompt_loader import load_prompt
from extraction.models import CalendarEvent
from preferences.similarity import ProductionSimilaritySearch
from config.posthog import get_invoke_config

logger = logging.getLogger(__name__)


class PersonalizationAgent(BaseAgent):
    """
    Personalizes a CalendarEvent to match the user's style.

    Section-based decision-making agent that handles:
    - Title formatting (match user's naming conventions)
    - Description enhancement
    - Calendar selection (by Calendar ID)
    - End time inference (when missing)
    - Location resolution (against user's history)
    """

    def __init__(self, llm: ChatAnthropic):
        super().__init__("Agent3_Personalization")
        self.llm = llm.with_structured_output(CalendarEvent)
        self.similarity_search = None

    def execute(
        self,
        event: CalendarEvent,
        discovered_patterns: Optional[Dict] = None,
        historical_events: Optional[List[Dict]] = None,
        user_id: Optional[str] = None
    ) -> CalendarEvent:
        """
        Apply user preferences to personalize a calendar event.

        Args:
            event: CalendarEvent from temporal resolver
            discovered_patterns: Patterns from PatternDiscoveryService
            historical_events: User's historical events for similarity search
            user_id: User UUID (for querying corrections and location history)

        Returns:
            Personalized CalendarEvent
        """
        if not event:
            raise ValueError("No event provided for personalization")

        if not discovered_patterns:
            return event

        # 1. Find similar events with temporal data
        similar_events = self._find_similar_events(event, historical_events)

        # 2. Compute duration stats from similar events
        duration_stats = self._compute_duration_stats(similar_events)

        # 3. Fetch surrounding events (for temporal inference constraints)
        surrounding_events = self._fetch_surrounding_events(event, user_id)

        # 4. Fetch location history matches
        location_matches = self._fetch_location_history(event, user_id)

        # 5. Query corrections — general context + location-specific
        corrections = self._query_corrections(event, user_id)
        correction_context = self._format_correction_context(corrections)
        location_corrections = self._extract_location_corrections(corrections)

        # 6. Compute calendar distribution from similar events
        calendar_distribution = self._compute_calendar_distribution(similar_events)

        # 7. Extract pattern data
        category_patterns = discovered_patterns.get('category_patterns', {})
        style_stats = discovered_patterns.get('style_stats', {})
        total_events = discovered_patterns.get('total_events_analyzed', 0)

        # 8. Auto-assign calendar when only one exists (skip LLM decision)
        if len(category_patterns) == 1:
            only_cal_id = next(iter(category_patterns))
            event.calendar = only_cal_id

        # 9. Determine conditional flags for prompt sections
        is_all_day = event.start.date is not None
        has_end_time = event.end is not None
        has_location = bool(event.location and event.location.strip())

        # 10. Render prompt via Jinja2 template
        system_prompt = load_prompt(
            "preferences/prompts/preferences.txt",
            event_json=event.model_dump_json(indent=2),
            similar_events=similar_events,
            correction_context=correction_context,
            category_patterns=category_patterns,
            style_stats=style_stats,
            total_events=total_events,
            is_all_day=is_all_day,
            has_end_time=has_end_time,
            has_location=has_location,
            duration_stats=duration_stats,
            surrounding_events=surrounding_events,
            location_matches=location_matches,
            location_corrections=location_corrections,
            raw_location=event.location or '',
            calendar_distribution=calendar_distribution,
        )

        # 11. Invoke LLM (use messages directly to avoid {}-escaping issues with JSON)
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Apply personalization to this event. Return the complete CalendarEvent."),
        ]
        result = self.llm.invoke(messages, config=get_invoke_config("personalization"))

        # 12. Enforce single-calendar assignment (safety net)
        if len(category_patterns) == 1:
            result.calendar = next(iter(category_patterns))

        return result

    # =========================================================================
    # Similar events with temporal data
    # =========================================================================

    def _find_similar_events(
        self,
        event: CalendarEvent,
        historical_events: Optional[List[Dict]] = None
    ) -> List[Dict]:
        """
        Find similar historical events and include temporal data for duration inference.

        Returns list of dicts for the Jinja2 template (not a formatted string).
        """
        if not historical_events or len(historical_events) < 3:
            return []

        # Build similarity index if not already built (reused across events in session)
        if self.similarity_search is None:
            self.similarity_search = ProductionSimilaritySearch()
            self.similarity_search.build_index(historical_events)

        query_event = {
            'title': event.summary or '',
            'all_day': event.start.date is not None,
            'calendar_name': event.calendar or 'Default'
        }

        try:
            similar = self.similarity_search.find_similar_with_diversity(
                query_event,
                k=7,
                diversity_threshold=0.85
            )
        except Exception:
            return []

        if not similar:
            return []

        results = []
        for evt, score, breakdown in similar:
            entry = {
                'title': evt.get('summary', evt.get('title', 'Untitled')),
                'calendar': evt.get('_source_calendar_name', evt.get('calendar_name', '')),
                'location': evt.get('location', ''),
                'start_time': evt.get('start_time', ''),
                'end_time': evt.get('end_time', ''),
                'is_all_day': evt.get('is_all_day', False),
                'similarity': round(score, 2),
                'duration_minutes': None,
            }

            # Compute duration if both start and end are present
            if entry['start_time'] and entry['end_time']:
                try:
                    start = datetime.fromisoformat(entry['start_time'])
                    end = datetime.fromisoformat(entry['end_time'])
                    entry['duration_minutes'] = int((end - start).total_seconds() / 60)
                except (ValueError, TypeError):
                    pass

            results.append(entry)

        return results

    def _compute_duration_stats(self, similar_events: List[Dict]) -> Dict:
        """Compute aggregate duration statistics from similar events."""
        durations = [
            e['duration_minutes'] for e in similar_events
            if e.get('duration_minutes') and e['duration_minutes'] > 0
        ]

        if not durations:
            return {}

        return {
            'median_minutes': int(statistics.median(durations)),
            'min_minutes': min(durations),
            'max_minutes': max(durations),
            'count': len(durations),
            'values': durations,
        }

    def _compute_calendar_distribution(self, similar_events: List[Dict]) -> List[Dict]:
        """Compute which calendars similar events belong to, with counts and percentages."""
        if not similar_events:
            return []

        counts: Dict[str, int] = {}
        for evt in similar_events:
            cal = evt.get('calendar', '')
            if cal:
                counts[cal] = counts.get(cal, 0) + 1

        total = sum(counts.values())
        if total == 0:
            return []

        distribution = [
            {
                'calendar': cal,
                'count': count,
                'percentage': round(100 * count / total),
            }
            for cal, count in counts.items()
        ]
        distribution.sort(key=lambda x: x['count'], reverse=True)
        return distribution

    # =========================================================================
    # Surrounding events (temporal constraints)
    # =========================================================================

    def _fetch_surrounding_events(
        self,
        event: CalendarEvent,
        user_id: Optional[str]
    ) -> List[Dict]:
        """Fetch temporally closest events for scheduling constraint awareness."""
        if not user_id or event.start.date is not None:
            # Skip for all-day events or missing user
            return []

        target_time = event.start.dateTime
        if not target_time:
            return []

        try:
            from events.service import EventService
            return EventService.get_surrounding_events(
                user_id=user_id,
                target_time=target_time,
            )
        except Exception as e:
            logger.debug(f"Could not fetch surrounding events: {e}")
            return []

    # =========================================================================
    # Location history (fuzzy matching)
    # =========================================================================

    def _fetch_location_history(
        self,
        event: CalendarEvent,
        user_id: Optional[str]
    ) -> List[Dict]:
        """Fetch similar locations from user's event history."""
        if not user_id or not event.location or not event.location.strip():
            return []

        try:
            from events.service import EventService
            return EventService.search_location_history(
                user_id=user_id,
                query_location=event.location,
            )
        except Exception as e:
            logger.debug(f"Could not fetch location history: {e}")
            return []

    # =========================================================================
    # Corrections
    # =========================================================================

    def _query_corrections(
        self,
        event: CalendarEvent,
        user_id: Optional[str]
    ) -> List[Dict]:
        """Query past user corrections similar to this event."""
        if not user_id:
            return []

        try:
            from feedback.correction_query_service import CorrectionQueryService
            query_service = CorrectionQueryService()
            return query_service.query_for_preference_application(
                user_id=user_id,
                facts=event.model_dump(),
                k=5
            ) or []
        except Exception:
            return []

    def _format_correction_context(self, corrections: List[Dict]) -> str:
        """Format corrections as a learning context string for the prompt."""
        if not corrections:
            return ""

        context = f"""
{'='*60}
CORRECTION LEARNING (Learn from past mistakes):
{'='*60}
You've made similar formatting mistakes before. The user corrected them.
Avoid repeating these mistakes:

"""

        for i, correction in enumerate(corrections, 1):
            extracted_facts = correction.get('extracted_facts', {})
            system_suggestion = correction.get('system_suggestion', {})
            user_final = correction.get('user_final', {})
            fields_changed = correction.get('fields_changed', [])

            context += f"\nCorrection {i}:\n"
            context += f"  Facts you saw: {self._format_facts_summary(extracted_facts)}\n"
            context += f"  You formatted as: {self._format_event_summary(system_suggestion)}\n"
            context += f"  User changed it to: {self._format_event_summary(user_final)}\n"
            context += f"  What changed: {', '.join(fields_changed)}\n"

            if 'title_change' in correction and correction['title_change']:
                tc = correction['title_change']
                context += f"    → Title: '{tc.get('from')}' → '{tc.get('to')}' ({tc.get('change_type')})\n"

            if 'calendar_change' in correction and correction['calendar_change']:
                cc = correction['calendar_change']
                context += f"    → Calendar: '{cc.get('from')}' → '{cc.get('to')}'\n"

            if 'time_change' in correction and correction['time_change']:
                tc = correction['time_change']
                context += f"    → Time: {tc.get('from')} → {tc.get('to')} ({tc.get('change_type')})\n"

        context += "\n" + "="*60 + "\n"
        context += "Apply these learnings to avoid similar mistakes.\n"

        return context

    def _extract_location_corrections(self, corrections: List[Dict]) -> List[Dict]:
        """Extract location-specific corrections from the correction list."""
        location_corrections = []
        for correction in corrections:
            if 'location' not in correction.get('fields_changed', []):
                continue
            system = correction.get('system_suggestion', {})
            user = correction.get('user_final', {})
            from_loc = system.get('location', '')
            to_loc = user.get('location', '')
            if from_loc and to_loc and from_loc != to_loc:
                location_corrections.append({
                    'from': from_loc,
                    'to': to_loc,
                })
        return location_corrections

    def _format_facts_summary(self, facts: Dict) -> str:
        """Format facts dict as a brief summary."""
        parts = []
        if facts.get('title'):
            parts.append(f"title:'{facts['title']}'")
        if facts.get('date'):
            parts.append(f"date:{facts['date']}")
        if facts.get('time'):
            parts.append(f"time:{facts['time']}")
        if facts.get('location'):
            parts.append(f"loc:'{facts['location']}'")
        return ', '.join(parts) if parts else '(empty)'

    def _format_event_summary(self, event: Dict) -> str:
        """Format event dict as a brief summary."""
        parts = []
        if event.get('summary'):
            parts.append(f"title:'{event['summary']}'")
        if event.get('calendar'):
            parts.append(f"calendar:{event['calendar']}")
        if event.get('start'):
            start = event['start']
            if 'dateTime' in start:
                parts.append(f"time:{start['dateTime']}")
            elif 'date' in start:
                parts.append(f"date:{start['date']}")
        return ', '.join(parts) if parts else '(empty)'
