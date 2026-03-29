# Launch Checklist

## Blockers

- [ ] **Google OAuth approval — personal data in few-shot examples**
  - Personalization stage sends user event history as few-shot examples; Google flags as sharing personal data with 3rd parties
  - Options: (1) AWS Bedrock for personalization stage (preferred — keeps feature, processes under our account), (2) anonymize/hash data before sending (much less work — worth checking if this satisfies Google's policy), (3) remove personalization (last resort)

- [ ] **Calendar sync race condition**
  - Colors/categories broken for new users during initial sync
  - Need loading/pending state or sync-complete gate before showing events

## High Priority

- [ ] **Apple calendar integration broken** — large user base, high priority
- [ ] **Microsoft calendar integration broken** — significant Outlook/365 user base
- [ ] **Editing agent reliability** — audit known failure cases, fix worst ones
- [ ] **Event tracking + status messages** — users need clear processing / synced / error feedback

## Medium Priority

- [ ] **Input modality audit** — test text, image, audio, PDF end-to-end; likely cut links + email for launch to reduce bug surface
- [ ] **Browser extension** — "access from anywhere" is core value prop; may help get first users faster rather than waiting for 10
- [ ] **Mobile app** — same reasoning as extension; assess completeness and potentially launch alongside web

## Post-Traction

- [ ] More agentic pipeline approach (product direction shift, not a launch requirement)

## Notes

- Target: 10 real users before heavy investment in mobile/extension (but these may help get there)
- Personalization is already built — preference is to fix the Google issue rather than remove it
- Links and email input are candidates for removal at launch to keep scope tight
