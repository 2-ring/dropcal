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

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB max file size

llm = ChatAnthropic(model="claude-sonnet-4-5-20250929", api_key=os.getenv("ANTHROPIC_API_KEY"))

# Initialize input processor
input_processor_factory = InputProcessorFactory()
audio_processor = AudioProcessor(api_key=os.getenv('OPENAI_API_KEY'))
input_processor_factory.register_processor(InputType.AUDIO, audio_processor)

# Pydantic models for structured extraction
class ExtractedEvent(BaseModel):
    """A single calendar event extracted from text"""
    title: str = Field(description="Event title or name")
    raw_date: Optional[str] = Field(default=None, description="Date information as written in the text (e.g., 'tomorrow', 'Jan 15', '1/15')")
    raw_time: Optional[str] = Field(default=None, description="Time information as written in the text (e.g., '2pm', '14:00', 'afternoon')")
    raw_duration: Optional[str] = Field(default=None, description="Duration information if mentioned (e.g., '2 hours', '30 min')")
    location: Optional[str] = Field(default=None, description="Location or venue if mentioned")
    description: Optional[str] = Field(default=None, description="Additional details or notes about the event")

class ExtractionResult(BaseModel):
    """Result of extraction with all found events"""
    events: List[ExtractedEvent] = Field(description="List of calendar events found in the input")
    had_event_info: bool = Field(description="Whether any event-related information was found")

# Create structured output LLM for extraction
extraction_llm = llm.with_structured_output(ExtractionResult)

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

@app.route('/api/process-audio', methods=['POST'])
def process_audio():
    """
    Process audio file (voice note) and extract text.
    Accepts file upload and returns transcribed text.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file:
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            # Process the audio file
            result = input_processor_factory.process_file(filepath, InputType.AUDIO)

            # Clean up the uploaded file
            os.remove(filepath)

            if result.success:
                return jsonify({
                    'success': True,
                    'text': result.text,
                    'metadata': result.metadata
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.error
                }), 400

        except Exception as e:
            # Clean up on error
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/extract', methods=['POST'])
def extract_events():
    """
    Extraction Agent - Step 1 of the pipeline
    Takes messy input and extracts ONLY calendar event information.
    Filters out all irrelevant content.
    """
    data = request.get_json()
    raw_input = data.get('input', '')

    if not raw_input:
        return jsonify({'error': 'No input provided'}), 400

    # Extraction prompt - focused on filtering and extracting
    extraction_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an extraction agent. Your ONLY job is to find calendar event information in messy text.

EXTRACT these things if present:
- Event names/titles
- Dates (in ANY format: "tomorrow", "Jan 15", "1/15/25", "next Monday", etc.)
- Times (in ANY format: "2pm", "14:00", "afternoon", "2:30 PM", etc.)
- Durations (if mentioned: "2 hours", "30 minutes", etc.)
- Locations (venues, addresses, room numbers)
- Descriptions (relevant event details)

IGNORE everything else:
- Greetings, signatures, unrelated text
- Email headers, forward markers (FW:, RE:)
- Promotional content not related to events
- Random URLs, social media handles
- General conversation that isn't about scheduling

If you find NO event information at all, set had_event_info to false with an empty events list.
If you find ANY event information (even partial), extract it exactly as written - don't clean or normalize yet.

Extract multiple events if multiple are mentioned."""),
        ("human", "{input}")
    ])

    # Run extraction
    chain = extraction_prompt | extraction_llm
    result = chain.invoke({"input": raw_input})

    # Convert Pydantic model to dict for JSON response
    return jsonify({
        'had_event_info': result.had_event_info,
        'events': [event.model_dump() for event in result.events],
        'num_events_found': len(result.events)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
