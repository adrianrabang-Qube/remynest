# App Store Screenshot Capture Specification (iPhone-only v1)

> Operator capture package — **real app screens only**. No fabricated UI, no
> marketing composites, no device frames, no AI-generated imagery. Capture
> happens AFTER Build 18 is on the device/simulator (branded icon + splash).
> The optional App Preview **video is DEFERRED for v1**.

## Device & format
- **One size set required (iPhone-only launch):**
  - Preferred: **6.9" — 1260 × 2736 portrait** (iPhone 16 Pro Max class)
  - Alternative: **6.5" — 1284 × 2778 portrait**
- PNG or JPG · RGB · **no alpha/transparency** · max 10 frames · light mode.
- Validate every file before upload:
  `sips -g pixelWidth -g pixelHeight -g hasAlpha <file>` (alpha must be `no`).
- **No iPad assets** — iPad support is deliberately deferred (target is
  iPhone-only for v1); do not upload iPad screenshots or claim iPad support.

## Capture rules
- Signed into the **dedicated review/demo account** with realistic, warm
  family content — never real care-recipient names or identifying photos of
  real patients.
- No health/therapy/cognitive claims anywhere in captions or visible content.
- **Do not screenshot the Spotify import field** (avoids trademark review
  questions).
- Status bar: use simulator default (or clean via Xcode's status-bar
  override); no personal notifications visible.

## The 8-frame narrative (in upload order)
| # | Screen (real route) | Caption |
|---|---|---|
| 1 | Home (`/home`) — greeting, date line, Remy present | A calm home for your family's memories |
| 2 | New memory with photos attached (`/memories/new`) | Save the moments that matter — photos, words, and voices |
| 3 | Memory detail with photos (`/memories/[id]`) | Every memory kept private to your family |
| 4 | Voice Memory listen-back state (recorder preview) | Record a voice, a story, a laugh |
| 5 | Activities landing (`/activities`) — all five cards | Gentle ways to spend time with your memories |
| 6 | Memory Puzzle mid-play (~half placed, ghost on) | Piece a favourite photo back together |
| 7 | Together Time player on a photo moment + prompt | Look back through memories, side by side |
| 8 | Reminders (`/reminders`) or care workspace view | Gentle nudges, shared with the people who help |

Caption styling (if overlaid): short bar at the TOP of the frame (App Store
crops bottoms in some placements), Fraunces/Inter per brand, charcoal on sand
— or ship clean screenshots with no overlay (acceptable and honest).

## Workflow
1. Build 18 on an iPhone 16 Pro Max simulator (or device) → sign into the demo
   account → capture the 8 frames (`Cmd+S` in Simulator saves exact-size PNG).
2. Add caption bars (optional) without resizing the canvas.
3. Validate dimensions + no-alpha (command above) for all frames.
4. Upload to App Store Connect → iOS App → version → the single 6.9"/6.5" set.
5. Confirm the ASC preview shows the nest icon (not the old template) before
   submitting.

## Remaining operator tasks (recorded 2026-07-15)
- [ ] Increment build to **18** (only when preparing the archive — Build 17 is
      already uploaded; the working-tree bump is the operator's own change).
- [ ] Archive + upload Build 18 to TestFlight (ships branded icon/splash, the
      voice-memory mic copy, the bundled privacy manifest, iPhone-only).
- [ ] Complete App Store Connect **privacy answers incl. Audio Data**
      (user content · linked · app functionality · no tracking).
- [ ] Capture + upload the 8 screenshots per this spec.
- [ ] Do NOT claim iPad support or upload iPad assets for v1.
