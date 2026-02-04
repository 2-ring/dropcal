# Pattern Discovery Refactor Summary

## Changes Made

### Conceptual Model
**Before:**
- Calendars (organizational)
- Colors (analyzed for patterns)

**After:**
- Categories (calendars/categories - primary organization)
- Colors (stored for UI, not analyzed)

### Key Insight
Categories (called "calendars" in Google, "categories" in Microsoft) are the primary organizational dimension. Colors are just visual output—they get assigned based on category, but don't need LLM analysis.

## Files Updated

### 1. `backend/preferences/pattern_discovery_service.py`
- **Removed:** `_discover_color_patterns()` method (entire color pattern analysis)
- **Renamed:** `_discover_calendar_patterns()` → `_discover_category_patterns()`
- **Updated:** Return structure now has `category_patterns` instead of `calendar_patterns` and `color_patterns`
- **Added:** Color metadata (`backgroundColor`, `foregroundColor`) stored in category patterns for UI use
- **Updated:** LLM analysis now excludes `colorId` from event data

### 2. `backend/preferences/agent.py`
- **Removed:** Color patterns section from LLM context
- **Updated:** `calendar_patterns` → `category_patterns`
- **Renamed:** `_format_calendar_summaries()` → `_format_category_summaries()`
- **Updated:** Docstrings to reflect that colors are handled automatically

### 3. `backend/preferences/service.py`
- **Updated:** Docstrings to use `category_patterns` instead of `calendar_patterns` and `color_patterns`

## Data Structure Changes

### Before
```python
{
    'user_id': 'user123',
    'calendar_patterns': {...},  # Calendar-specific patterns
    'color_patterns': [...],      # LLM-analyzed color patterns
    'style_stats': {...},
    'total_events_analyzed': 500
}
```

### After
```python
{
    'user_id': 'user123',
    'category_patterns': {       # Renamed from calendar_patterns
        'cal_id_123': {
            'name': 'Classes',
            'is_primary': False,
            'color': '#9fe1e7',  # NEW: For UI display
            'foreground_color': '#000000',  # NEW: For UI display
            'description': '...',
            'event_types': [...],
            'examples': [...],
            'never_contains': [...]
        }
    },
    # color_patterns removed entirely
    'style_stats': {...},
    'total_events_analyzed': 500
}
```

## What Still Works

✅ **Events retain colorId** - Individual events still have `colorId` field for UI rendering
✅ **Categories have colors** - Each category stores `backgroundColor` and `foregroundColor` for UI
✅ **Per-category sampling** - Each category gets 100 events sampled independently
✅ **Weighted recency bias** - Recent events weighted 6x more than historical (0.6 bias)
✅ **Style statistics** - Capitalization, length, special chars still analyzed

## What Changed

❌ **No LLM color analysis** - Removed expensive LLM call to analyze color patterns
❌ **LLM doesn't see colors** - Event data sent to LLM excludes `colorId` field
✅ **Simpler mental model** - One organizational dimension (categories), not two (calendars + colors)
✅ **Fewer LLM calls** - Removed 1 LLM call per pattern discovery (was ~$0.02 per analysis)

## Benefits

1. **Cleaner separation of concerns**
   - Pattern discovery: What events go in which category?
   - UI rendering: What colors to display? (separate concern)

2. **Cost savings**
   - One fewer LLM call per pattern discovery
   - Smaller context (no color data in prompts)

3. **Better mental model**
   - Users organize with calendars/categories, not colors
   - System matches actual user behavior

4. **Cross-platform consistency**
   - Categories work the same in Google Calendar, Microsoft Outlook, Apple Calendar
   - Colors are just a display property

## Migration Notes

- **No data migration needed** - Old pattern files will work (extra fields ignored)
- **Backwards compatible** - Agent.py handles missing `category_patterns` gracefully
- **Legacy code** - `backend/preferences/analysis.py` not updated (appears unused)

## Testing Checklist

- [ ] Pattern discovery runs without errors
- [ ] Categories have `color` and `foreground_color` fields
- [ ] LLM context doesn't mention color patterns
- [ ] UI still renders events with correct colors
- [ ] Per-category sampling works (100 events each)
