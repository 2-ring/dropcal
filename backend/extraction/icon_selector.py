"""
Icon Selector — picks a Phosphor icon based on input text content.
Uses simple keyword matching against a curated icon-to-tags dictionary.
"""

import re
from typing import Optional


# Curated mapping: Phosphor icon name (kebab-case) -> list of keyword tags
# ~70 icons covering common calendar event categories
ICON_TAGS: dict[str, list[str]] = {
    # Food & Dining
    "fork-knife": ["dinner", "lunch", "brunch", "restaurant", "dining", "meal", "food", "eat", "supper", "buffet"],
    "coffee": ["coffee", "cafe", "latte", "espresso", "caffeine", "starbucks"],
    "beer-bottle": ["beer", "drinks", "bar", "pub", "happy hour", "brewery"],
    "wine": ["wine", "winery", "vineyard", "tasting"],
    "cooking-pot": ["cooking", "recipe", "cook", "bake", "potluck"],
    "cake": ["cake", "birthday", "dessert", "bakery"],
    "bowl-food": ["breakfast", "cereal", "oatmeal", "bowl", "ramen"],

    # Travel & Transportation
    "airplane-tilt": ["flight", "airport", "flying", "airline", "travel", "trip", "vacation", "plane"],
    "car": ["drive", "driving", "road trip", "carpool", "uber", "lyft", "commute"],
    "train": ["train", "metro", "subway", "rail", "transit", "amtrak"],
    "bus": ["bus", "shuttle", "transit"],
    "boat": ["boat", "cruise", "sailing", "ferry", "yacht"],
    "tent": ["camping", "tent", "outdoors", "glamping", "campfire"],
    "map-trifold": ["map", "directions", "navigate", "tour", "sightseeing"],
    "suitcase-rolling": ["luggage", "packing", "hotel", "check-in", "checkout", "hostel"],
    "bed": ["hotel", "stay", "accommodation", "airbnb", "lodging", "sleep"],

    # Fitness & Health
    "barbell": ["gym", "workout", "weights", "strength", "lifting", "crossfit"],
    "person-simple-run": ["running", "run", "jog", "jogging", "marathon", "5k", "10k"],
    "bicycle": ["bike", "cycling", "biking", "ride", "peloton"],
    "swimming-pool": ["swim", "swimming", "pool", "lap"],
    "heart": ["health", "wellness", "self-care", "meditation", "mindfulness"],
    "first-aid-kit": ["doctor", "appointment", "medical", "checkup", "physical", "clinic", "hospital", "dentist", "therapy", "therapist", "counseling"],
    "pill": ["medicine", "pharmacy", "prescription", "medication"],
    "basketball": ["basketball", "nba"],
    "soccer-ball": ["soccer", "football", "fifa"],
    "tennis-ball": ["tennis", "racket"],

    # Work & Office
    "briefcase": ["work", "office", "business", "corporate", "job", "career"],
    "presentation-chart": ["presentation", "pitch", "demo", "powerpoint", "slides", "keynote"],
    "video-camera": ["video call", "zoom", "teams", "webinar", "stream", "recording"],
    "users": ["meeting", "standup", "sync", "huddle", "one-on-one", "1:1", "all-hands", "team"],
    "chats": ["interview", "discussion", "chat", "conversation", "catch up"],
    "envelope-simple": ["email", "newsletter", "mailing", "mail"],
    "phone": ["phone call", "call", "dial-in", "conference call"],
    "desktop-tower": ["hackathon", "coding", "programming", "sprint", "deploy", "release"],
    "handshake": ["networking", "mixer", "connect", "introduction"],

    # Education
    "graduation-cap": ["graduation", "commencement", "degree", "diploma"],
    "book-open": ["class", "lecture", "course", "lesson", "study", "reading", "textbook", "homework", "assignment"],
    "exam": ["exam", "midterm", "final", "quiz", "test", "assessment"],
    "chalkboard-teacher": ["teaching", "tutor", "tutoring", "professor", "instructor", "office hours", "recitation", "section"],
    "student": ["student", "school", "university", "college", "campus", "academic", "semester"],
    "notebook": ["notes", "journal", "writing", "essay", "paper", "report", "lab"],

    # Entertainment & Social
    "music-notes": ["concert", "music", "show", "gig", "festival", "band", "performance", "recital", "orchestra", "symphony"],
    "ticket": ["ticket", "event", "admission"],
    "film-slate": ["movie", "film", "cinema", "theater", "screening", "premiere"],
    "television": ["tv", "watch", "streaming", "netflix", "series", "episode"],
    "game-controller": ["gaming", "game night", "lan party", "esports", "video game"],
    "microphone-stage": ["karaoke", "open mic", "comedy", "standup", "podcast", "speaking"],
    "paint-brush": ["art", "painting", "gallery", "exhibit", "museum", "creative"],
    "camera": ["photo", "photography", "photoshoot", "portrait"],
    "confetti": ["party", "celebration", "gathering", "hangout", "get-together", "bash"],

    # Shopping & Errands
    "shopping-cart": ["shopping", "grocery", "store", "mall", "market", "buy", "purchase"],
    "scissors": ["haircut", "salon", "barber", "grooming", "spa", "beauty"],
    "package": ["pickup", "delivery", "shipping", "package", "fedex", "ups", "amazon"],
    "wrench": ["repair", "maintenance", "fix", "plumber", "electrician", "mechanic", "service"],

    # Home & Family
    "house": ["home", "house", "apartment", "move", "moving", "furniture", "cleaning"],
    "baby": ["baby", "child", "kids", "daycare", "babysitter", "nanny", "pediatric"],
    "dog": ["dog", "pet", "vet", "veterinary", "walk", "groomer"],
    "tree": ["garden", "yard", "landscaping", "plant", "nature", "park", "hike", "hiking", "trail"],

    # Religion & Spirituality
    "church": ["church", "service", "worship", "mass", "sermon", "chapel"],
    "cross": ["prayer", "bible study", "religious", "faith", "ministry"],
    "star-of-david": ["synagogue", "temple", "shabbat", "sabbath"],

    # Finance & Legal
    "bank": ["bank", "finance", "financial", "investment", "accounting", "tax"],
    "money": ["payment", "bill", "invoice", "budget", "savings"],
    "scales": ["legal", "lawyer", "attorney", "court", "hearing", "trial", "notary"],
    "receipt": ["receipt", "expense", "reimbursement"],

    # Tech & Science
    "code": ["code", "development", "engineering", "technical", "software"],
    "robot": ["ai", "machine learning", "automation", "tech"],
    "flask": ["science", "lab", "research", "experiment", "chemistry"],

    # Celebration & Milestones
    "gift": ["gift", "present", "surprise", "shower", "registry"],
    "champagne": ["anniversary", "toast", "new year", "nye", "cheers"],
    "heart-half": ["date", "date night", "valentine", "romantic"],
    "flower-lotus": ["wedding", "ceremony", "reception", "bridal", "engagement"],

    # Miscellaneous
    "calendar-dots": ["calendar", "schedule", "plan", "agenda", "itinerary"],
    "clock": ["reminder", "deadline", "due", "timer"],
    "megaphone": ["announcement", "rally", "protest", "campaign", "volunteer"],
    "flag-banner": ["race", "competition", "tournament", "championship"],
}

