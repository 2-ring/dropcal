"""
Base Agent Interface for DropCal Pipeline
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pathlib import Path
import inspect


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the pipeline.
    Each agent has a single responsibility and clean I/O interface.
    """

    def __init__(self, name: str):
        """
        Initialize base agent.

        Args:
            name: Agent name for logging and identification
        """
        self.name = name

    @abstractmethod
    def execute(self, *args, **kwargs) -> Any:
        """
        Execute the agent's main logic.
        Each agent implements its specific processing.

        Returns:
            Agent-specific output (usually a Pydantic model)
        """
        pass

    def load_prompt(self, prompt_name: str) -> str:
        """
        Load system prompt from prompts directory relative to the calling subclass.

        Args:
            prompt_name: Name of prompt file (e.g., 'context.txt')

        Returns:
            Prompt text content
        """
        # Get the file path of the calling subclass (not this base class)
        subclass_file = Path(inspect.getfile(self.__class__))
        prompt_path = subclass_file.parent / "prompts" / prompt_name

        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

        with open(prompt_path, 'r') as f:
            return f.read()

    def format_prompt(self, template: str, **kwargs) -> str:
        """
        Format a prompt template with provided variables.

        Args:
            template: Prompt template string with {variable} placeholders
            **kwargs: Variables to substitute into template

        Returns:
            Formatted prompt string
        """
        return template.format(**kwargs)
