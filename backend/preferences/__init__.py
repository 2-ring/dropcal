"""
Preferences domain - User preference management and pattern analysis
"""

from preferences.models import UserPreferences
from preferences.service import PersonalizationService
from preferences.analysis import PatternAnalysisService

__all__ = ['UserPreferences', 'PersonalizationService', 'PatternAnalysisService']
