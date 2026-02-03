"""
Session processor for running AI pipeline on sessions.
Connects the existing LangChain agents to the session workflow.
"""

from typing import Optional
import os
from database.models import Session as DBSession
from processors.factory import InputProcessorFactory, InputType
from extraction.agents.context import ContextUnderstandingAgent
from extraction.agents.identification import EventIdentificationAgent
from extraction.agents.facts import FactExtractionAgent
from extraction.agents.formatting import CalendarFormattingAgent


class SessionProcessor:
    """Processes sessions through the full AI pipeline."""

    def __init__(self, llm, input_processor_factory: InputProcessorFactory):
        """
        Initialize the session processor with agents.

        Args:
            llm: LangChain LLM instance for agents
            input_processor_factory: Factory for processing files
        """
        self.llm = llm
        self.input_processor_factory = input_processor_factory

        # Initialize all agents
        self.agent_0_context = ContextUnderstandingAgent(llm)
        self.agent_1_identification = EventIdentificationAgent(llm)
        self.agent_2_extraction = FactExtractionAgent(llm)
        self.agent_3_formatting = CalendarFormattingAgent(llm)

    def process_text_session(self, session_id: str, text: str) -> None:
        """
        Process a text session through the full AI pipeline.

        Args:
            session_id: ID of the session to process
            text: Input text to process
        """
        try:
            # Update status to processing
            DBSession.update_status(session_id, 'processing')

            # Step 1: Context Understanding
            context_result = self.agent_0_context.execute(text, {}, requires_vision=False)

            # Step 2: Event Identification
            identification_result = self.agent_1_identification.execute(
                text,
                {},
                context_result.model_dump(),
                requires_vision=False
            )

            # Check if any events were found
            if not identification_result.has_events:
                # No events found - mark as processed with empty events
                DBSession.update_processed_events(session_id, [])
                return

            # Save extracted events
            extracted_events = [
                {
                    'raw_text': event.raw_text,
                    'description': event.description
                }
                for event in identification_result.events
            ]
            DBSession.update_extracted_events(session_id, extracted_events)

            # Step 3: Process each event (Fact Extraction + Formatting)
            processed_events = []

            for event in identification_result.events:
                # Agent 2: Fact Extraction
                facts = self.agent_2_extraction.execute(
                    event.raw_text,
                    event.description
                )

                # Agent 3: Calendar Formatting
                calendar_event = self.agent_3_formatting.execute(facts)
                processed_events.append(calendar_event.model_dump())

            # Save processed events and mark as complete
            DBSession.update_processed_events(session_id, processed_events)

        except Exception as e:
            # Mark session as error
            error_message = str(e)
            print(f"Error processing session {session_id}: {error_message}")
            DBSession.mark_error(session_id, error_message)

    def process_file_session(
        self,
        session_id: str,
        file_path: str,
        file_type: str
    ) -> None:
        """
        Process a file session through the full AI pipeline.

        Args:
            session_id: ID of the session to process
            file_path: Path to the uploaded file (in Supabase storage)
            file_type: Type of file ('image', 'audio', 'pdf')
        """
        try:
            # Update status to processing
            DBSession.update_status(session_id, 'processing')

            # For files stored in Supabase, we need to download them first
            # For now, if it's a Supabase URL, we'll handle it as-is
            # The processor can handle URLs directly for images

            # Determine if vision is needed
            requires_vision = file_type in ['image', 'pdf']

            # For audio files, we need the actual file path
            # For now, we'll extract text from the file path/URL
            if file_type == 'audio':
                # Audio files need to be processed to extract text
                # This is a simplified version - in production, download from Supabase first
                text = f"[Audio file content from {file_path}]"
                metadata = {'source': 'audio', 'file_path': file_path}
            elif file_type == 'image':
                # Images can be processed with vision
                text = f"[Image file at {file_path}]"
                metadata = {'source': 'image', 'file_path': file_path, 'requires_vision': True}
            else:
                # Default text extraction
                text = file_path
                metadata = {'source': file_type, 'file_path': file_path}

            # Now process like text
            # Step 1: Context Understanding
            context_result = self.agent_0_context.execute(text, metadata, requires_vision)

            # Step 2: Event Identification
            identification_result = self.agent_1_identification.execute(
                text,
                metadata,
                context_result.model_dump(),
                requires_vision
            )

            # Check if any events were found
            if not identification_result.has_events:
                # No events found
                DBSession.update_processed_events(session_id, [])
                return

            # Save extracted events
            extracted_events = [
                {
                    'raw_text': event.raw_text,
                    'description': event.description
                }
                for event in identification_result.events
            ]
            DBSession.update_extracted_events(session_id, extracted_events)

            # Step 3: Process each event
            processed_events = []

            for event in identification_result.events:
                # Agent 2: Fact Extraction
                facts = self.agent_2_extraction.execute(
                    event.raw_text,
                    event.description
                )

                # Agent 3: Calendar Formatting
                calendar_event = self.agent_3_formatting.execute(facts)
                processed_events.append(calendar_event.model_dump())

            # Save processed events and mark as complete
            DBSession.update_processed_events(session_id, processed_events)

        except Exception as e:
            # Mark session as error
            error_message = str(e)
            print(f"Error processing file session {session_id}: {error_message}")
            DBSession.mark_error(session_id, error_message)
