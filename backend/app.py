from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename

from input_processor import InputProcessorFactory, InputType
from processors.audio_processor import AudioProcessor
from processors.image_processor import ImageProcessor
from processors.text_processor import TextFileProcessor
from processors.pdf_processor import PDFProcessor
from calendar_service import CalendarService

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB max file size

llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=os.getenv("ANTHROPIC_API_KEY"))

# Initialize Google Calendar service
calendar_service = CalendarService()

# Initialize input processor factory and register all processors
input_processor_factory = InputProcessorFactory()

# Register audio processor
audio_processor = AudioProcessor(api_key=os.getenv('OPENAI_API_KEY'))
input_processor_factory.register_processor(InputType.AUDIO, audio_processor)

# Register image processor
image_processor = ImageProcessor()
input_processor_factory.register_processor(InputType.IMAGE, image_processor)

# Register text file processor
text_processor = TextFileProcessor()
input_processor_factory.register_processor(InputType.TEXT, text_processor)

# Register PDF processor
pdf_processor = PDFProcessor()
input_processor_factory.register_processor(InputType.PDF, pdf_processor)

# Pydantic models for Agent 1: Event Identification
class IdentifiedEvent(BaseModel):
    """A single identified event with raw text and description"""
    raw_text: List[str] = Field(
        description="List of complete text chunks relevant to this event. Keep sentences/phrases intact. Can include multiple chunks if event info is spread across text. Chunks can repeat across events if shared context. Example: ['Team meeting tomorrow at 2pm in Conference Room B.', 'Bring the report.'] or ['Homework due Tuesdays at 9pm ET']"
    )
    description: str = Field(
        description="Uniquely identifying description using ONLY explicit facts from raw_text. Must distinguish this event from others. Examples: 'Team meeting with Sarah (tomorrow 2pm, Conference Room B)' or 'MATH 0180 first midterm exam (90 minutes, February 25, 6:30pm)' or 'Weekly homework deadline for ENGN 0520 (Tuesdays 9pm ET)'. NOT just 'Meeting' or 'Exam' - be specific and comprehensive."
    )
    confidence: str = Field(
        description="'definite' if certain this will happen, 'tentative' if uncertain (contains words like: maybe, possibly, might, perhaps, etc.)"
    )

class IdentificationResult(BaseModel):
    """Result of event identification"""
    events: List[IdentifiedEvent] = Field(
        description="Every calendar event identified in the input. Count carefully - missing events is the biggest risk!"
    )
    num_events: int = Field(
        description="Total count of events found. Must match length of events list."
    )
    has_events: bool = Field(
        description="True if any events were found, False if no events at all"
    )

# Create structured output LLM for identification
identification_llm = llm.with_structured_output(IdentificationResult)

# Pydantic models for Agent 2: Semantic Fact Extraction
class RecurrenceInfo(BaseModel):
    """Recurrence pattern information"""
    is_recurring: bool = Field(description="True if this event repeats")
    pattern: Optional[str] = Field(default=None, description="Recurrence pattern: 'daily', 'weekly', 'monthly', 'yearly'")
    days: Optional[List[str]] = Field(default=None, description="Days of week for recurring events: ['Monday', 'Wednesday']")
    frequency: Optional[str] = Field(default=None, description="Frequency modifier: 'every', 'every other', 'twice'")

