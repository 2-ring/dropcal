# DropCal Personalization System - Implementation Plan

**Status**: Planning phase
**Date**: 2026-01-31

---

## Overview

This document outlines the implementation plan for the two remaining critical pieces of the DropCal personalization system:

1. **Pattern Discovery/Analysis System** - Analyzes calendar history to discover user patterns
2. **Automatic Pipeline Integration** - Wires preferences into the main event processing flow

## Part 1: Pattern Discovery/Analysis System

### 1.1 Purpose

**Input**: `comprehensive_data` from data collection service containing:
- Events from last 365 days
- User settings (timezone, default event length)
- Color definitions
- Calendar list with metadata

**Output**: `UserPreferences` object with discovered patterns in:
- Title formatting
- Description formatting
- Color usage
- Location formatting
- Duration preferences
- Timing patterns
- Calendar usage (when/why each calendar is used)
- Contextual patterns ("when X, do Y")
- General observations

### 1.2 Architecture

**Multi-agent LLM-based pattern discovery** using Claude Sonnet 4 with structured outputs.

Each analysis agent examines events through a specific lens:

```
comprehensive_data
    ↓
┌─────────────────────────────────────────┐
│  Pattern Analysis Orchestrator          │
│  (pattern_analysis_service.py)          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Parallel Analysis Agents               │
├─────────────────────────────────────────┤
│  1. Title Pattern Agent                 │
│  2. Description Pattern Agent           │
│  3. Color Usage Agent                   │
│  4. Location Pattern Agent              │
│  5. Duration Pattern Agent              │
│  6. Timing Pattern Agent                │
│  7. Calendar Usage Agent                │
│  8. Contextual Pattern Agent            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Pattern Consolidation Agent            │
│  (Synthesizes + General Observations)   │
└─────────────────────────────────────────┘
    ↓
UserPreferences object
```

**Why multi-agent?**
- Each agent focuses on ONE aspect (title patterns, colors, etc.)
- Parallel execution for speed
- Structured outputs ensure valid DiscoveredPattern objects
- Final consolidation agent catches cross-cutting patterns

### 1.3 Implementation Details

#### File: `backend/pattern_analysis_service.py`

```python
class PatternAnalysisService:
    """
    Service for discovering user preferences from calendar history.
    Uses LLM-based agents to analyze events and extract patterns.
    """

    def __init__(self, llm_provider):
        self.llm = llm_provider
        self.logger = app_logger

    def analyze_comprehensive_data(
        self,
        comprehensive_data: Dict
    ) -> UserPreferences:
        """
        Main entry point: Analyze collected data and discover patterns.

        Args:
            comprehensive_data: Dict with keys:
                - events: List[Dict] (all events from last year)
                - settings: Dict (timezone, default_event_length)
                - colors: Dict (color definitions)
                - calendars: List[Dict] (calendar metadata)

        Returns:
            UserPreferences object with all discovered patterns
        """

    # Individual analysis agents
    def _analyze_title_patterns(self, events: List[Dict]) -> TitleFormattingPatterns
    def _analyze_description_patterns(self, events: List[Dict]) -> DescriptionFormattingPatterns
    def _analyze_color_usage(self, events: List[Dict], colors: Dict) -> ColorUsagePatterns
    def _analyze_location_patterns(self, events: List[Dict]) -> LocationFormattingPatterns
    def _analyze_duration_patterns(self, events: List[Dict]) -> DurationPatterns
    def _analyze_timing_patterns(self, events: List[Dict]) -> TimingPatterns
    def _analyze_calendar_usage(self, events: List[Dict], calendars: List[Dict]) -> CalendarUsagePatterns
    def _analyze_contextual_patterns(self, events: List[Dict]) -> ContextualPatterns

    # Consolidation
    def _consolidate_and_observe(
        self,
        all_patterns: Dict,
        comprehensive_data: Dict
    ) -> List[str]:
        """Generate general observations across all patterns"""
```

### 1.4 Agent Implementation Strategy

Each analysis agent follows this pattern:

**Step 1: Prepare data subset**
```python
def _analyze_title_patterns(self, events: List[Dict]) -> TitleFormattingPatterns:
    # Extract relevant fields
    titles = [
        {
            'summary': e.get('summary'),
            'start': e.get('start'),
            'eventType': e.get('eventType'),
            'colorId': e.get('colorId')
        }
        for e in events if e.get('summary')
    ]

    # Sample if too many (keep diversity)
    if len(titles) > 500:
        titles = self._smart_sample(titles, target=500)
```

**Step 2: Build analysis prompt**
```python
    prompt = f"""
You are analyzing a user's calendar event titles to discover formatting patterns.

You have {len(titles)} event titles from the last year.

TASK: Discover patterns in how this user formats event titles.

INSTRUCTIONS:
1. Look for repeated formatting structures (e.g., "[CODE] Type", "Category: Title")
2. Identify naming conventions for different event types
3. Note capitalization patterns, abbreviation usage, special characters
4. Find patterns that are consistent (always/usually) vs occasional (sometimes)
5. For each pattern, provide:
   - Clear description of the pattern
   - Confidence level (high/medium/low)
   - 2-3 concrete examples from the data
   - Frequency (always/usually/sometimes)

EVENTS:
{json.dumps(titles[:100], indent=2)}
[... showing first 100 of {len(titles)} events]

DISCOVER AND DESCRIBE PATTERNS.
"""
```

**Step 3: Call LLM with structured output**
```python
    # Use LangChain structured output
    result = self.llm.with_structured_output(TitleFormattingPatterns).invoke(prompt)

    return result
```

### 1.5 Key Implementation Details

#### Smart Sampling
When too many events (>500), sample intelligently:
```python
def _smart_sample(self, events: List[Dict], target: int) -> List[Dict]:
    """
    Sample events while maintaining diversity.

    Strategy:
    - Keep all recurring event examples (1 per series)
    - Stratify by month to get full year coverage
    - Stratify by event type if available
    - Stratify by color to capture different categories
    """
    # Implementation ensures LLM sees diverse examples
```

#### Calendar Usage Analysis
Special attention needed here - must capture when calendars ARE and AREN'T used:
```python
def _analyze_calendar_usage(
    self,
    events: List[Dict],
    calendars: List[Dict]
) -> CalendarUsagePatterns:
    """
    Critical: Determine when/why each calendar is used.

    For each calendar:
    1. Find all events on that calendar
    2. Analyze what types of events go there
    3. Identify patterns: "ONLY for X", "NEVER for Y", "ALL academic events"
    4. Determine if primary or specialized usage
    """

    # Group events by calendar_id
    events_by_calendar = defaultdict(list)
    for event in events:
        cal_id = event.get('organizer', {}).get('email') or 'primary'
        events_by_calendar[cal_id].append(event)

    # For each calendar, build usage profile
    calendar_patterns = []
    for calendar in calendars:
        cal_events = events_by_calendar.get(calendar['id'], [])

        # LLM analyzes: What goes here? What doesn't?
        usage_pattern = self._analyze_single_calendar_usage(
            calendar=calendar,
            calendar_events=cal_events,
            all_events=events  # Compare to full set
        )

        calendar_patterns.append(usage_pattern)
```

#### Contextual Pattern Discovery
Find cross-cutting "when X, then Y" patterns:
```python
def _analyze_contextual_patterns(self, events: List[Dict]) -> ContextualPatterns:
    """
    Discover conditional patterns that span categories.

    Examples:
    - "When title contains 'Midterm', duration is always 90 min"
    - "When location is 'Zoom', description always includes link"
    - "When event is on weekend, color is always blue (9)"
    - "When recurring weekly class, uses turquoise (2)"
    """

    prompt = """
    Look across ALL event attributes to find contextual patterns.

    Format: "When [condition], user [action/convention]"

    Focus on:
    - Conditional formatting (if event type X, then format Y)
    - Cross-attribute patterns (if title has X, then color is Y)
    - Temporal patterns (if weekend, then Z)
    - Recurring event conventions
    """
```

