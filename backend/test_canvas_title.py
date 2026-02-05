"""
Test title generation on Canvas exam schedule page
"""

from extraction.title_generator import TitleGenerator

# Canvas exam schedule text
canvas_text = """
Skip To Content
Dashboard
Lucas Kover Wolf
Account
Dashboard
Courses
Groups
Calendar
19 unread messages.19
Inbox
History
Help
Spring 2026 MATH 0180PagesExams

2026 Spring
Home
Pages
Gradescope
Media Library
Zoom
Exams
Exams in this course will be closed-book, so you will not be able to reference your textbook or notes or use any calculators or electronic devices; if you use outside resources frequently to help you complete the homework, make sure you also figure out how you would approach and solve problems without them. We will not share previous exams or create custom practice exams, in order to discourage incorrect assumptions about the exam content, but we will share a large collection of previous exam problems, which will appear below as exams approach. Your best references for exam preparation are the assigned homework (collected AND self-check problems) and the problems from recitation worksheets. You can expect that exam problems will not be as hard as the hardest homework problems, but also not as easy as the easiest homework problems.

If you have a conflict with one or more exams, or if you have an exam accommodation approved by SAS, please formally report it to us at least one week before the exam, using the appropriate webform below. If an emergency or new accommodation arises less than a week before the exam, contact the Course Head via e-mail as soon as possible. For most conflicts, we will schedule the exam at another time on the same day; in extraordinary cases where a documented conflict/illness/emergency prevents you from taking the exam at any time on the exam date, we will almost always apply an alternative course grade calculation rather than offering a makeup exam.

Webform for Exam ConflictsLinks to an external site.

Webform for SAS-Approved Exam AccommodationsLinks to an external site.

Exam 1 will be held on Wednesday, February 25 from 6:30pm to 8pm in MacMillan 117. The exam will cover content from Weeks 1-5 of the course.

An outline of course topics relevant to the exam is available here Download here.

A collection of previous exam problems is available here Download here.

Solutions will be posted after the exam is graded and returned.

Exam 2 will be held on Wednesday, April 8 from 6:30pm to 8pm in MacMillan 117. The exam will cover content from Weeks 6-10 of the course.

An outline of course topics relevant to the exam is available here Download here.

A collection of previous exam problems is available here Download here.

Solutions will be posted after the exam is graded and returned.

The Final Exam will be held on Friday, May 8 from 9am to 12pm (unless the registrar reschedules the exam before the end of shopping period) in a location to be determined. Part of the exam will be focused on Weeks 11-14, and part will be cumulative and will cover content from the entire semester. We will announce more specifics about the exam format closer to the exam date.

An outline of course topics relevant to the exam is available here Download here.

A collection of previous exam problems is available here Download here.

Solutions to the final exam will not be posted.
"""

def test_canvas_title():
    print("=" * 70)
    print("TESTING TITLE GENERATION ON CANVAS EXAM SCHEDULE")
    print("=" * 70)
    print()

    print("Input text (first 200 chars):")
    print(f"{canvas_text[:200]}...")
    print()
    print("-" * 70)

    # Initialize generator
    print("Initializing TitleGenerator...")
    generator = TitleGenerator()
    print("✓ Model loaded")
    print()

    # Generate title
    print("Generating title (max 3 words)...")
    title = generator.generate(canvas_text, max_words=3)
    print()

    print("=" * 70)
    print(f"GENERATED TITLE: '{title}'")
    print("=" * 70)
    print()

    # Also test with different word counts
    print("Testing with different max_words:")
    for max_words in [2, 3, 4]:
        title = generator.generate(canvas_text, max_words=max_words)
        print(f"  max_words={max_words}: '{title}'")

    print()
    print("✓ Test complete!")

if __name__ == "__main__":
    test_canvas_title()