class ExtractedFacts(BaseModel):
    """Semantic facts extracted from event text"""
    title: str = Field(description="Event title/name extracted from the text")
    date: Optional[str] = Field(default=None, description="Date as written: 'tomorrow', 'Feb 25', 'Friday', 'next week', etc. Do NOT normalize.")
    time: Optional[str] = Field(default=None, description="Start time as written: '2pm', '14:00', '6:30pm', 'afternoon', etc. Do NOT normalize.")
    end_time: Optional[str] = Field(default=None, description="End time if explicitly mentioned: '3pm', '15:00', etc.")
    duration: Optional[str] = Field(default=None, description="Duration if mentioned: '90 minutes', '2 hours', '30 min', etc.")
    location: Optional[str] = Field(default=None, description="Location/venue: 'Conference Room B', 'Zoom', 'Olive Garden', etc.")
    notes: Optional[str] = Field(default=None, description="Additional notes or context: 'bring laptop', 'closed-book', etc.")
    people: Optional[List[str]] = Field(default=None, description="People mentioned: ['Sarah', 'John'], etc.")
    recurrence: RecurrenceInfo = Field(description="Recurrence pattern information")

# Create structured output LLM for fact extraction
fact_extraction_llm = llm.with_structured_output(ExtractedFacts)

# Pydantic models for Agent 3: Calendar Formatting
class CalendarDateTime(BaseModel):
    """Date/time in calendar format"""
    dateTime: str = Field(description="ISO 8601 datetime with timezone: '2026-02-01T14:00:00-05:00'")
    timeZone: str = Field(description="IANA timezone: 'America/New_York'")

class CalendarRecurrence(BaseModel):
    """Recurrence rule in RRULE format"""
    rrule: str = Field(description="RRULE string: 'RRULE:FREQ=WEEKLY;BYDAY=TU' or 'RRULE:FREQ=DAILY'")

class CalendarEvent(BaseModel):
    """Formatted calendar event ready for Google Calendar API"""
    summary: str = Field(description="Event title/name")
    start: CalendarDateTime = Field(description="Start date/time")
    end: CalendarDateTime = Field(description="End date/time")
    location: Optional[str] = Field(default=None, description="Event location")
    description: Optional[str] = Field(default=None, description="Event description/notes")
    recurrence: Optional[List[str]] = Field(default=None, description="List of RRULE strings for recurring events")
    attendees: Optional[List[str]] = Field(default=None, description="List of attendee email addresses or names")

# Create structured output LLM for calendar formatting
calendar_formatting_llm = llm.with_structured_output(CalendarEvent)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({'message': 'Hello from Flask!'})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    response = llm.invoke(message)
    return jsonify({'response': response.content})

