# Agent Pipeline

DropCal converts messy text, images, audio, and PDFs into calendar events through a multi-agent pipeline. Each agent handles a distinct cognitive task with different context requirements.

## Pipeline

```
Raw Input (text/image/audio/PDF)
  |
  v
Agent 1: Identification ─── "What events are in here?"
  |
  |  one IdentifiedEvent per event found
  v
Agent 2: Extraction ──────── "What is this event, exactly?"    (parallel per event)
  |
  |  one CalendarEvent per event
  v
Agent 3: Personalization ─── "How does this user want it?"     (authenticated users with history)
  |
  v
Database / Calendar API
```

## Agents

### Agent 1 — Identification
**File:** `extraction/agents/identification.py`
**Input:** Raw text/image/PDF + metadata
**Output:** `IdentificationResult` (list of `IdentifiedEvent`)

Finds all distinct calendar events in the raw input. Each identified event gets a list of relevant text chunks (`raw_text`) and a distinguishing description. This is the only agent that sees the full input — downstream agents work per-event.

### Agent 2 — Extraction
**File:** `extraction/agents/facts.py`
**Prompt:** `extraction/prompts/extraction.txt`
**Input:** Text chunks + description (from Agent 1) + user timezone
**Output:** `CalendarEvent`

The core of the pipeline. Reads messy event text, resolves relative dates/times using injected temporal context, and produces a complete, high-quality calendar event. Handles fact extraction and formatting in a single pass — there is no separate formatting step.

The output should be accurate, descriptive, and immediately usable as a calendar event even without personalization. Title formatting, duration estimation, location standardization, and recurrence rules are all handled here.

Runs in parallel across events (one thread per event, with a DB lock for writes).

### Agent 3 — Personalization
**File:** `preferences/agent.py`
**Prompt:** `preferences/prompts/preferences.txt`
**Input:** `CalendarEvent` + discovered patterns + historical events + user corrections
**Output:** Enhanced `CalendarEvent`

Adapts the generic calendar event to the user's personal style. Uses:
- **Discovered patterns** — calendar/color mappings, title formatting preferences, category associations learned from the user's history
- **Few-shot examples** — semantically similar past events found via embedding similarity search, showing the user's actual formatting choices
- **Correction learning** — past cases where the system suggested an event and the user edited it, so the same mistakes aren't repeated

Only runs for authenticated users with sufficient event history. Guests and new users get Agent 2's output directly.

### Agent 4 — Modification
**File:** `modification/agent.py`
**Prompt:** `modification/prompts/modification.txt`
**Input:** Existing `CalendarEvent` + natural language edit instruction
**Output:** Modified `CalendarEvent`

Separate from the main pipeline. Called via API when a user edits an existing event with natural language (e.g., "move to 3pm", "add Sarah as attendee"). Takes the original event and the edit instruction, returns the modified event.

## Standard Model

All agents produce or consume `CalendarEvent` (defined in `extraction/models.py`). This is the single canonical format flowing through the pipeline:

- **Core fields:** summary, start, end, location, description, recurrence, attendees
- **Metadata:** meeting_url, people, instructions (extracted context for downstream use)
- **Personalization:** calendar, colorId (set by Agent 3 or left null for default)

`CalendarDateTime` supports both timed events (`dateTime` + `timeZone`) and all-day events (`date`).

## LLM Configuration

Each agent can use a different LLM provider. Configuration is in `config/text.py` — switch presets with `TextModelConfig.all_grok()`, `TextModelConfig.all_claude()`, or `TextModelConfig.hybrid_optimized()`.