#### Consolidation Agent
After all individual analyses, synthesize:
```python
def _consolidate_and_observe(
    self,
    all_patterns: Dict,
    comprehensive_data: Dict
) -> List[str]:
    """
    Look at ALL discovered patterns together to find:
    1. Overarching themes (e.g., "Very structured calendar")
    2. Consistency level (always precise vs flexible)
    3. Notable absences (never uses emojis, never uses all-day events)
    4. General habits that don't fit other categories
    """

    prompt = f"""
    You have analyzed this user's calendar from multiple angles.

    DISCOVERED PATTERNS:
    {json.dumps(all_patterns, indent=2)}

    TASK: Generate 5-10 general observations about this user's calendar habits.

    Focus on:
    - Overall organizational style
    - Consistency vs flexibility
    - Notable preferences or avoidances
    - Cross-cutting themes

    Return as list of strings.
    """
```

### 1.6 API Endpoint

Add to `backend/app.py`:

```python
@app.route('/api/personalization/analyze', methods=['POST'])
def analyze_calendar_for_preferences():
    """
    Run comprehensive pattern analysis on user's calendar history.

    Process:
    1. Fetch comprehensive data (last year of events + metadata)
    2. Run pattern analysis agents
    3. Save discovered preferences
    4. Return summary

    Expected time: 60-180 seconds
    """

    try:
        # Get user_id from session
        user_id = get_user_id_from_session()

        # Collect data
        app_logger.info(f"Starting comprehensive data collection for {user_id}")
        collection_service = DataCollectionService(calendar_service)
        comprehensive_data = collection_service.collect_comprehensive_data()

        app_logger.info(f"Collected {len(comprehensive_data['events'])} events")

        # Analyze patterns
        app_logger.info("Starting pattern analysis")
        analysis_service = PatternAnalysisService(llm_provider)
        preferences = analysis_service.analyze_comprehensive_data(comprehensive_data)

        # Save preferences
        personalization_service = PersonalizationService()
        personalization_service.save_preferences(preferences)

        app_logger.info(f"Pattern analysis complete for {user_id}")

        # Return summary
        return jsonify({
            'success': True,
            'user_id': user_id,
            'analysis': {
                'events_analyzed': preferences.total_events_analyzed,
                'date_range': preferences.analysis_date_range,
                'patterns_discovered': {
                    'title_patterns': len(preferences.title_formatting.patterns),
                    'description_patterns': len(preferences.description_formatting.patterns),
                    'color_patterns': len(preferences.color_usage.patterns),
                    'location_patterns': len(preferences.location_formatting.patterns),
                    'duration_patterns': len(preferences.duration_patterns.patterns),
                    'timing_patterns': len(preferences.timing_patterns.patterns),
                    'calendars_analyzed': len(preferences.calendar_usage.calendars),
                    'contextual_patterns': len(preferences.contextual_patterns.patterns),
                    'general_observations': len(preferences.general_observations)
                }
            }
        }), 200

    except Exception as e:
        app_logger.error(f"Error during pattern analysis: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
```

### 1.7 Testing Strategy

#### Test Script: `backend/test_pattern_analysis.py`

```python
"""
Test pattern discovery on real calendar data.
"""

def test_pattern_analysis():
    # 1. Collect comprehensive data
    comprehensive_data = collection_service.collect_comprehensive_data()
    print(f"Collected {len(comprehensive_data['events'])} events")

    # 2. Run analysis
    analysis_service = PatternAnalysisService(llm_provider)
    preferences = analysis_service.analyze_comprehensive_data(comprehensive_data)

    # 3. Display results
    print("\n" + "="*60)
    print("DISCOVERED PATTERNS")
    print("="*60)

    print(f"\nTitle Patterns: {len(preferences.title_formatting.patterns)}")
    for p in preferences.title_formatting.patterns:
        print(f"  - {p.pattern} [{p.frequency}]")
        print(f"    Examples: {', '.join(p.examples[:2])}")

    # ... display all pattern categories ...

    print(f"\nCalendar Usage:")
    for cal in preferences.calendar_usage.calendars:
        print(f"  {cal.calendar_name} ({'PRIMARY' if cal.is_primary else 'Secondary'})")
        for up in cal.usage_patterns:
            print(f"    - {up.pattern}")

    print(f"\nGeneral Observations:")
    for obs in preferences.general_observations:
        print(f"  - {obs}")

    # 4. Save and reload test
    personalization_service.save_preferences(preferences)
    loaded = personalization_service.load_preferences(preferences.user_id)

    assert loaded.total_events_analyzed == preferences.total_events_analyzed
    print("\n✅ Save/load test passed")
```