@app.route('/api/process', methods=['POST'])
def process_input():
    """
    Unified endpoint for processing all input types.
    Handles: text, audio, images, PDFs, and other text files.

    For text input: Send JSON with {"text": "your text here"}
    For file input: Send multipart/form-data with file upload
    """
    # Check if this is a text-only request
    if request.is_json:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Process text directly - no file needed
        return jsonify({
            'success': True,
            'text': text,
            'input_type': 'text',
            'metadata': {'source': 'direct_text'}
        })

    # File upload processing
    if 'file' not in request.files:
        return jsonify({'error': 'No file or text provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Save file temporarily
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        # Auto-detect file type and process
        result = input_processor_factory.auto_process_file(filepath)

        # Clean up the uploaded file
        os.remove(filepath)

        if not result.success:
            return jsonify({
                'success': False,
                'error': result.error
            }), 400

        # Return appropriate response based on whether vision is needed
        return jsonify({
            'success': True,
            'text': result.text,
            'input_type': result.input_type.value,
            'metadata': result.metadata
        })

    except Exception as e:
        # Clean up on error
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    """
    Legacy endpoint for audio processing.
    Redirects to unified /api/process endpoint.
    """
    return process_input()

@app.route('/api/extract', methods=['POST'])
def extract_events():
    """
    Agent 1: Event Identification
    Identifies all calendar events and extracts relevant text for each.
    Does NOT parse or structure - just identifies and groups by event.
    """
    data = request.get_json()
    raw_input = data.get('input', '')
    metadata = data.get('metadata', {})

    # Check if this requires vision processing (images or PDF pages)
    requires_vision = metadata.get('requires_vision', False)

    # System prompt for event identification
    system_prompt = """You are an event identification specialist. Your ONLY job is to find calendar events and extract all relevant text for each one.

A calendar event is ANYTHING that happens at a specific time:
- Meetings, appointments, classes, lectures
- Deadlines (homework due, applications due, project submissions)
- Exams, quizzes, tests, assessments
- Recurring schedules (weekly meetings, daily standups, office hours)
- Social events, parties, dinners, gatherings
- Reminders with specific times

YOUR TASK:
1. Read the entire input carefully
2. Identify EVERY distinct calendar event (count them!)
3. For each event, extract ALL relevant text chunks
4. Create a uniquely identifying description
5. Mark if event is tentative (maybe, possibly, might, etc.)

CRITICAL RULES FOR raw_text:
- Extract complete sentences/phrases relevant to this event
- Keep text chunks intact - don't break into tiny fragments
- Include ALL context even if spread across multiple sentences
- Text CAN repeat across events if it's relevant to multiple events
- Example: "Team meeting tomorrow at 2pm. Bring your laptop." → ["Team meeting tomorrow at 2pm.", "Bring your laptop."]

CRITICAL RULES FOR description:
- Must UNIQUELY identify this event using ONLY explicit facts
- NOT generic: "Meeting" or "Exam" or "Party"
- MUST BE SPECIFIC: "Team standup meeting with engineering" or "MATH 0180 first midterm exam (90 min, Feb 25)" or "Birthday dinner for Sarah"
- Include key distinguishing details: who, what type, when summary, where
- If multiple similar events, descriptions MUST differentiate them

EVENT SPLITTING:
- "Meeting Monday and Wednesday" = 2 events
- "Homework due every Tuesday" = 1 recurring event
- "Midterms on Feb 25 and April 8" = 2 events

IGNORE completely:
- Course descriptions, prerequisites, grading policies
- Academic integrity statements, textbook information
- General contact info (unless it's office hours with times)
- Promotional content, signatures, unrelated conversation

CONFIDENCE:
- "definite" = will definitely happen
- "tentative" = maybe, possibly, might, perhaps, considering

If you find NO events, return empty list with has_events=false.

Examples:

Input: "Team meeting tomorrow at 2pm in Conference Room B. Don't forget the report!"
Output:
Event 1:
- raw_text: ["Team meeting tomorrow at 2pm in Conference Room B.", "Don't forget the report!"]
- description: "Team meeting (tomorrow 2pm, Conference Room B)"
- confidence: "definite"

Input: "Homework due Tuesdays at 9pm. Midterm on March 15 at 6:30pm."
Output:
Event 1:
- raw_text: ["Homework due Tuesdays at 9pm"]
- description: "Weekly homework deadline (Tuesdays 9pm)"
- confidence: "definite"
Event 2:
- raw_text: ["Midterm on March 15 at 6:30pm"]
- description: "Midterm exam (March 15, 6:30pm)"
- confidence: "definite"

Input: "Maybe grab coffee next week? Or we could do lunch Friday?"
Output:
Event 1:
- raw_text: ["Maybe grab coffee next week?"]
- description: "Coffee meetup (next week)"
- confidence: "tentative"
Event 2:
- raw_text: ["Or we could do lunch Friday?"]
- description: "Lunch meetup (Friday)"
- confidence: "tentative"
"""

    try:
        if requires_vision:
            # Vision API processing for images or PDF pages
            # Build content array with images
            content = []

            # Handle single image (from image file)
            if 'image_data' in metadata:
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": metadata.get('media_type', 'image/jpeg'),
                        "data": metadata['image_data']
                    }
                })

            # Handle multiple pages (from PDF)
            elif 'pages' in metadata:
                for page in metadata['pages']:
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": page.get('media_type', 'image/jpeg'),
                            "data": page['image_data']
                        }
                    })

            # Add the identification instruction
            content.append({
                "type": "text",
                "text": "Identify all calendar events in this image/document following the instructions above. Extract complete text chunks for each event."
            })

            # Create messages for vision API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ]

            # Use structured output with vision
            result = identification_llm.invoke(messages)

        else:
            # Text-only processing
            if not raw_input:
                return jsonify({'error': 'No input provided'}), 400

            identification_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("human", "{input}")
            ])

            # Run identification
            chain = identification_prompt | identification_llm
            result = chain.invoke({"input": raw_input})

        # Convert Pydantic model to dict for JSON response
        return jsonify({
            'has_events': result.has_events,
            'num_events': result.num_events,
            'events': [event.model_dump() for event in result.events]
        })

    except Exception as e:
        return jsonify({'error': f'Event identification failed: {str(e)}'}), 500

