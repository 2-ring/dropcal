"""
Model Configuration
All AI model definitions and stage assignments in one place.
"""

import os
from typing import Dict, Any
from dataclasses import dataclass, field

# ============================================================================
# MODEL CATALOG
# ============================================================================

MODELS: Dict[str, Dict[str, Any]] = {

    # ── LLM Models ───────────────────────────────────────────────────────

    'grok-4-1-fast-non-reasoning': {
        'provider': 'xai',
        'api_key_env': 'XAI_API_KEY',
        'base_url': 'https://api.x.ai/v1',
        'cost_per_m': {'input': 0.20, 'output': 0.50},
    },
    'grok-4-1-fast-reasoning': {
        'provider': 'xai',
        'api_key_env': 'XAI_API_KEY',
        'base_url': 'https://api.x.ai/v1',
        'cost_per_m': {'input': 0.20, 'output': 0.50},
    },
    'gpt-5.2': {
        'provider': 'openai',
        'api_key_env': 'OPENAI_API_KEY',
        'reasoning': {'effort': 'low'},
        'cost_per_m': {'input': 2.00, 'output': 8.00},
    },
    'claude-sonnet-4-5-20250929': {
        'provider': 'anthropic',
        'api_key_env': 'ANTHROPIC_API_KEY',
        'cost_per_m': {'input': 3.00, 'output': 15.00},
    },

    # ── Transcription Models ─────────────────────────────────────────────

    'nova-2': {
        'provider': 'deepgram',
        'api_key_env': 'DEEPGRAM_API_KEY',
        'max_file_size_mb': None,
    },
    'whisper-1': {
        'provider': 'openai',
        'api_key_env': 'OPENAI_API_KEY',
        'max_file_size_mb': 25,
    },
    'whisper-large-v3': {
        'provider': 'xai',
        'api_key_env': 'XAI_API_KEY',
        'base_url': 'https://api.x.ai/v1',
        'max_file_size_mb': 25,
    },
    'vapi-transcription': {
        'provider': 'vapi',
        'api_key_env': 'VAPI_PRIVATE_KEY',
        'public_key_env': 'VAPI_PUBLIC_KEY',
        'max_file_size_mb': None,
    },
}

# ============================================================================
# STAGE ASSIGNMENTS
# ============================================================================

@dataclass
class ExtractionConfig:
    text_simple: str = 'grok-4-1-fast-non-reasoning'
    text_complex: str = 'grok-4-1-fast-reasoning'
    vision: str = 'gpt-5.2'
    complexity_threshold: int = 500  # chars — below this uses text_simple


@dataclass
class PersonalizationConfig:
    personalize: str = 'grok-4-1-fast-non-reasoning'
    pattern_discovery: str = 'grok-4-1-fast-non-reasoning'


@dataclass
class ModificationConfig:
    modify: str = 'grok-4-1-fast-reasoning'


@dataclass
class TranscriptionConfig:
    audio: str = 'whisper-1'


@dataclass
class ModelConfig:
    extraction: ExtractionConfig = field(default_factory=ExtractionConfig)
    personalization: PersonalizationConfig = field(default_factory=PersonalizationConfig)
    modification: ModificationConfig = field(default_factory=ModificationConfig)
    transcription: TranscriptionConfig = field(default_factory=TranscriptionConfig)


CONFIG = ModelConfig()

# ============================================================================
# LLM HELPERS
# ============================================================================

def get_assigned_model(path: str) -> str:
    """
    Get the model name assigned to a config path.
    e.g. 'extraction.vision' → 'gpt-5.2'
    """
    obj = CONFIG
    for part in path.split('.'):
        obj = getattr(obj, part)
    return obj


def get_model_specs(model_name: str) -> Dict[str, Any]:
    """Get full specs for a model from the catalog."""
    return MODELS[model_name]


def get_extraction_threshold() -> int:
    """Get the character threshold for simple vs complex extraction."""
    return CONFIG.extraction.complexity_threshold


def create_llm(path: str):
    """
    Create a LangChain LLM for a config path.

    Examples:
        create_llm('extraction.text_simple')
        create_llm('extraction.vision')
        create_llm('personalization.personalize')
        create_llm('modification.modify')
    """
    model_name = get_assigned_model(path)
    specs = get_model_specs(model_name)
    return _create_llm(model_name, specs)


def _create_llm(model_name: str, specs: Dict[str, Any]):
    """Create a LangChain LLM instance from model name + specs."""
    api_key = os.getenv(specs['api_key_env'])
    if not api_key:
        raise ValueError(f"API key not found: {specs['api_key_env']}")

    provider = specs['provider']

    if provider == 'anthropic':
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_name, api_key=api_key)
    elif provider in ('xai', 'openai'):
        from langchain_openai import ChatOpenAI
        kwargs = dict(
            model=model_name,
            api_key=api_key,
            base_url=specs.get('base_url'),
        )
        if specs.get('reasoning'):
            kwargs['reasoning'] = specs['reasoning']
        return ChatOpenAI(**kwargs)
    else:
        raise ValueError(f"Cannot create LLM for provider: {provider}")


# ============================================================================
# AUDIO HELPERS
# ============================================================================

# Audio processor uses these provider names for SDK routing
_AUDIO_PROVIDER_ALIASES = {'xai': 'grok'}


def get_audio_provider() -> str:
    """Get the audio provider name (for SDK routing)."""
    env_override = os.getenv('AUDIO_PROVIDER')
    if env_override:
        return env_override
    model_name = CONFIG.transcription.audio
    raw_provider = MODELS[model_name]['provider']
    return _AUDIO_PROVIDER_ALIASES.get(raw_provider, raw_provider)


def get_audio_api_key(provider: str = None) -> str:
    """Get API key for audio transcription."""
    model_name = CONFIG.transcription.audio
    specs = MODELS[model_name]
    key = os.getenv(specs['api_key_env'])
    if not key:
        raise ValueError(f"API key not found: {specs['api_key_env']}")
    return key


def get_audio_model_name(provider: str = None) -> str:
    """Get the audio transcription model name."""
    return CONFIG.transcription.audio


# ============================================================================
# PRINT CONFIG
# ============================================================================

def print_model_config():
    """Print full model configuration on startup."""
    print("\n" + "="*70)
    print("MODEL CONFIGURATION")
    print("="*70)

    sections = [
        ("EXTRACTION", [
            ('text_simple', 'extraction.text_simple'),
            ('text_complex', 'extraction.text_complex'),
            ('vision', 'extraction.vision'),
        ]),
        ("PERSONALIZATION", [
            ('personalize', 'personalization.personalize'),
            ('pattern_discovery', 'personalization.pattern_discovery'),
        ]),
        ("MODIFICATION", [
            ('modify', 'modification.modify'),
        ]),
        ("TRANSCRIPTION", [
            ('audio', 'transcription.audio'),
        ]),
    ]

    for section_name, components in sections:
        print(f"\n  {section_name}:")
        for label, path in components:
            model_name = get_assigned_model(path)
            provider = MODELS[model_name]['provider']
            print(f"    {label:<22} {model_name:<38} ({provider})")

    threshold = CONFIG.extraction.complexity_threshold
    print(f"\n  Extraction complexity threshold: {threshold} chars")
    print("="*70 + "\n")
