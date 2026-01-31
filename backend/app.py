from flask import Flask, jsonify, request
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

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB max file size

llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=os.getenv("ANTHROPIC_API_KEY"))

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