@app.route('/api/extract-facts', methods=['POST'])
def extract_facts():
    """
    Agent 2: Semantic Fact Extraction
    Extracts labeled semantic facts from event text.
    Takes raw_text and outputs structured facts (title, date, time, location, etc.)
    """
    data = request.get_json()
    raw_text_list = data.get('raw_text', [])
    description = data.get('description', '')

    if not raw_text_list:
        return jsonify({'error': 'No raw_text provided'}), 400

    # Combine raw_text chunks for processing
    combined_text = ' '.join(raw_text_list)

    # System prompt for fact extraction
    system_prompt = """You are a semantic fact extraction specialist. Your ONLY job is to extract and label facts from event text.

YOUR TASK:
Read the event text and extract these semantic facts:
- **title**: What is this event called? (meeting name, event type, etc.)
- **date**: When does it happen? Extract AS WRITTEN - do NOT normalize!
- **time**: What time does it start? Extract AS WRITTEN - do NOT normalize!
- **end_time**: When does it end? (if explicitly mentioned)
- **duration**: How long is it? (if mentioned: "90 minutes", "2 hours")
- **location**: Where is it? (room, venue, virtual link)
- **notes**: Any additional context? (instructions, reminders, details)
- **people**: Who is involved? (names of people mentioned)
- **recurrence**: Does this repeat? (daily, weekly, specific days)

CRITICAL RULES:
1. Extract facts EXACTLY as written - NO normalization or conversion
   - "tomorrow" stays "tomorrow" (not a date)
   - "2pm" stays "2pm" (not "14:00")
   - "Feb 25" stays "Feb 25" (not "2026-02-25")

2. Only extract facts that are EXPLICITLY stated
   - If no location mentioned, location = null
   - If no duration mentioned, duration = null
   - Do NOT infer or assume

3. For recurrence:
   - "every Tuesday" → is_recurring=true, pattern="weekly", days=["Tuesday"]
   - "Tuesdays" → is_recurring=true, pattern="weekly", days=["Tuesday"]
   - "daily standup" → is_recurring=true, pattern="daily"
   - "Monday and Wednesday" → is_recurring=true, pattern="weekly", days=["Monday", "Wednesday"]
   - "March 15" → is_recurring=false

4. For title:
   - Extract the core event name
   - Keep it concise but descriptive
   - "Team meeting with Sarah" → title="Team meeting"
   - "MATH 0180 midterm exam" → title="MATH 0180 midterm exam"

Examples:

Input: ["Team meeting tomorrow at 2pm in Conference Room B.", "Bring the report."]
Output:
title="Team meeting", date="tomorrow", time="2pm", location="Conference Room B", notes="bring the report", is_recurring=false

Input: ["Homework due Tuesdays at 9pm ET"]
Output:
title="Homework", date="Tuesdays", time="9pm ET", notes="due", is_recurring=true, pattern="weekly", days=["Tuesday"]

Input: ["The 90-minute midterms will be held on Wednesday evenings February 25 from at 6:30pm", "closed-book and in-person"]
Output:
title="Midterm exam", date="February 25", time="6:30pm", duration="90-minute", location="in-person", notes="closed-book", is_recurring=false

Input: ["Weekly recitation session on Thursdays"]
Output:
title="Recitation session", date="Thursdays", is_recurring=true, pattern="weekly", days=["Thursday"]
"""

    try:
        fact_extraction_prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Event description: {description}\n\nEvent text: {text}\n\nExtract all semantic facts from this event.")
        ])

        # Run fact extraction
        chain = fact_extraction_prompt | fact_extraction_llm
        result = chain.invoke({
            "description": description,
            "text": combined_text
        })

        # Convert Pydantic model to dict for JSON response
        return jsonify(result.model_dump())

    except Exception as e:
        return jsonify({'error': f'Fact extraction failed: {str(e)}'}), 500