### 1.8 Performance Considerations

**Parallel Agent Execution**:
```python
import concurrent.futures

def analyze_comprehensive_data(self, comprehensive_data: Dict) -> UserPreferences:
    """Run analysis agents in parallel for speed"""

    events = comprehensive_data['events']

    # Define agent tasks
    tasks = [
        ('title', self._analyze_title_patterns, [events]),
        ('description', self._analyze_description_patterns, [events]),
        ('color', self._analyze_color_usage, [events, comprehensive_data['colors']]),
        ('location', self._analyze_location_patterns, [events]),
        ('duration', self._analyze_duration_patterns, [events]),
        ('timing', self._analyze_timing_patterns, [events]),
        ('calendar', self._analyze_calendar_usage, [events, comprehensive_data['calendars']]),
        ('contextual', self._analyze_contextual_patterns, [events])
    ]

    # Execute in parallel
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        future_to_name = {
            executor.submit(func, *args): name
            for name, func, args in tasks
        }

        for future in concurrent.futures.as_completed(future_to_name):
            name = future_to_name[future]
            results[name] = future.result()
            app_logger.info(f"✓ Completed {name} pattern analysis")

    # Consolidate
    general_observations = self._consolidate_and_observe(results, comprehensive_data)

    # Build UserPreferences object
    return UserPreferences(
        user_id=get_user_id(),
        total_events_analyzed=len(events),
        # ... all pattern results ...
    )
```

**Expected timing**:
- Data collection: 30-90 seconds
- Pattern analysis (parallel): 30-60 seconds
- Total: 60-150 seconds

---

## Part 2: Automatic Pipeline Integration

### 2.1 Current Flow

```
User input (text/image)
    ↓
Agent 1: Event Extraction
    ↓
Agent 2: Fact Structuring
    ↓
Agent 3: Calendar Formatting  ← Agent 5 NOT in flow
    ↓
Conflict Check
    ↓
Output
```

### 2.2 Target Flow

```
User input (text/image)
    ↓
Agent 1: Event Extraction
    ↓
Agent 2: Fact Structuring
    ↓
┌─────────────────────────────┐
│ Check if user has prefs     │
└─────────────────────────────┘
    ↓
[If preferences exist]
    ↓
Agent 5: Preference Application
    ↓
Agent 3: Calendar Formatting
    ↓
Conflict Check
    ↓
Output
```

### 2.3 Implementation: Backend Changes

#### Modify `backend/app.py` - Main Event Processing Endpoint

Current endpoint: `/api/events/process`

**Changes needed**:

```python
@app.route('/api/events/process', methods=['POST'])
def process_events():
    """
    Main event processing pipeline.
    Now includes automatic preference application.
    """

    # ... existing Agent 1 and Agent 2 logic ...

    # After Agent 2 (facts extracted)
    structured_facts = agent2_result

    # NEW: Check if user has preferences
    user_id = get_user_id_from_session()
    personalization_service = PersonalizationService()

    if personalization_service.has_preferences(user_id):
        app_logger.info(f"Applying preferences for user {user_id}")

        # Load preferences
        user_preferences = personalization_service.load_preferences(user_id)

        # Run Agent 5: Preference Application
        enhanced_facts = run_preference_application(
            facts=structured_facts,
            user_preferences=user_preferences,
            system_prompt=load_system_prompt('agent5_preference_application')
        )

        app_logger.info("Preferences applied successfully")
        structured_facts = enhanced_facts  # Use enhanced facts
    else:
        app_logger.info(f"No preferences found for {user_id}, skipping personalization")

    # Continue with Agent 3 (now gets preference-enhanced facts if available)
    calendar_events = run_calendar_formatting(
        facts=structured_facts,
        ...
    )

    # ... rest of pipeline ...
```

### 2.4 Implementation: Frontend Changes

