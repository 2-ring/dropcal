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
    Extraction Agent - Step 1 of the pipeline
    Takes messy input and extracts ONLY calendar event information.
    Handles both text and vision inputs (images, PDFs).
    """
    data = request.get_json()
    raw_input = data.get('input', '')
    metadata = data.get('metadata', {})

    # Check if this requires vision processing (images or PDF pages)
    requires_vision = metadata.get('requires_vision', False)

    # System prompt for extraction
    system_prompt = """You are an extraction agent. Your ONLY job is to find calendar event information in messy text or images.

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

Extract multiple events if multiple are mentioned."""

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

            # Add the extraction instruction
            content.append({
                "type": "text",
                "text": "Extract all calendar event information from this image/document following the instructions above."
            })

            # Create messages for vision API
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ]

            # Use structured output with vision
            result = extraction_llm.invoke(messages)

        else:
            # Text-only processing (original implementation)
            if not raw_input:
                return jsonify({'error': 'No input provided'}), 400

            extraction_prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
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

    except Exception as e:
        return jsonify({'error': f'Extraction failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
