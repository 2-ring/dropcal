"""
Logging utilities for DropCal agent pipeline.
Provides structured logging for all agent executions, inputs, outputs, and timing.
"""
import logging
import json
import time
import functools
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional


# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Configure logging format
LOG_FORMAT = '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def setup_logger(name: str, log_file: Optional[str] = None, level=logging.INFO) -> logging.Logger:
    """
    Set up a logger with both file and console handlers.

    Args:
        name: Logger name (typically agent or module name)
        log_file: Optional specific log file name. If None, uses 'dropcal.log'
        level: Logging level (default INFO)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid duplicate handlers if logger already exists
    if logger.handlers:
        return logger

    # File handler - logs everything to file
    if log_file is None:
        log_file = "dropcal.log"
    file_handler = logging.FileHandler(LOGS_DIR / log_file)
    file_handler.setLevel(logging.DEBUG)  # Log everything to file
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    # Console handler - logs INFO and above to console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# Main application logger
app_logger = setup_logger("DropCal")

# Agent-specific loggers
agent_logger = setup_logger("Agent", "agents.log")
processor_logger = setup_logger("InputProcessor", "processors.log")


def log_agent_execution(agent_name: str, logger: Optional[logging.Logger] = None):
    """
    Decorator to log agent execution with inputs, outputs, and timing.

    Usage:
        @log_agent_execution("EventIdentification")
        def identify_events(input_data):
            # agent logic
            return result

    Args:
        agent_name: Name of the agent being executed
        logger: Optional logger instance. If None, uses default agent_logger
    """
    if logger is None:
        logger = agent_logger

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Generate unique execution ID
            exec_id = f"{agent_name}_{int(time.time() * 1000)}"

            # Log start
            logger.info(f"[{exec_id}] Starting agent: {agent_name}")
            logger.debug(f"[{exec_id}] Input args: {_safe_serialize(args)}")
            logger.debug(f"[{exec_id}] Input kwargs: {_safe_serialize(kwargs)}")

            start_time = time.time()

            try:
                # Execute the agent function
                result = func(*args, **kwargs)

                # Log success
                execution_time = time.time() - start_time
                logger.info(f"[{exec_id}] Agent {agent_name} completed successfully in {execution_time:.3f}s")
                logger.debug(f"[{exec_id}] Output: {_safe_serialize(result)}")

                # Write detailed JSON log for this execution
                _write_detailed_log(exec_id, agent_name, args, kwargs, result, execution_time, success=True)

                return result

            except Exception as e:
                # Log failure
                execution_time = time.time() - start_time
                logger.error(f"[{exec_id}] Agent {agent_name} failed after {execution_time:.3f}s: {str(e)}")
                logger.exception(f"[{exec_id}] Exception details:")

                # Write detailed JSON log for this execution
                _write_detailed_log(exec_id, agent_name, args, kwargs, None, execution_time,
                                   success=False, error=str(e))

                raise

        return wrapper
    return decorator


def log_processor_execution(processor_name: str):
    """
    Decorator specifically for input processors.
    Similar to log_agent_execution but uses processor_logger.
    """
    return log_agent_execution(processor_name, logger=processor_logger)


def _safe_serialize(obj: Any, max_length: int = 1000) -> str:
    """
    Safely serialize an object to string for logging.
    Handles Pydantic models, dicts, lists, and truncates long outputs.

    Args:
        obj: Object to serialize
        max_length: Maximum length of serialized string

    Returns:
        Serialized string representation
    """
    try:
        # Handle Pydantic models
        if hasattr(obj, 'model_dump'):
            serialized = json.dumps(obj.model_dump(), indent=2)
        # Handle dicts and lists
        elif isinstance(obj, (dict, list)):
            serialized = json.dumps(obj, indent=2, default=str)
        # Handle tuples (like args)
        elif isinstance(obj, tuple):
            serialized = json.dumps([_safe_serialize(item, max_length) for item in obj], default=str)
        else:
            serialized = str(obj)

        # Truncate if too long
        if len(serialized) > max_length:
            return serialized[:max_length] + f"... (truncated, total length: {len(serialized)})"

        return serialized
    except Exception as e:
        return f"<Unable to serialize: {str(e)}>"


def _write_detailed_log(
    exec_id: str,
    agent_name: str,
    args: tuple,
    kwargs: dict,
    result: Any,
    execution_time: float,
    success: bool,
    error: Optional[str] = None
):
    """
    Write detailed log for agent execution grouped by agent name.
    Appends to agent-specific log file with structured formatting.

    Args:
        exec_id: Unique execution ID
        agent_name: Name of the agent
        args: Positional arguments
        kwargs: Keyword arguments
        result: Agent output (None if failed)
        execution_time: Execution time in seconds
        success: Whether execution succeeded
        error: Error message if failed
    """
    try:
        # Create agent-specific log file
        agent_log_file = LOGS_DIR / f"{agent_name}.log"

        # Prepare log entry with structured formatting
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        separator = "=" * 80

        with open(agent_log_file, 'a') as f:
            f.write(f"\n{separator}\n")
            f.write(f"EXECUTION ID: {exec_id}\n")
            f.write(f"TIMESTAMP: {timestamp}\n")
            f.write(f"STATUS: {'SUCCESS' if success else 'FAILED'}\n")
            f.write(f"EXECUTION TIME: {execution_time:.3f}s\n")
            f.write(f"{separator}\n\n")

            # Write input section
            f.write("INPUT:\n")
            f.write("-" * 80 + "\n")
            if args:
                f.write(f"Args: {_safe_serialize(args, max_length=5000)}\n")
            if kwargs:
                f.write(f"Kwargs: {_safe_serialize(kwargs, max_length=5000)}\n")
            f.write("\n")

            # Write output section
            if success:
                f.write("OUTPUT:\n")
                f.write("-" * 80 + "\n")
                f.write(f"{_safe_serialize(result, max_length=10000)}\n")
            else:
                f.write("ERROR:\n")
                f.write("-" * 80 + "\n")
                f.write(f"{error}\n")

            f.write(f"\n{separator}\n\n")

        agent_logger.debug(f"[{exec_id}] Detailed log appended to {agent_log_file}")

    except Exception as e:
        agent_logger.error(f"Failed to write detailed log for {exec_id}: {str(e)}")


def log_info(message: str, logger_name: str = "DropCal"):
    """Helper function to log info messages."""
    logger = logging.getLogger(logger_name)
    logger.info(message)


def log_error(message: str, logger_name: str = "DropCal"):
    """Helper function to log error messages."""
    logger = logging.getLogger(logger_name)
    logger.error(message)


def log_debug(message: str, logger_name: str = "DropCal"):
    """Helper function to log debug messages."""
    logger = logging.getLogger(logger_name)
    logger.debug(message)


# Initialize logging on module import
app_logger.info("=" * 80)
app_logger.info("DropCal Logging System Initialized")
app_logger.info(f"Log directory: {LOGS_DIR}")
app_logger.info("=" * 80)