@app.route('/api/format-calendar', methods=['POST'])
def format_calendar():
    """
    Agent 3: Calendar Formatting
    Takes extracted facts and normalizes them into Google Calendar API format.
    Handles date/time normalization, timezone, recurrence rules, and end time calculation.
    """
    data = request.get_json()
    facts = data.get('facts', {})

    if not facts:
        return jsonify({'error': 'No facts provided'}), 400

    # Get current date context for relative date normalization
    from datetime import datetime
    current_date = datetime.now().strftime('%Y-%m-%d')
    current_time = datetime.now().strftime('%H:%M:%S')

    # System prompt for calendar formatting
    system_prompt = f"""You are a calendar formatting specialist. Your job is to normalize extracted facts into Google Calendar API format.

CURRENT CONTEXT:
- Today's date: {current_date}
- Current time: {current_time}
- Default timezone: America/New_York (EST/EDT)

YOUR TASK:
Take the extracted event facts and produce a properly formatted calendar event with:

1. **summary**: The event title (from facts.title)

2. **start**: Normalized start date/time
   - Convert relative dates to absolute dates:
     - "tomorrow" → next day's date
     - "Friday" → next Friday's date
     - "Feb 25" → 2026-02-25
     - "Tuesdays" → next Tuesday's date (for recurring events)
   - Convert times to 24-hour format with seconds:
     - "2pm" → "14:00:00"
     - "6:30pm" → "18:30:00"
     - "9pm ET" → "21:00:00"
   - Combine into ISO 8601 format: "2026-02-01T14:00:00-05:00"
   - Always include timezone offset (-05:00 for EST, -04:00 for EDT)

3. **end**: Normalized end date/time
   - If end_time provided, use it
   - If duration provided, calculate from start + duration
   - Otherwise, default to start + 1 hour
   - Same format as start

4. **location**: Location string (from facts.location, if provided)

5. **description**: Additional notes (from facts.notes, if provided)

6. **recurrence**: RRULE format for recurring events
   - If facts.recurrence.is_recurring = true, generate RRULE
   - Weekly pattern: "RRULE:FREQ=WEEKLY;BYDAY=TU,TH"
   - Daily pattern: "RRULE:FREQ=DAILY"
   - Days mapping: Monday=MO, Tuesday=TU, Wednesday=WE, Thursday=TH, Friday=FR, Saturday=SA, Sunday=SU
   - Return as list: ["RRULE:FREQ=WEEKLY;BYDAY=TU"]
   - If not recurring, recurrence = null

7. **attendees**: List of people mentioned (from facts.people, if provided)

CRITICAL RULES:
1. Always use ISO 8601 format with timezone: "2026-02-25T18:30:00-05:00"
2. Assume Eastern Time (America/New_York) unless specified otherwise
3. For recurring events, use the next occurrence of the specified day
4. Calculate end time intelligently based on available info
5. Keep all other fields (location, description, attendees) as-is

Examples:

Input facts:
title="Team meeting", date="tomorrow", time="2pm", location="Conference Room B", notes="bring laptop"

Output:
summary="Team meeting"
start: dateTime="2026-02-01T14:00:00-05:00", timeZone="America/New_York"
end: dateTime="2026-02-01T15:00:00-05:00", timeZone="America/New_York"
location="Conference Room B"
description="bring laptop"
recurrence=null

Input facts:
title="Homework", date="Tuesdays", time="9pm ET", is_recurring=true, pattern="weekly", days=["Tuesday"]

Output:
summary="Homework"
start: dateTime="2026-02-03T21:00:00-05:00", timeZone="America/New_York"
end: dateTime="2026-02-03T22:00:00-05:00", timeZone="America/New_York"
recurrence=["RRULE:FREQ=WEEKLY;BYDAY=TU"]

Input facts:
title="Midterm exam", date="February 25", time="6:30pm", duration="90 minutes", location="in-person", notes="closed-book"

Output:
summary="Midterm exam"
start: dateTime="2026-02-25T18:30:00-05:00", timeZone="America/New_York"
end: dateTime="2026-02-25T20:00:00-05:00", timeZone="America/New_York"
location="in-person"
description="closed-book"
recurrence=null
"""

    try:
        calendar_formatting_prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Event facts: {facts}\n\nFormat this event for Google Calendar API.")
        ])

        # Run calendar formatting
        chain = calendar_formatting_prompt | calendar_formatting_llm
        result = chain.invoke({"facts": str(facts)})

        # Convert Pydantic model to dict for JSON response
        return jsonify(result.model_dump())

    except Exception as e:
        return jsonify({'error': f'Calendar formatting failed: {str(e)}'}), 500

