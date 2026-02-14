"""
LangExtract configuration for event identification.
Controls model, chunking, multi-pass, and few-shot examples.
"""

import os
import langextract as lx

# Model: Use Grok via OpenAI-compatible API (matching current pipeline default)
# LangExtract's auto-router only recognizes gpt-4/gpt-5 prefixes, so we must
# use explicit provider routing via factory.ModelConfig with provider='openai'.
LANGEXTRACT_MODEL = os.getenv('LANGEXTRACT_MODEL', 'grok-3')
LANGEXTRACT_API_KEY_ENV = 'XAI_API_KEY'
LANGEXTRACT_BASE_URL = 'https://api.x.ai/v1'

# Extraction passes: complexity router controls this
PASSES_SIMPLE = 1   # Simple inputs: 1 pass (same speed as before)
PASSES_COMPLEX = 2  # Complex inputs: 2 passes (~93% recall vs ~85%)

# Chunking
MAX_CHAR_BUFFER = 1500  # Characters per chunk (LangExtract default sweet spot)
MAX_WORKERS = 10        # Parallel chunk processing

# Few-shot examples that teach LangExtract what calendar events look like.
# These are CRITICAL for extraction quality — each example teaches both
# what to extract AND what the extraction_text span should look like.
EXAMPLES = [
    lx.data.ExampleData(
        text="Team meeting tomorrow at 2pm in Conference Room B. Don't forget the report!",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Team meeting tomorrow at 2pm in Conference Room B. Don't forget the report!",
                attributes={
                    "description": "Team meeting (tomorrow 2pm, Conference Room B)",
                    "confidence": "definite",
                }
            )
        ]
    ),
    lx.data.ExampleData(
        text="Homework due Tuesdays at 9pm. Midterm on March 15 at 6:30pm in Wilson Hall.",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Homework due Tuesdays at 9pm",
                attributes={
                    "description": "Weekly homework deadline (Tuesdays 9pm)",
                    "confidence": "definite",
                }
            ),
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Midterm on March 15 at 6:30pm in Wilson Hall",
                attributes={
                    "description": "Midterm exam (March 15, 6:30pm, Wilson Hall)",
                    "confidence": "definite",
                }
            )
        ]
    ),
    lx.data.ExampleData(
        text="Maybe grab coffee next week? Also dinner Friday at 7 at Luigi's with Sarah.",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Maybe grab coffee next week?",
                attributes={
                    "description": "Coffee meetup (next week)",
                    "confidence": "tentative",
                }
            ),
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="dinner Friday at 7 at Luigi's with Sarah",
                attributes={
                    "description": "Dinner with Sarah at Luigi's (Friday 7pm)",
                    "confidence": "definite",
                }
            )
        ]
    ),
    lx.data.ExampleData(
        text="CSCI 1680 meets Monday and Wednesday 10:30-11:50am in CIT 368. "
             "First homework due January 31. Final exam March 20, 2pm, 3 hours.",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="CSCI 1680 meets Monday and Wednesday 10:30-11:50am in CIT 368",
                attributes={
                    "description": "CSCI 1680 lecture (Mon/Wed 10:30-11:50am, CIT 368)",
                    "confidence": "definite",
                }
            ),
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="First homework due January 31",
                attributes={
                    "description": "CSCI 1680 first homework deadline (January 31)",
                    "confidence": "definite",
                }
            ),
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Final exam March 20, 2pm, 3 hours",
                attributes={
                    "description": "CSCI 1680 final exam (March 20, 2pm, 3 hours)",
                    "confidence": "definite",
                }
            )
        ]
    ),
    lx.data.ExampleData(
        text="Spring break trip to Miami March 8-15. Flight departs 6am Saturday.",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Spring break trip to Miami March 8-15",
                attributes={
                    "description": "Spring break trip to Miami (March 8-15, multi-day)",
                    "confidence": "definite",
                }
            ),
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Flight departs 6am Saturday",
                attributes={
                    "description": "Flight departure (Saturday 6am)",
                    "confidence": "definite",
                }
            )
        ]
    ),
    lx.data.ExampleData(
        text="Office hours every Thursday 3-5pm in Room 201. No office hours during reading period.",
        extractions=[
            lx.data.Extraction(
                extraction_class="calendar_event",
                extraction_text="Office hours every Thursday 3-5pm in Room 201",
                attributes={
                    "description": "Weekly office hours (Thursdays 3-5pm, Room 201)",
                    "confidence": "definite",
                }
            )
        ]
    ),
]

PROMPT_DESCRIPTION = (
    "Extract all calendar events from the text. A calendar event is anything that "
    "happens at a specific time: meetings, deadlines, exams, classes, social events, "
    "appointments, recurring schedules. For syllabi and course documents, extract "
    "deadlines, exams, and assignments but ignore grading policies, readings, and "
    "course descriptions. For emails, extract scheduled meetings and deadlines but "
    "ignore casual suggestions. Mark confidence as 'tentative' for uncertain events "
    "(maybe, possibly, might) and 'definite' for certain ones. Each distinct event "
    "should be a separate extraction — 'Meeting Monday and Wednesday' is 2 events "
    "unless it's a recurring schedule. 'Homework due every Tuesday' is 1 recurring event."
)
