# FINAL AGENT PLAN - Complete 1:1 Web Conversion

**Objective**: Fix the last 3-4 remaining issues to achieve pixel-perfect 1:1 web conversion.

**Working Directory**: `/home/lucas/files/university/startups/hack@brown/mobile`

---

## TASK 1: Fix Modal Animations (HomeScreen)

**Current Issue**: HomeScreen uses `animationType="slide"` for all modals. Web uses fade.

**File**: `src/screens/HomeScreen.tsx`

**Lines to Fix**: 297, 305, 313, 320

**Change**:
```typescript
// BEFORE (lines 297, 305, 313, 320):
<Modal visible={showTextInput} onClose={() => setShowTextInput(false)} animationType="slide" height="full">

// AFTER:
<Modal visible={showTextInput} onClose={() => setShowTextInput(false)} animationType="fade" height="full">
```

**Apply to all 4 modal calls**:
- Text Input Modal (line 297)
- Link Input Modal (line 305)
- Email Input Modal (line 313)
- Audio Recorder Modal (line 320)

**Verification**: Modals should fade in at center, not slide from bottom.

---

## TASK 2: Add AI Chat Editing to EventsListScreen

**Current Issue**: EventsListScreen is missing the "Request Changes" AI chat feature.

**File**: `src/screens/EventsListScreen.tsx`

**Web Reference**:
- `/home/lucas/files/university/startups/hack@brown/frontend/src/workspace/events/EventsWorkspace.tsx` (lines 42-43, 175-241)
- `/home/lucas/files/university/startups/hack@brown/frontend/src/workspace/events/Bar.tsx` (BottomBar component)

### Step 2.1: Add State Variables

Add to EventsListScreen component:
```typescript
const [changeRequest, setChangeRequest] = useState('')
const [isChatExpanded, setIsChatExpanded] = useState(false)
const [isProcessingEdit, setIsProcessingEdit] = useState(false)
```

### Step 2.2: Add API Handler

Add this function:
```typescript
const handleChangeRequest = async () => {
  if (!changeRequest.trim()) return

  setIsProcessingEdit(true)
  try {
    const response = await backendClient.refineEvents(sessionId, changeRequest)

    // Update events with refined versions
    setEvents(response.refined_events)

    toast.success('Events Updated', {
      description: 'AI has processed your request.',
      duration: 3000,
    })

    setChangeRequest('')
    setIsChatExpanded(false)
  } catch (error) {
    console.error('Failed to refine events:', error)
    toast.error('Request Failed', {
      description: error instanceof Error ? error.message : 'Could not process request',
      duration: 4000,
    })
  } finally {
    setIsProcessingEdit(false)
  }
}
```

### Step 2.3: Add Backend API Function

In `src/api/backend-client.ts`, add:
```typescript
/**
 * Refine events with AI based on user request
 * @param sessionId - Session ID
 * @param changeRequest - User's natural language request (e.g., "Make all events 30 minutes longer")
 */
export async function refineEvents(
  sessionId: string,
  changeRequest: string
): Promise<{ refined_events: CalendarEvent[] }> {
  const headers = await getAuthHeaders()

  const response = await fetch(
    `${API_URL}/api/sessions/${sessionId}/refine`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ change_request: changeRequest }),
    }
  )

  return handleResponse(response)
}
```

### Step 2.4: Update Bottom Bar UI

Find the bottom bar section in EventsListScreen and replace with:

```typescript
<View style={styles.bottomBarContainer}>
  {/* Gradient fade above bar */}
  <LinearGradient
    colors={['transparent', theme.colors.background]}
    style={styles.gradient}
  />

  <View style={[styles.bottomBar, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
    {/* Collapsible chat input */}
    {isChatExpanded && (
      <View style={styles.chatRow}>
        <TextInput
          style={[styles.chatInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
          }]}
          placeholder="Request changes..."
          placeholderTextColor={theme.colors.textTertiary}
          value={changeRequest}
          onChangeText={setChangeRequest}
          editable={!isProcessingEdit}
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleChangeRequest}
          disabled={!changeRequest.trim() || isProcessingEdit}
        >
          {isProcessingEdit ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Icon name="PaperPlaneTilt" size={20} color="#ffffff" />
          )}
        </Pressable>
      </View>
    )}

    {/* Main bar row */}
    <View style={styles.mainRow}>
      <Text style={[styles.eventCount, { color: theme.colors.textSecondary }]}>
        {events.length} event{events.length !== 1 ? 's' : ''}
      </Text>

      {/* Animated loading dots */}
      {isProcessingEdit && (
        <View style={styles.dotsContainer}>
          <AnimatedDots />
        </View>
      )}

      {/* Request changes toggle */}
      <Pressable
        style={styles.requestChangesButton}
        onPress={() => setIsChatExpanded(!isChatExpanded)}
      >
        <Text style={[styles.requestChangesText, { color: theme.colors.textSecondary }]}>
          Request changes
        </Text>
        <Icon
          name={isChatExpanded ? 'CaretUp' : 'CaretDown'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {/* Confirm button */}
      <Button
        onPress={handleConfirm}
        disabled={events.length === 0 || isProcessingEdit}
      >
        Confirm
      </Button>
    </View>
  </View>
</View>
```

### Step 2.5: Add AnimatedDots Component

Add this helper component in the same file:
```typescript
const AnimatedDots = () => {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.'
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return <Text style={styles.dots}>{dots}</Text>
}
```

### Step 2.6: Add Styles