#### Add Preference Management UI

**File**: `frontend/src/components/PreferenceSettings.tsx` (NEW)

```tsx
interface PreferenceSettingsProps {
  userId: string;
}

export function PreferenceSettings({ userId }: PreferenceSettingsProps) {
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');

  // Check if user has preferences
  useEffect(() => {
    fetch(`/api/personalization/preferences/${userId}`)
      .then(res => res.ok ? setHasPreferences(true) : setHasPreferences(false))
  }, [userId]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress('Collecting calendar data...');

    try {
      const response = await fetch('/api/personalization/analyze', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setHasPreferences(true);
        setAnalysisProgress('Analysis complete!');
        // Show summary
        alert(`
          Pattern Analysis Complete!

          Analyzed ${result.analysis.events_analyzed} events

          Discovered patterns:
          - Title patterns: ${result.analysis.patterns_discovered.title_patterns}
          - Color patterns: ${result.analysis.patterns_discovered.color_patterns}
          - Calendar usage: ${result.analysis.patterns_discovered.calendars_analyzed} calendars

          Your preferences will now be automatically applied to new events.
        `);
      }
    } catch (error) {
      setAnalysisProgress('Error during analysis');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="preference-settings">
      <h2>Personalization</h2>

      {hasPreferences ? (
        <div>
          <p>✅ Your preferences are active</p>
          <p>New events will automatically match your formatting style.</p>
          <button onClick={() => {/* Show preference details */}}>
            View Learned Patterns
          </button>
          <button onClick={runAnalysis}>
            Re-analyze Calendar (Update Preferences)
          </button>
        </div>
      ) : (
        <div>
          <p>No preferences learned yet.</p>
          <p>
            Analyze your calendar history to learn your formatting preferences.
            This will help DropCal format new events to match your style.
          </p>
          <button onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? analysisProgress : 'Analyze My Calendar'}
          </button>
          <p className="note">
            This will analyze the last year of calendar events (takes 1-2 minutes)
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Add to Main App

**File**: `frontend/src/App.tsx`

```tsx
// Add preference settings to authenticated view
{isAuthenticated && (
  <div className="settings-panel">
    <PreferenceSettings userId={userId} />
  </div>
)}
```

### 2.5 User Experience Flow

**First-time user**:
1. User authenticates with Google Calendar
2. Main event input screen shows
3. Settings panel shows "No preferences learned yet" with "Analyze Calendar" button
4. User clicks "Analyze My Calendar"
5. Progress indicator shows: "Collecting data... Analyzing patterns..."
6. After 60-120 seconds, shows summary of discovered patterns
7. Future events automatically use learned preferences

**Returning user with preferences**:
1. User authenticates
2. Preferences automatically loaded in background
3. All events formatted with learned patterns
4. Settings shows "✅ Preferences active"
5. Option to view patterns or re-analyze

### 2.6 Preference Toggle

Add option to enable/disable preference application:

```python
# In app.py
@app.route('/api/personalization/toggle', methods=['POST'])
def toggle_preferences():
    """Enable/disable preference application for this session"""
    data = request.json
    enabled = data.get('enabled', True)

    session['preferences_enabled'] = enabled

    return jsonify({'success': True, 'enabled': enabled})
```

Then in main processing:
```python
preferences_enabled = session.get('preferences_enabled', True)

if personalization_service.has_preferences(user_id) and preferences_enabled:
    # Apply preferences
```

This allows users to temporarily disable personalization if they want default formatting.

### 2.7 Testing Integration

#### Test Script: `backend/test_full_pipeline.py`

```python
"""
Test full pipeline with and without preferences.
"""

def test_pipeline_without_preferences():
    """Test that pipeline works when user has no preferences"""
    # Delete any existing preferences
    personalization_service.delete_preferences('test_user')

    # Process event
    result = process_event_text("Team meeting tomorrow at 2pm")

    # Should get default formatting
    assert result['success']
    assert 'calendar_events' in result

