"""
Debug title generation to see what's being extracted
"""

from extraction.title_generator import TitleGenerator
import re

canvas_text = """
Spring 2026 MATH 0180 Pages Exams

Exams in this course will be closed-book. Exam 1 will be held on Wednesday, February 25 from 6:30pm to 8pm in MacMillan 117.
"""

def debug_extraction():
    print("=" * 70)
    print("DEBUGGING TITLE GENERATION")
    print("=" * 70)
    print()

    print("Input text:")
    print(canvas_text)
    print()
    print("-" * 70)

    # Create generator
    generator = TitleGenerator()

    # Manually extract course codes
    print("\n1. COURSE CODE EXTRACTION:")
    course_codes = generator.course_code_pattern.findall(canvas_text)
    print(f"   Found: {course_codes}")

    # Clean up spacing
    cleaned_codes = [re.sub(r'\s+', '', code) for code in course_codes]
    print(f"   Cleaned: {cleaned_codes}")

    # Extract event types
    print("\n2. EVENT TYPE EXTRACTION:")
    event_types = generator.event_type_pattern.findall(canvas_text)
    print(f"   Found: {event_types}")

    # Extract keywords with KeyBERT
    print("\n3. KEYBERT KEYWORD EXTRACTION:")
    try:
        keywords = generator.model.extract_keywords(
            canvas_text[:1000],
            keyphrase_ngram_range=(1, 2),
            stop_words='english',
            top_n=10,
            use_maxsum=True
        )
        print("   Top keywords:")
        for kw, score in keywords[:10]:
            print(f"     - {kw}: {score:.3f}")
    except Exception as e:
        print(f"   Error: {e}")

    # Generate final title
    print("\n4. FINAL TITLE GENERATION:")
    title = generator.generate(canvas_text, max_words=3)
    print(f"   Generated: '{title}'")

    print()
    print("=" * 70)

if __name__ == "__main__":
    debug_extraction()
