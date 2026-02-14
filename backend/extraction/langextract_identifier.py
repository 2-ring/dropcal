"""
LangExtract-based event identification.
Replaces chunked_identification.py for text inputs.
Handles chunking, multi-pass extraction, and source grounding internally.

Model/provider is read from config/text.py via config/langextract.py,
so switching presets also switches what LangExtract uses.
"""

import time as _time
import logging
from typing import Optional

import langextract as lx
from langextract.providers import load_builtins_once

from extraction.models import IdentifiedEvent, IdentificationResult
from config.langextract import (
    get_langextract_config, is_langextract_supported,
    EXAMPLES, PROMPT_DESCRIPTION, MAX_CHAR_BUFFER, MAX_WORKERS,
    PASSES_SIMPLE,
)
from config.posthog import capture_llm_generation, capture_agent_error
from config.processing import ProcessingConfig

logger = logging.getLogger(__name__)


def identify_events_langextract(
    text: str,
    extraction_passes: int = None,
    tracking_context: Optional[dict] = None,
) -> IdentificationResult:
    """
    Identify calendar events using LangExtract.

    Handles chunking, multi-pass extraction, source grounding, and
    deduplication internally via LangExtract.

    Args:
        text: Input text to extract events from.
        extraction_passes: Number of extraction passes (1 or 2).
            If None, defaults to PASSES_SIMPLE.
        tracking_context: Optional dict for PostHog tracking.

    Returns:
        IdentificationResult with identified events.

    Raises:
        ValueError: If the configured provider is not supported by LangExtract.
            The caller should catch this and fall back to chunked_identification.
    """
    if not text or not text.strip():
        return IdentificationResult(events=[], num_events=0, has_events=False)

    passes = extraction_passes or PASSES_SIMPLE
    start = _time.time()

    try:
        # Build config from centralized text.py settings.
        # Raises ValueError if provider is unsupported (e.g. 'claude').
        config, model_name, provider_name = get_langextract_config()

        # Ensure builtin providers (OpenAI, Gemini, Ollama) are registered.
        # Required before lx.extract() when fence_output is set, as the
        # _create_model_with_schema path doesn't auto-load providers.
        load_builtins_once()

        # Call LangExtract with explicit provider config.
        # fence_output=True and use_schema_constraints=False are required
        # for OpenAI-compatible (non-Gemini) providers.
        result = lx.extract(
            text_or_documents=text,
            prompt_description=PROMPT_DESCRIPTION,
            examples=EXAMPLES,
            config=config,
            extraction_passes=passes,
            max_char_buffer=MAX_CHAR_BUFFER,
            max_workers=MAX_WORKERS,
            fence_output=True,
            use_schema_constraints=False,
        )

        duration_ms = (_time.time() - start) * 1000

        # Map LangExtract extractions to IdentifiedEvent models.
        # For string input, result is a single AnnotatedDocument.
        events = _map_extractions_to_events(result)

        # Cap events
        if len(events) > ProcessingConfig.MAX_EVENTS_PER_REQUEST:
            logger.warning(
                f"LangExtract: capping from {len(events)} to "
                f"{ProcessingConfig.MAX_EVENTS_PER_REQUEST}"
            )
            events = events[:ProcessingConfig.MAX_EVENTS_PER_REQUEST]

        logger.info(
            f"LangExtract identification: {len(text)} chars, "
            f"{passes} pass(es), {len(events)} events, "
            f"{duration_ms:.0f}ms"
        )

        # PostHog tracking (uses actual model/provider from centralized config)
        capture_llm_generation(
            "identification", model_name, provider_name,
            duration_ms,
            properties={
                'extraction_passes': passes,
                'num_events_found': len(events),
                'input_length': len(text),
                'engine': 'langextract',
            }
        )

        return IdentificationResult(
            events=events,
            num_events=len(events),
            has_events=len(events) > 0,
        )

    except Exception as e:
        duration_ms = (_time.time() - start) * 1000
        logger.error(f"LangExtract identification failed: {e}")
        capture_agent_error("identification", e, {
            'extraction_passes': passes,
            'input_length': len(text),
        })
        raise


def _map_extractions_to_events(result) -> list:
    """
    Map LangExtract AnnotatedDocument extractions to IdentifiedEvent list.

    LangExtract Extraction has:
      - extraction_text: str (verbatim source span)
      - attributes: dict (description, confidence)
      - char_interval: CharInterval(start_pos, end_pos) — source grounding

    IdentifiedEvent has:
      - raw_text: List[str]
      - description: str
      - confidence: str
    """
    events = []

    # For string input, result is a single AnnotatedDocument.
    # For iterable input, it's a list. Handle both defensively.
    if isinstance(result, list):
        all_extractions = []
        for doc in result:
            if doc and doc.extractions:
                all_extractions.extend(doc.extractions)
    else:
        all_extractions = result.extractions if result and result.extractions else []

    for extraction in all_extractions:
        raw_text = extraction.extraction_text or ""
        if not raw_text.strip():
            continue

        attrs = extraction.attributes or {}
        description = attrs.get("description", raw_text[:100])
        confidence = attrs.get("confidence", "definite")

        if confidence not in ("definite", "tentative"):
            confidence = "definite"

        events.append(IdentifiedEvent(
            raw_text=[raw_text],
            description=description,
            confidence=confidence,
        ))

    return events