# ============================================================================
# Google Calendar API Endpoints
# ============================================================================

@app.route('/api/oauth/authorize', methods=['GET'])
def oauth_authorize():
    """
    Start OAuth 2.0 authorization flow.
    Redirects user to Google's consent screen.
    """
    try:
        authorization_url = calendar_service.get_authorization_url()
        return redirect(authorization_url)
    except FileNotFoundError as e:
        return jsonify({
            'error': str(e),
            'instructions': 'Please follow GOOGLE_CALENDAR_SETUP.md to configure OAuth credentials'
        }), 400
    except Exception as e:
        return jsonify({'error': f'Authorization failed: {str(e)}'}), 500

@app.route('/api/oauth/callback', methods=['GET'])
def oauth_callback():
    """
    Handle OAuth 2.0 callback from Google.
    Exchanges authorization code for access token.
    """
    try:
        # Get the full callback URL with authorization code
        authorization_response = request.url

        # Exchange code for token
        success = calendar_service.handle_oauth_callback(authorization_response)

        if success:
            return jsonify({
                'success': True,
                'message': 'Successfully authenticated with Google Calendar!',
                'authenticated': True
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to authenticate with Google Calendar'
            }), 400

    except Exception as e:
        return jsonify({'error': f'OAuth callback failed: {str(e)}'}), 500

@app.route('/api/oauth/status', methods=['GET'])
def oauth_status():
    """
    Check OAuth authentication status.
    Returns whether user is authenticated with Google Calendar.
    """
    try:
        is_authenticated = calendar_service.is_authenticated()
        return jsonify({
            'authenticated': is_authenticated,
            'message': 'Authenticated with Google Calendar' if is_authenticated else 'Not authenticated'
        })
    except Exception as e:
        return jsonify({'error': f'Status check failed: {str(e)}'}), 500