def test_pipeline_with_preferences():
    """Test that preferences are automatically applied"""
    # Set up test preferences
    preferences = UserPreferences(
        user_id='test_user',
        # ... pattern definitions ...
    )
    personalization_service.save_preferences(preferences)

    # Process event
    result = process_event_text("CS101 lecture tomorrow at 2pm")

    # Should have applied preferences (check for pattern-specific formatting)
    event = result['calendar_events'][0]
    assert event['summary'].startswith('[CS101]')  # Title pattern
    assert event['colorId'] == '2'  # Academic color pattern
```

---

## Implementation Order

### Phase 1: Pattern Analysis System (Week 1)
1. Create `pattern_analysis_service.py` with skeleton
2. Implement individual analysis agents (one per day):
   - Day 1: Title + Description agents
   - Day 2: Color + Location agents
   - Day 3: Duration + Timing agents
   - Day 4: Calendar Usage + Contextual agents
   - Day 5: Consolidation agent
3. Add API endpoint
4. Test with real calendar data
5. Iterate on prompts based on quality of discovered patterns

### Phase 2: Pipeline Integration (Week 2)
1. Modify main event processing endpoint
2. Add preference check logic
3. Test pipeline with/without preferences
4. Add preference toggle
5. Verify no performance degradation

### Phase 3: Frontend UI (Week 2)
1. Create PreferenceSettings component
2. Add to main app
3. Add loading states and progress indicators
4. Test user flow
5. Polish UX

### Phase 4: Testing & Refinement (Week 3)
1. End-to-end testing with real users
2. Collect feedback on discovered patterns
3. Refine analysis prompts
4. Performance optimization
5. Documentation

---

## Success Criteria

### Pattern Discovery
- ✅ Discovers 5+ title patterns with high confidence
- ✅ Identifies color usage for at least 3 event types
- ✅ Correctly captures calendar usage (when/why each calendar used)
- ✅ Finds contextual patterns (3+ "when X, then Y" rules)
- ✅ Analysis completes in <180 seconds
- ✅ Patterns are actionable and accurate

### Pipeline Integration
- ✅ Preferences automatically applied when available
- ✅ Pipeline works identically when no preferences exist
- ✅ No performance degradation (<100ms added latency)
- ✅ Users can toggle preferences on/off
- ✅ Frontend shows preference status clearly

### User Experience
- ✅ One-click analysis from UI
- ✅ Progress feedback during analysis
- ✅ Clear summary of discovered patterns
- ✅ Formatted events match user's historical style
- ✅ Users report satisfaction with personalization

---

## Risk Mitigation

### Risk: Pattern analysis produces low-quality results
**Mitigation**:
- Start with example_preferences.json to validate data structure
- Test prompts with multiple real calendars
- Iterate on prompt engineering
- Add confidence thresholds (only apply high-confidence patterns)

### Risk: Performance issues with large calendars
**Mitigation**:
- Parallel agent execution
- Smart sampling for >500 events
- Progress indicators so users know it's working
- Run analysis as background task

### Risk: Users don't understand personalization
**Mitigation**:
- Clear UI explaining what analysis does
- Show discovered patterns to users
- Provide examples: "Your events will look like: [EXAMPLE]"
- Option to disable if not desired

### Risk: Breaking changes to existing pipeline
**Mitigation**:
- Conditional logic (only apply if preferences exist)
- Thorough testing of both paths
- Rollback plan
- Feature flag for gradual rollout

---

## Open Questions

1. **Pattern quality threshold**: What confidence level required to apply a pattern?
   - Proposal: Only apply "high" confidence patterns automatically, show "medium" for user review

2. **Preference update frequency**: How often should users re-analyze?
   - Proposal: Suggest re-analysis every 6 months or after major calendar changes

3. **Pattern conflicts**: What if discovered patterns contradict each other?
   - Proposal: Consolidation agent flags conflicts, uses most frequent pattern

4. **Multi-calendar priority**: When event could go to multiple calendars, how to choose?
   - Proposal: Use calendar usage patterns with primary calendar as fallback

---

## Next Steps

After plan approval:
1. Create `pattern_analysis_service.py` skeleton
2. Implement first analysis agent (title patterns) as proof of concept
3. Test on real calendar data
4. Iterate until pattern quality is good
5. Scale to remaining agents
6. Integrate into pipeline
