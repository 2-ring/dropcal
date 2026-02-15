# Welcome Page Subtasks for Parallel Execution

This document breaks down the welcome page implementation into serializable subtasks suitable for multiple agents working in parallel.
Refer to `docs/planning/welcome-prd.md` for detailed requirements.

## 1. Top Bar & Navigation Agent
**Task**: Build the global announcement bar and sticky navigation bar.
- **Inputs**: `docs/planning/welcome-prd.md` (Top Bar, Section 1: Navigation Bar)
- **Output Files**:
    - `frontend/src/welcome/components/TopBar.tsx`
    - `frontend/src/welcome/components/TopBar.css`
    - `frontend/src/welcome/components/NavBar.tsx`
    - `frontend/src/welcome/components/NavBar.css`
- **Instructions**:
    - TopBar: "Join the beta..." text, ~40px height, subtle background.
    - NavBar: Sticky/fixed, transparent -> blur/solid on scroll. Left logo, Center links, Right CTA. Collapse on mobile.

## 2. Hero Section Agent
**Task**: Build the main Hero section, including the headlines and the complex Input->Output animation.
- **Inputs**: `docs/planning/welcome-prd.md` (Section 2: Hero), existing `frontend/src/welcome/Welcome.css` (for font styles)
- **Output Files**:
    - `frontend/src/welcome/components/Hero.tsx`
    - `frontend/src/welcome/components/Hero.css`
- **Instructions**:
    - Headline: "Drop it in. It's on your calendar." (Gradient on 2nd line).
    - Subtext: "Photos, PDFs..."
    - CTAs: Primary & Secondary.
    - Animation: Cycling input cards (left), pulsating center icon, cycling output events (right). Smooth transitions.

## 3. Personalization & Features Agent
**Task**: Build the "Personalization" interactive card section and the "Feature Details" section.
- **Inputs**: `docs/planning/welcome-prd.md` (Section 3: Personalization, Section 5: Feature Detail Cards)
- **Output Files**:
    - `frontend/src/welcome/components/Personalization.tsx`
    - `frontend/src/welcome/components/Personalization.css`
    - `frontend/src/welcome/components/FeatureDetails.tsx`
    - `frontend/src/welcome/components/FeatureDetails.css`
- **Instructions**:
    - Personalization: Card animates 5 rows (Title, Duration...) from generic -> personalized on scroll.
    - Feature Details: 3 rows (Titles, Calendar, Duration), alternating text/visual.

## 4. Omnipresence Agent
**Task**: Build the "Schedule from anywhere" section with floating icons.
- **Inputs**: `docs/planning/welcome-prd.md` (Section 4: Omnipresence)
- **Output Files**:
    - `frontend/src/welcome/components/Omnipresence.tsx`
    - `frontend/src/welcome/components/Omnipresence.css`
- **Instructions**:
    - Left side: Title, subtext, platform chips (Google/Apple/Outlook).
    - Right side: Phone mockup with floating icons trail (SMS, Email, Camera, etc.) leading into it. Parallax effect recommended.

## 5. Footer & Cleanup Agent
**Task**: Build the Bottom CTA section and the global Footer, plus final page assembly.
- **Inputs**: `docs/planning/welcome-prd.md` (Section 6: Bottom CTA, Section 7: Footer)
- **Output Files**:
    - `frontend/src/welcome/components/BottomCTA.tsx`
    - `frontend/src/welcome/components/BottomCTA.css`
    - `frontend/src/welcome/components/Footer.tsx`
    - `frontend/src/welcome/components/Footer.css`
    - `frontend/src/welcome/Welcome.tsx` (Update to import all components)
- **Instructions**:
    - BottomCTA: "Start dropping" headline, subtext, big CTA.
    - Footer: Logo, Links columns, Copyright.
    - Welcome.tsx: Assemble all components in order.
