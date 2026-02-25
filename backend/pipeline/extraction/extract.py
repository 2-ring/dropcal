"""
EXTRACT stage — unified event extraction.

Replaces IDENTIFY + CONSOLIDATE + STRUCTURE in a single LLM call.
Sees the full input context, finds all events, deduplicates, and extracts
structured facts — all at once.

Usage:
    from extraction.extract import UnifiedExtractor

    extractor = UnifiedExtractor(
        llm_simple=llm_simple,
        llm_complex=llm_complex,
        llm_vision=llm_vision,
        complexity_threshold=500,
    )
    result = extractor.execute(text, input_type='text')
    # Returns ExtractedEventBatch with session_title and events
"""

import logging
import time as _time
from typing import List, Optional, Dict

from langchain_core.messages import SystemMessage, HumanMessage

from pipeline.base_agent import BaseAgent
from pipeline.prompt_loader import load_prompt
from pipeline.models import ExtractedEvent, ExtractedEventBatch
from config.posthog import capture_llm_generation

logger = logging.getLogger(__name__)

_INPUT_TYPE_LABELS = {
    'text': 'Plain text',
    'image': 'Image (screenshot, photo)',
    'pdf': 'PDF document',
    'audio': 'Audio transcription',
    'email': 'Email',
    'document': 'Document',
}


def _capture_generation(config_path: str, input_content, raw_ai_message, duration_ms):
    """Capture a manual $ai_generation event with full LLM I/O for PostHog."""
    try:
        from config.models import get_assigned_model, get_model_specs
        from config.posthog import _PROVIDER_TO_POSTHOG

        model_name = get_assigned_model(config_path)
        specs = get_model_specs(model_name)
        provider = specs['provider']
        posthog_provider = _PROVIDER_TO_POSTHOG.get(provider, provider)

        # Serialize output — content for JSON mode, tool_calls for tool-calling mode
        output = None
        if raw_ai_message:
            if raw_ai_message.content:
                output = raw_ai_message.content
            elif hasattr(raw_ai_message, 'tool_calls') and raw_ai_message.tool_calls:
                import json
                output = json.dumps(raw_ai_message.tool_calls, default=str)

        # Token counts from usage_metadata
        usage = getattr(raw_ai_message, 'usage_metadata', None) or {}

        capture_llm_generation(
            agent_name='extraction',
            model=model_name,
            provider=posthog_provider,
            duration_ms=duration_ms,
            input_tokens=usage.get('input_tokens'),
            output_tokens=usage.get('output_tokens'),
            input_content=input_content,
            output_content=output,
        )
    except Exception as e:
        logger.debug(f"PostHog: Failed to capture extraction generation: {e}")


class UnifiedExtractor(BaseAgent):
    """
    Unified EXTRACT stage — finds all events AND extracts structured facts
    in a single LLM call. Replaces IDENTIFY + CONSOLIDATE + STRUCTURE.

    Routes to simple (non-reasoning) or complex (reasoning) model based on
    input length, and to vision model for images.
    """

    def __init__(self, llm_simple, llm_complex, llm_vision=None, complexity_threshold=500):
        super().__init__("Extract")
        self.llm_simple = llm_simple
        self.llm_complex = llm_complex
        self.llm_vision = llm_vision or llm_complex
        self.complexity_threshold = complexity_threshold

    def execute(
        self,
        text: str,
        input_type: str = 'text',
        metadata: Optional[Dict] = None,
    ) -> tuple:
        """
        Extract all calendar events from raw input in a single LLM call.

        Args:
            text: Raw text input (or placeholder for images)
            input_type: 'text', 'pdf', 'audio', 'email', 'image', 'document'
            metadata: Optional metadata (image_data + media_type for vision path)

        Returns:
            (ExtractedEventBatch, messages, raw_ai_message) — parsed result,
            the exact LangChain messages sent to the model, and the raw
            AIMessage response (for PostHog observability).
        """
        is_vision = metadata and metadata.get('requires_vision')

        if is_vision:
            return self._execute_vision(text, metadata)
        else:
            return self._execute_text(text, input_type)

    def _pick_text_model(self, text: str):
        """Pick simple or complex model based on input length."""
        if len(text) <= self.complexity_threshold:
            return self.llm_simple, 'extraction.text_simple'
        return self.llm_complex, 'extraction.text_complex'

    def _execute_text(self, text: str, input_type: str) -> tuple:
        """Text path: single structured output call."""
        system_prompt = load_prompt("pipeline/extraction/prompts/unified_extract.txt")

        source_label = _INPUT_TYPE_LABELS.get(input_type, input_type or 'text')
        user_message = f"[SOURCE TYPE: {source_label}]\n\n{text}"

        llm, config_path = self._pick_text_model(text)
        logger.info(f"Extraction using {config_path} (input: {len(text)} chars, threshold: {self.complexity_threshold})")

        structured_llm = llm.with_structured_output(
            ExtractedEventBatch, include_raw=True
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]

        t0 = _time.time()
        raw_result = structured_llm.invoke(messages)
        duration_ms = (_time.time() - t0) * 1000

        result = raw_result['parsed']
        raw_ai_message = raw_result.get('raw')

        _capture_generation(
            config_path,
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            raw_ai_message,
            duration_ms,
        )

        if not result or not result.events:
            return ExtractedEventBatch(session_title="Untitled", input_summary="", events=[]), messages, raw_ai_message

        logger.info(f"Extracted {len(result.events)} events from {input_type} input")
        return result, messages, raw_ai_message

    def _execute_vision(self, text: str, metadata: Dict) -> tuple:
        """Vision path: multimodal message with image."""
        system_prompt = load_prompt("pipeline/extraction/prompts/unified_extract.txt")

        image_data = metadata.get('image_data', '')
        media_type = metadata.get('media_type', 'image/jpeg')

        # Build multimodal message content
        user_text = "[SOURCE TYPE: Image (screenshot, photo)]\n\nExtract all calendar events from this image."
        content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{image_data}"
                }
            },
            {
                "type": "text",
                "text": user_text,
            },
        ]

        structured_llm = self.llm_vision.with_structured_output(
            ExtractedEventBatch, include_raw=True
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=content),
        ]

        t0 = _time.time()
        raw_result = structured_llm.invoke(messages)
        duration_ms = (_time.time() - t0) * 1000

        result = raw_result['parsed']
        raw_ai_message = raw_result.get('raw')

        _capture_generation(
            'extraction.vision',
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"[image: {media_type}]\n\n{user_text}"},
            ],
            raw_ai_message,
            duration_ms,
        )

        if not result or not result.events:
            return ExtractedEventBatch(session_title="Untitled", input_summary="", events=[]), messages, raw_ai_message

        logger.info(f"Extracted {len(result.events)} events from image input")
        return result, messages, raw_ai_message
