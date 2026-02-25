"""
Configuration Module
Centralized AI model configuration for DropCal

Usage:
    from config.models import create_llm, get_assigned_model, print_model_config
"""

from .models import (
    create_llm,
    get_assigned_model,
    get_model_specs,
    get_extraction_threshold,
    get_audio_provider,
    get_audio_api_key,
    get_audio_model_name,
    print_model_config,
    MODELS,
    CONFIG,
)

from .processing import ProcessingConfig

__all__ = [
    'create_llm',
    'get_assigned_model',
    'get_model_specs',
    'get_extraction_threshold',
    'get_audio_provider',
    'get_audio_api_key',
    'get_audio_model_name',
    'print_model_config',
    'MODELS',
    'CONFIG',
    'ProcessingConfig',
]
