"""
MODIFY — applies user edit instructions across a set of calendar events.
Returns only the events that need to change (edit, delete, or create).
Separate from the main pipeline (EXTRACT → RESOLVE → PERSONALIZE).

Supports a context-fetch mechanism: if the user's instruction references
information from the original input (e.g. "add the labs"), the agent can
request the original text and be re-invoked with it.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import time as _time
from langchain_core.messages import SystemMessage, HumanMessage

from pipeline.base_agent import BaseAgent
from pipeline.prompt_loader import load_prompt
from pipeline.models import ModificationResult, ModificationDecision
from config.posthog import capture_llm_generation

logger = logging.getLogger(__name__)

MAX_CONTEXT_LENGTH = 50_000


class EventModificationAgent(BaseAgent):
    """
    Receives all session events + a natural-language instruction.
    Returns a ModificationResult with only the affected events.

    Two LLM instances:
    - llm_decide: returns ModificationDecision (has needs_context flag)
    - llm_execute: returns ModificationResult (no needs_context, used with full context)
    """

    def __init__(self, llm):
        super().__init__("Modify")
        self.llm_decide = llm.with_structured_output(ModificationDecision, include_raw=True)
        self.llm_execute = llm.with_structured_output(ModificationResult, include_raw=True)
        self._prompt_path = "pipeline/modification/prompts/modification.txt"

        # Resolve provider/model for manual PostHog capture
        from config.models import get_assigned_model, get_model_specs
        self._model_name = get_assigned_model('modification.modify')
        self._provider = get_model_specs(self._model_name)['provider']

    def execute(
        self,
        events: List[Dict[str, Any]],
        instruction: str,
        calendars: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
    ) -> ModificationResult:
        """
        Apply a natural-language instruction to a list of events.

        Args:
            events: List of CalendarEvent dicts (the full session)
            instruction: User's edit request
            calendars: Available calendars as [{id, name}] dicts
            session_id: Session ID for fetching original context if needed

        Returns:
            ModificationResult with actions for affected events only
        """
        if not events:
            raise ValueError("No events provided for modification")
        if not instruction:
            raise ValueError("No edit instruction provided")

        current_date = datetime.now().strftime('%Y-%m-%d')
        current_time = datetime.now().strftime('%H:%M:%S')

        # Build numbered event list for the prompt
        event_lines = []
        for i, event in enumerate(events):
            event_lines.append(f"[{i}] {event}")
        events_block = "\n\n".join(event_lines)

        # Build calendars context with IDs so the LLM outputs correct IDs
        calendars_block = ""
        if calendars:
            cal_lines = [f"- {c['name']} (ID: {c['id']})" for c in calendars]
            calendars_block = f"\n\nAVAILABLE CALENDARS:\n" + "\n".join(cal_lines) + "\nWhen moving events between calendars, set the 'calendar' field to the calendar ID (not the name)."

        human_content = f"EVENTS:\n{events_block}{calendars_block}\n\nINSTRUCTION:\n{instruction}"

        # Fetch input_summary for the prompt hint (lightweight DB read)
        input_summary = self._fetch_input_summary(session_id) if session_id else None

        # ── Call 1: decide + possibly act ────────────────────────────
        system_prompt = load_prompt(
            self._prompt_path,
            current_date=current_date,
            current_time=current_time,
            input_summary=input_summary or '',
            original_context=None,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_content),
        ]

        start = _time.time()
        raw_result = self.llm_decide.invoke(messages)
        duration_ms = (_time.time() - start) * 1000
        decision = raw_result['parsed']

        self._capture_posthog(
            "modification", system_prompt, human_content,
            raw_result, decision, duration_ms,
        )

        # ── Context fetch + Call 2 if needed ─────────────────────────
        if decision.needs_context and session_id:
            original_context = self._fetch_original_context(session_id)
            if original_context:
                logger.info(f"Modification agent fetching context for session {session_id} ({len(original_context)} chars)")

                system_prompt_with_context = load_prompt(
                    self._prompt_path,
                    current_date=current_date,
                    current_time=current_time,
                    input_summary=input_summary or '',
                    original_context=original_context,
                )

                messages_with_context = [
                    SystemMessage(content=system_prompt_with_context),
                    HumanMessage(content=human_content),
                ]

                start2 = _time.time()
                raw_result2 = self.llm_execute.invoke(messages_with_context)
                duration_ms2 = (_time.time() - start2) * 1000
                result = raw_result2['parsed']

                self._capture_posthog(
                    "modification_with_context", system_prompt_with_context,
                    human_content, raw_result2, result, duration_ms2,
                )

                return result

        # needs_context=false, or no session_id, or context fetch failed
        return decision

    # ── Helpers ───────────────────────────────────────────────────────

    def _fetch_input_summary(self, session_id: str) -> Optional[str]:
        """Fetch the input_summary for a session (lightweight)."""
        try:
            from database.supabase_client import get_supabase
            supabase = get_supabase()
            response = supabase.table("sessions").select("input_summary").eq("id", session_id).execute()
            if response.data:
                return response.data[0].get('input_summary')
        except Exception as e:
            logger.warning(f"Failed to fetch input_summary for session {session_id}: {e}")
        return None

    def _fetch_original_context(self, session_id: str) -> Optional[str]:
        """
        Fetch original input context for a session.

        Text sessions → input_content (the raw text).
        File sessions → processed_text (transcription, PDF text, etc.).
        Image sessions → None (no text representation).
        """
        try:
            from database.models import Session as DBSession
            session = DBSession.get_by_id(session_id)
            if not session:
                return None

            input_type = session.get('input_type', 'text')

            if input_type == 'image':
                return None

            if input_type == 'text':
                context = session.get('input_content')
            else:
                context = session.get('processed_text') or session.get('input_content')

            if context and len(context) > MAX_CONTEXT_LENGTH:
                context = context[:MAX_CONTEXT_LENGTH] + "\n\n[...truncated]"

            return context

        except Exception as e:
            logger.warning(f"Failed to fetch context for session {session_id}: {e}")
            return None

    def _capture_posthog(
        self, generation_name: str, system_prompt: str, human_content: str,
        raw_result: dict, parsed_result, duration_ms: float,
    ) -> None:
        """Capture LLM generation metrics to PostHog."""
        input_tokens = None
        output_tokens = None
        try:
            usage = raw_result['raw'].usage_metadata
            input_tokens = usage.get('input_tokens')
            output_tokens = usage.get('output_tokens')
        except (AttributeError, TypeError):
            pass
        capture_llm_generation(
            generation_name, self._model_name, self._provider, duration_ms,
            input_tokens=input_tokens, output_tokens=output_tokens,
            input_content=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": human_content},
            ],
            output_content=parsed_result.model_dump_json(),
        )
