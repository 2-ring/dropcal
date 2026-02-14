# Prompt Design Principles — Agent 3 (Personalization)

Guidelines for writing and refining LLM prompts in the DropCal pipeline. Developed during the Agent 3 rewrite but applicable to any agent.

## Core Philosophy

We use an LLM for **reasoning**, not rule-following. If something can be done with code, do it with code. The prompt should present clean data and teach the model *how to think* about decisions, not give it a checklist.

## Principles

### 1. Show, don't summarize

Let the LLM learn from examples, not statistics. Showing 7 similar events titled "CS1680 Lecture" teaches naming style better than "Capitalization: Title Case (85% consistent), Typical length: 2.5 words." Abstract stats are noise — the model can extract patterns from concrete examples itself.

### 2. No threshold checks or mechanical rules

Bad: "If similarity score >= 0.8 and frequency is high, use that exact version."
Good: Reasoning guidance that explains *what to consider* and *what traps to avoid*.

The whole point of using an LLM is that it can reason about ambiguous situations. Threshold checks turn it into a worse version of an if-statement.

### 3. Encourage holistic thinking, not signal hierarchy

Don't tell the model "X is your strongest signal." Every signal has edge cases where it misleads. Instead, present all signals and guide the model to weigh them in context.

Example: calendar distribution shows 7/8 similar events in "Chores" — but those were school pickups and this event is a parent-teacher meeting. The distribution doesn't capture that distinction. Prompt should encourage the model to look at *why* events landed where they did, not just the counts.

### 4. Clarify edge cases with concrete examples

Abstract guidance like "infer when appropriate" doesn't help. Concrete scenarios do:
- "cit" → "CIT Centre" is a spelling correction (always safe)
- "CIT" → "CIT 368" is adding content (needs strong semantic backing — *this specific event* must have been in room 368 repeatedly, not just a similar one)

### 5. Constrain with schema, not instructions

Instead of "PRESERVE all other fields exactly as received" and hoping the LLM listens, use a dynamic Pydantic output model that only contains the fields the LLM is allowed to set. It physically cannot modify fields outside the schema. Merge results back in code.

### 6. Computational logic in Python, layout in Jinja

- **Python (`_build_*` methods):** Data transformation — nested dict traversal, sorting, formatting numbers, conditional aggregation. Anything that would require complex Jinja filters or multi-line logic blocks.
- **Jinja template:** Simple structural conditionals (`{% if show_section %}`), iterating pre-formatted lists, and static guidance text. If the text is static with a simple `{% if %}`, it belongs in the template.

Don't over-extract — moving static text like "Preserve start, recurrence, attendees" into Python just to avoid a `{% if %}` makes the code harder to read for no benefit.

### 7. Be concise

Every line in the prompt costs tokens and attention. If something can be said shorter, say it shorter.
- "All other event fields (start, recurrence, attendees, etc.) are preserved automatically — your output schema only contains the fields above." → "All other fields are preserved automatically."
- Remove sections that don't earn their token cost.

### 8. Make authority context-specific

Don't list every possible task generically. Tailor the authority list to what actually needs doing for *this* event:
- End time is missing → "Infer a reasonable end time" (not "Infer when missing")
- Location exists → "Standardize spelling and formatting" (not "Standardize, infer, or leave null")
- Only one calendar → Don't show the calendar section at all; assign it in code.
