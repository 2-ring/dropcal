"""
Similarity Service for Event Matching

This service implements semantic similarity search for calendar events using:
1. Embedding generation (OpenAI text-embedding-3-small)
2. Semantic similarity (cosine similarity)
3. Keyword overlap (Jaccard similarity)
4. Hybrid scoring (0.7 semantic + 0.3 keyword)

Used in Phase 2 of personalization: finding similar historical events for few-shot style transfer.
"""

import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np
from openai import OpenAI
import re
from functools import lru_cache


class SimilarityService:
    """
    Service for finding similar calendar events using hybrid similarity matching.

    Combines semantic embeddings with keyword overlap for robust similarity search.
    Includes caching for performance optimization.
    """

    def __init__(self, embedding_model: str = "text-embedding-3-small"):
        """
        Initialize the similarity service.

        Args:
            embedding_model: OpenAI embedding model to use
        """
        self.embedding_model = embedding_model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # In-memory cache for embeddings
        # Key: text string, Value: embedding vector
        self._embedding_cache: Dict[str, np.ndarray] = {}

        # Cache statistics
        self._cache_hits = 0
        self._cache_misses = 0

    def compute_embedding(self, text: str) -> np.ndarray:
        """
        Compute embedding for a text string with caching.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as numpy array
        """
        # Normalize text for cache key
        cache_key = text.strip().lower()

        # Check cache
        if cache_key in self._embedding_cache:
            self._cache_hits += 1
            return self._embedding_cache[cache_key]

        # Cache miss - compute embedding
        self._cache_misses += 1

        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            embedding = np.array(response.data[0].embedding)

            # Store in cache
            self._embedding_cache[cache_key] = embedding

            return embedding

        except Exception as e:
            print(f"Error computing embedding: {e}")
            # Return zero vector as fallback
            return np.zeros(1536)  # text-embedding-3-small dimension

    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Compute cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score between 0 and 1
        """
        # Handle zero vectors
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        # Compute cosine similarity
        similarity = np.dot(vec1, vec2) / (norm1 * norm2)

        # Ensure value is in [0, 1] range
        # Cosine similarity can be [-1, 1], but we map to [0, 1]
        similarity = (similarity + 1) / 2

        return float(similarity)

    def extract_keywords(self, text: str) -> set:
        """
        Extract keywords from text for keyword-based similarity.

        Args:
            text: Text to extract keywords from

        Returns:
            Set of normalized keywords
        """
        # Convert to lowercase
        text = text.lower()

        # Remove special characters but keep spaces and alphanumerics
        text = re.sub(r'[^a-z0-9\s]', ' ', text)

        # Split into words
        words = text.split()

        # Remove common stop words
        stop_words = {
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
        }

        # Filter stop words and short words
        keywords = {w for w in words if w not in stop_words and len(w) > 2}

        return keywords

    def jaccard_similarity(self, keywords1: set, keywords2: set) -> float:
        """
        Compute Jaccard similarity between two keyword sets.

        Args:
            keywords1: First keyword set
            keywords2: Second keyword set

        Returns:
            Similarity score between 0 and 1
        """
        if not keywords1 or not keywords2:
            return 0.0

        intersection = keywords1.intersection(keywords2)
        union = keywords1.union(keywords2)

        if not union:
            return 0.0

        return len(intersection) / len(union)

    def event_to_text(self, event: Dict) -> str:
        """
        Convert event dictionary to text for embedding/comparison.

        Args:
            event: Calendar event dictionary

        Returns:
            Formatted text representation
        """
        # Combine relevant fields
        parts = []

        # Title/summary (most important)
        if 'summary' in event and event['summary']:
            parts.append(event['summary'])

        # Description
        if 'description' in event and event['description']:
            parts.append(event['description'])

        # Location
        if 'location' in event and event['location']:
            parts.append(event['location'])

        # Calendar name (for context)
        if 'calendar_name' in event and event['calendar_name']:
            parts.append(f"calendar:{event['calendar_name']}")

        return ' '.join(parts)

    def compute_hybrid_similarity(
        self,
        query_text: str,
        event_text: str,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3
    ) -> Tuple[float, float, float]:
        """
        Compute hybrid similarity score combining semantic and keyword matching.

        Args:
            query_text: Query text (messy input)
            event_text: Event text to compare against
            semantic_weight: Weight for semantic similarity (default 0.7)
            keyword_weight: Weight for keyword similarity (default 0.3)

        Returns:
            Tuple of (hybrid_score, semantic_score, keyword_score)
        """
        # Compute semantic similarity
        query_embedding = self.compute_embedding(query_text)
        event_embedding = self.compute_embedding(event_text)
        semantic_score = self.cosine_similarity(query_embedding, event_embedding)

        # Compute keyword similarity
        query_keywords = self.extract_keywords(query_text)
        event_keywords = self.extract_keywords(event_text)
        keyword_score = self.jaccard_similarity(query_keywords, event_keywords)

        # Combine scores
        hybrid_score = (semantic_weight * semantic_score +
                       keyword_weight * keyword_score)

        return hybrid_score, semantic_score, keyword_score

    def find_similar_events(
        self,
        query: str,
        historical_events: List[Dict],
        n: int = 7,
        filters: Optional[Dict] = None,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3,
        min_score: float = 0.0
    ) -> List[Tuple[Dict, float]]:
        """
        Find n most similar events to the query using hybrid similarity.

        Args:
            query: Query text (e.g., "math homework friday 5pm")
            historical_events: List of historical calendar events
            n: Number of similar events to return
            filters: Optional filters (calendar, date_range, event_type)
            semantic_weight: Weight for semantic similarity
            keyword_weight: Weight for keyword similarity
            min_score: Minimum similarity score threshold

        Returns:
            List of (event, score) tuples, sorted by score descending
        """
        if not historical_events:
            return []

        # Apply filters if provided
        filtered_events = self._apply_filters(historical_events, filters)

        if not filtered_events:
            return []

        # Score each event
        scored_events = []

        for event in filtered_events:
            event_text = self.event_to_text(event)

            # Compute similarity
            hybrid_score, semantic_score, keyword_score = self.compute_hybrid_similarity(
                query,
                event_text,
                semantic_weight,
                keyword_weight
            )

            # Apply minimum score threshold
            if hybrid_score >= min_score:
                # Store event with scores
                event_with_scores = event.copy()
                event_with_scores['_similarity_scores'] = {
                    'hybrid': hybrid_score,
                    'semantic': semantic_score,
                    'keyword': keyword_score
                }

                scored_events.append((event_with_scores, hybrid_score))

        # Sort by score descending
        scored_events.sort(key=lambda x: x[1], reverse=True)

        # Return top N
        return scored_events[:n]

    def _apply_filters(
        self,
        events: List[Dict],
        filters: Optional[Dict]
    ) -> List[Dict]:
        """
        Apply filters to event list.

        Args:
            events: List of events
            filters: Filter dictionary with optional keys:
                - calendar: calendar name to match
                - calendar_id: calendar ID to match
                - date_range: (start_date, end_date) tuple
                - event_type: event type to match
                - exclude_ids: list of event IDs to exclude

        Returns:
            Filtered event list
        """
        if not filters:
            return events

        filtered = events

        # Filter by calendar name
        if 'calendar' in filters and filters['calendar']:
            calendar_name = filters['calendar'].lower()
            filtered = [
                e for e in filtered
                if e.get('calendar_name', '').lower() == calendar_name
            ]

        # Filter by calendar ID
        if 'calendar_id' in filters and filters['calendar_id']:
            calendar_id = filters['calendar_id']
            filtered = [
                e for e in filtered
                if e.get('calendar_id', '') == calendar_id
            ]

        # Filter by date range
        if 'date_range' in filters and filters['date_range']:
            start_date, end_date = filters['date_range']
            filtered = [
                e for e in filtered
                if self._event_in_date_range(e, start_date, end_date)
            ]

        # Filter by event type (if stored in event)
        if 'event_type' in filters and filters['event_type']:
            event_type = filters['event_type'].lower()
            filtered = [
                e for e in filtered
                if e.get('event_type', '').lower() == event_type
            ]

        # Exclude specific event IDs
        if 'exclude_ids' in filters and filters['exclude_ids']:
            exclude_ids = set(filters['exclude_ids'])
            filtered = [
                e for e in filtered
                if e.get('id', '') not in exclude_ids
            ]

        return filtered

    def _event_in_date_range(
        self,
        event: Dict,
        start_date: datetime,
        end_date: datetime
    ) -> bool:
        """
        Check if event falls within date range.

        Args:
            event: Calendar event
            start_date: Range start
            end_date: Range end

        Returns:
            True if event is in range
        """
        try:
            # Try to parse event start date
            if 'start' in event:
                start = event['start']
                if isinstance(start, dict):
                    date_str = start.get('dateTime') or start.get('date')
                else:
                    date_str = start

                if date_str:
                    # Parse ISO format date
                    event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    return start_date <= event_date <= end_date

            return True  # Include if we can't parse date

        except Exception:
            return True  # Include if there's any error

    def get_cache_stats(self) -> Dict[str, any]:
        """
        Get cache statistics for monitoring.

        Returns:
            Dictionary with cache statistics
        """
        total_requests = self._cache_hits + self._cache_misses
        hit_rate = self._cache_hits / total_requests if total_requests > 0 else 0

        return {
            'cache_size': len(self._embedding_cache),
            'cache_hits': self._cache_hits,
            'cache_misses': self._cache_misses,
            'hit_rate': hit_rate,
            'total_requests': total_requests
        }

    def clear_cache(self):
        """Clear the embedding cache."""
        self._embedding_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0

    def precompute_embeddings(self, events: List[Dict]) -> None:
        """
        Precompute embeddings for a list of events to populate cache.

        Useful for batch processing or initialization.

        Args:
            events: List of events to precompute embeddings for
        """
        print(f"Precomputing embeddings for {len(events)} events...")

        for i, event in enumerate(events):
            if i % 100 == 0:
                print(f"Progress: {i}/{len(events)}")

            event_text = self.event_to_text(event)
            self.compute_embedding(event_text)

        print(f"Precomputation complete. Cache size: {len(self._embedding_cache)}")


# Convenience functions for common use cases

def find_similar_homework_events(
    query: str,
    historical_events: List[Dict],
    similarity_service: SimilarityService,
    n: int = 5
) -> List[Tuple[Dict, float]]:
    """
    Find similar homework/assignment events.

    Args:
        query: Query text
        historical_events: All historical events
        similarity_service: SimilarityService instance
        n: Number of results

    Returns:
        List of similar homework events with scores
    """
    # Filter to homework-like events by keywords
    homework_keywords = {'homework', 'hw', 'assignment', 'problem set', 'pset', 'due'}

    homework_events = [
        e for e in historical_events
        if any(keyword in e.get('summary', '').lower() for keyword in homework_keywords)
    ]

    return similarity_service.find_similar_events(
        query=query,
        historical_events=homework_events,
        n=n,
        semantic_weight=0.7,
        keyword_weight=0.3
    )


def find_similar_meeting_events(
    query: str,
    historical_events: List[Dict],
    similarity_service: SimilarityService,
    n: int = 5
) -> List[Tuple[Dict, float]]:
    """
    Find similar meeting events.

    Args:
        query: Query text
        historical_events: All historical events
        similarity_service: SimilarityService instance
        n: Number of results

    Returns:
        List of similar meeting events with scores
    """
    # Filter to meeting-like events
    meeting_keywords = {'meeting', 'call', 'standup', 'sync', '1:1', 'interview'}

    meeting_events = [
        e for e in historical_events
        if any(keyword in e.get('summary', '').lower() for keyword in meeting_keywords)
    ]

    return similarity_service.find_similar_events(
        query=query,
        historical_events=meeting_events,
        n=n,
        semantic_weight=0.7,
        keyword_weight=0.3
    )