Add these styles to the StyleSheet:
```typescript
bottomBarContainer: {
  position: 'relative',
},
gradient: {
  height: 40,
  position: 'absolute',
  top: -40,
  left: 0,
  right: 0,
},
bottomBar: {
  borderTopWidth: 1,
  paddingHorizontal: 24,
  paddingVertical: 16,
},
chatRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
},
chatInput: {
  flex: 1,
  height: 40,
  borderRadius: 20,
  borderWidth: 1,
  paddingHorizontal: 16,
  fontSize: 14,
},
sendButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
mainRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 16,
},
eventCount: {
  fontSize: 14,
  fontWeight: '500',
},
dotsContainer: {
  width: 20,
},
dots: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#999',
},
requestChangesButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 12,
  paddingVertical: 8,
},
requestChangesText: {
  fontSize: 14,
  fontWeight: '500',
},
```

### Step 2.7: Add react-native-linear-gradient Import

At top of file:
```typescript
import LinearGradient from 'react-native-linear-gradient'
```

**Verification**:
- Bottom bar should have gradient fade above it
- "Request changes" button toggles chat input
- Chat input is 40px height, 20px border-radius (pill)
- Typing request and sending updates events via AI
- Loading dots appear during processing

---

## TASK 3: Verify Event Edit is Overlay (Not Full-Screen)

**File to Check**: `src/screens/EventsListScreen.tsx`

**Current Unknown**: Need to verify if event editing is shown as overlay modal or full-screen navigation.

**Required Behavior** (from web):
- Event edit should be **overlay modal** (max-width: 500px) centered on screen
- NOT separate navigation screen
- Triggered by tapping event card
- Semi-transparent backdrop
- Close with X button or tap outside

**If Not Implemented**:

### Step 3.1: Add State
```typescript
const [editingEventId, setEditingEventId] = useState<string | null>(null)
```

### Step 3.2: Find Event Card Tap Handler

Replace navigation push with:
```typescript
onPress={() => setEditingEventId(event.id)}
```

### Step 3.3: Add Modal at Bottom of Component

```typescript
{/* Event Edit Overlay */}
<Modal
  visible={editingEventId !== null}
  onClose={() => setEditingEventId(null)}
  animationType="fade"
>
  <View style={styles.editOverlay}>
    <Pressable
      style={styles.editCloseButton}
      onPress={() => setEditingEventId(null)}
    >
      <Icon name="X" size={24} color={theme.colors.textPrimary} />
    </Pressable>

    {editingEventId && (
      <EventEditView
        event={events.find(e => e.id === editingEventId)!}
        onSave={(updatedEvent) => {
          setEvents(events.map(e => e.id === editingEventId ? updatedEvent : e))
          setEditingEventId(null)
        }}
        onCancel={() => setEditingEventId(null)}
      />
    )}
  </View>
</Modal>
```

### Step 3.4: Add Styles
```typescript
editOverlay: {
  maxWidth: 500,
  width: '90%',
  backgroundColor: theme.colors.background,
  borderRadius: 16,
  padding: 24,
  maxHeight: '80%',
},
editCloseButton: {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
},
```

**Verification**: Tapping event card shows centered overlay (not full-screen), max-width 500px, rounded corners.

---

## TASK 4: Add Event Count to Bottom Bar (if missing)

**Check**: EventsListScreen bottom bar should show event count like "5 events"

**If Missing**: Add to mainRow:
```typescript
<Text style={[styles.eventCount, { color: theme.colors.textSecondary }]}>
  {events.length} event{events.length !== 1 ? 's' : ''}
</Text>
```

---

## DELIVERABLES CHECKLIST

After completing all tasks, verify:

- [ ] HomeScreen modals use `animationType="fade"` (not "slide")
- [ ] EventsListScreen has AI chat input at bottom
- [ ] "Request changes" button toggles chat visibility
- [ ] Chat input is 40px height, 20px border-radius (pill)
- [ ] Gradient fade appears above bottom bar (40px)
- [ ] Animated dots show during AI processing
- [ ] Event count displays in bottom bar
- [ ] Event edit appears as overlay modal (max-width 500px)
- [ ] Event edit NOT using navigation stack
- [ ] TypeScript compiles with no errors: `npx tsc --noEmit`
- [ ] Backend API has `refineEvents` function
- [ ] react-native-linear-gradient imported and used

---

## VERIFICATION STEPS

1. **Test AI Chat**:
   - Open EventsList screen
   - Click "Request changes"
   - Chat input should expand
   - Type "Make all events 1 hour long"
   - Send and verify events update

2. **Test Event Edit**:
   - Tap event card
   - Should see overlay (not full-screen)
   - Max-width 500px, centered
   - Edit and save works

3. **Test Modal Animations**:
   - Open text/link/audio/email inputs
   - Should fade in at center (not slide from bottom)

4. **Visual Comparison**:
   - Compare with web screenshots
   - Bottom bar should match web exactly
   - Gradient, chat input, event count all present

---

## WEB REFERENCE FILES

Read these for exact implementation:
- `/home/lucas/files/university/startups/hack@brown/frontend/src/workspace/events/EventsWorkspace.tsx` (lines 42-43, 175-241)
- `/home/lucas/files/university/startups/hack@brown/frontend/src/workspace/events/Bar.tsx` (BottomBar component)
- `/home/lucas/files/university/startups/hack@brown/frontend/src/workspace/events/EventEditView.tsx`

---

## CRITICAL REMINDERS

1. **NO CREATIVE DECISIONS** - Copy web implementation exactly
2. **EXACT MEASUREMENTS** - 40px gradient, 20px border-radius, etc.
3. **READ WEB FILES** - Don't guess, read the actual implementation
4. **TEST THOROUGHLY** - All features must work, not just look right
5. **1:1 CONVERSION** - This is the final step to pixel-perfect match

After completion, the mobile app will be a **complete 1:1 conversion** of the web app with all features intact.