DEFAULT_ICON = "calendar-dots"


class IconSelector:
    """
    Selects a Phosphor icon for a session based on keyword matching.
    No ML model — uses simple string matching against curated tags.
    """

    def __init__(self):
        # Pre-build inverted index: keyword -> list of (icon_name, specificity)
        # Specificity = 1/len(tags) so icons with fewer tags score higher per match
        self._index: dict[str, list[tuple[str, float]]] = {}
        for icon, tags in ICON_TAGS.items():
            specificity = 1.0 / len(tags)
            for tag in tags:
                tag_lower = tag.lower()
                if tag_lower not in self._index:
                    self._index[tag_lower] = []
                self._index[tag_lower].append((icon, specificity))

        # Collect multi-word tags for substring matching (higher priority)
        self._multi_word_tags: list[tuple[str, str]] = [
            (tag.lower(), icon)
            for icon, tags in ICON_TAGS.items()
            for tag in tags
            if " " in tag
        ]

    def select(self, text: str) -> str:
        """
        Select the best matching icon for the given text.

        Args:
            text: Input text to match against icon tags

        Returns:
            Phosphor icon name in kebab-case (e.g., "airplane-tilt")
        """
        if not text or not text.strip():
            return DEFAULT_ICON

        text_lower = text.lower()[:2000]  # Cap for speed

        scores: dict[str, float] = {}

        # Phase 1: Multi-word tags (higher priority, more specific)
        for tag, icon in self._multi_word_tags:
            if tag in text_lower:
                scores[icon] = scores.get(icon, 0) + 2.0

        # Phase 2: Single-word tags via word extraction
        words = set(re.findall(r"[a-z]+", text_lower))
        for word in words:
            if word in self._index:
                for icon, specificity in self._index[word]:
                    scores[icon] = scores.get(icon, 0) + specificity

        if not scores:
            return DEFAULT_ICON

        return max(scores, key=scores.get)


# Singleton
_icon_selector_instance: Optional[IconSelector] = None


def get_icon_selector() -> IconSelector:
    """Get or create singleton IconSelector instance."""
    global _icon_selector_instance
    if _icon_selector_instance is None:
        _icon_selector_instance = IconSelector()
    return _icon_selector_instance