@app.route('/api/calendar/create-event', methods=['POST'])
def create_calendar_event():
    """
    Create a new event in Google Calendar.

    Expects JSON body with event data in Google Calendar API format:
    {
        "summary": "Event title",
        "start": {
            "dateTime": "2026-02-01T14:00:00-05:00",
            "timeZone": "America/New_York"
        },
        "end": {
            "dateTime": "2026-02-01T15:00:00-05:00",
            "timeZone": "America/New_York"
        },
        "location": "Conference Room",
        "description": "Event description",
        "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
        "attendees": ["email@example.com"]
    }

    Returns the created event data from Google Calendar.
    """
    try:
        # Check authentication status
        if not calendar_service.is_authenticated():
            return jsonify({
                'error': 'Not authenticated with Google Calendar',
                'authenticated': False,
                'authorization_url': '/api/oauth/authorize'
            }), 401

        # Get event data from request
        event_data = request.get_json()

        if not event_data:
            return jsonify({'error': 'No event data provided'}), 400

        # Validate required fields
        if 'summary' not in event_data:
            return jsonify({'error': 'Event summary (title) is required'}), 400

        if 'start' not in event_data or 'end' not in event_data:
            return jsonify({'error': 'Event start and end times are required'}), 400

        # Format attendees if provided (convert list of strings to list of dicts)
        if 'attendees' in event_data and event_data['attendees']:
            attendees_list = event_data['attendees']
            if isinstance(attendees_list, list) and len(attendees_list) > 0:
                # Convert strings to email dict format if needed
                if isinstance(attendees_list[0], str):
                    event_data['attendees'] = [{'email': email} for email in attendees_list]

        # Create event in Google Calendar
        created_event = calendar_service.create_event(event_data)

        if created_event:
            return jsonify({
                'success': True,
                'message': 'Event created successfully',
                'event': {
                    'id': created_event.get('id'),
                    'summary': created_event.get('summary'),
                    'start': created_event.get('start'),
                    'end': created_event.get('end'),
                    'htmlLink': created_event.get('htmlLink'),
                    'location': created_event.get('location'),
                    'description': created_event.get('description')
                }
            })
        else:
            return jsonify({'error': 'Failed to create event'}), 500

    except Exception as e:
        return jsonify({'error': f'Event creation failed: {str(e)}'}), 500

@app.route('/api/calendar/check-conflicts', methods=['POST'])
def check_calendar_conflicts():
    """
    Check for scheduling conflicts using Google Calendar's Freebusy API.

    Expects JSON body:
    {
        "start": "2026-02-01T14:00:00-05:00",
        "end": "2026-02-01T15:00:00-05:00"
    }

    Returns list of conflicting busy periods.
    """
    try:
        # Check authentication status
        if not calendar_service.is_authenticated():
            return jsonify({
                'error': 'Not authenticated with Google Calendar',
                'authenticated': False,
                'authorization_url': '/api/oauth/authorize'
            }), 401

        # Get time range from request
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        start_time = data.get('start')
        end_time = data.get('end')

        if not start_time or not end_time:
            return jsonify({'error': 'Start and end times are required'}), 400

        # Check for conflicts
        busy_periods = calendar_service.check_conflicts(start_time, end_time)

        has_conflicts = len(busy_periods) > 0

        return jsonify({
            'has_conflicts': has_conflicts,
            'conflicts': busy_periods,
            'message': f'Found {len(busy_periods)} conflict(s)' if has_conflicts else 'No conflicts found'
        })

    except Exception as e:
        return jsonify({'error': f'Conflict check failed: {str(e)}'}), 500

@app.route('/api/calendar/list-events', methods=['GET'])
def list_calendar_events():
    """
    List upcoming events from Google Calendar.

    Query parameters:
    - max_results: Maximum number of events to return (default: 10)
    - time_min: Start time in ISO format (default: current time)
    """
    try:
        # Check authentication status
        if not calendar_service.is_authenticated():
            return jsonify({
                'error': 'Not authenticated with Google Calendar',
                'authenticated': False,
                'authorization_url': '/api/oauth/authorize'
            }), 401

        # Get query parameters
        max_results = request.args.get('max_results', 10, type=int)
        time_min = request.args.get('time_min', None)

        # List events
        events = calendar_service.list_events(max_results=max_results, time_min=time_min)

        return jsonify({
            'success': True,
            'count': len(events),
            'events': events
        })

    except Exception as e:
        return jsonify({'error': f'Failed to list events: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
