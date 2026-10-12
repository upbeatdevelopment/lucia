---
title: Changelog
sidebar_position: 3
---

# Changelog

## 2026-10-12 — Use the configured owner identity for publication

**Why:** The user asked us to handle publication with the machine's existing access. The default GitHub identity lacks repository write permission, but the preconfigured github-upbeatdevelopment SSH alias authenticates as the owner; no new credentials or access grants are needed.

- **Introduction:** Documents the existing owner-account SSH alias for pushes from this machine and keeps personal history/generated files out of version control.
- **Requirements:** Reopens 41 using the correct identity; publication still requires a successful push and matching remote/local commit IDs.

## 2026-10-12 — Separate statistics from configuration

**Why:** The user wants statistics in their own drawer rather than mixed into Settings; Progress should be directly discoverable without scrolling past configuration.

- **Introduction:** Separate Stats and Settings buttons open mutually exclusive drawers. Stats holds scores, Progress and History; Settings holds configuration, Sound and Replay. Either pauses play, dismissal leaves it paused, and Ctrl+Enter is guarded while either is open.
- **README:** Routes progress browsing directly through Stats and explains each drawer's contents.
- **Requirements:** Marks 42 delivered with 42 unit and 24 browser tests passing, single-drawer/content separation, pause timing and shortcut/control locks. Covers the reviewed deadline/drawer race: New session dismisses an overlapping drawer before starting. Desktop/mobile live-5174 drawers were inspected without history writes.

## 2026-10-12 — Let piano keys always audition

**Why:** The user wants to click notes and hear them regardless of quiz state, rather than having the piano disabled outside running key exercises.

- **Introduction:** Main and popup keys always audition, initialize audio on demand and bypass quiz mute. Only running Name → keys main-keyboard clicks are graded; other clicks leave the quiz untouched. Non-modal drawers leave uncovered keys interactive while keeping other quiz actions locked. Quiz sound controls automatic prompts and Replay.
- **README:** Explains free key audition and the narrower meaning of Quiz sound.
- **Requirements:** Marks 43 delivered with real Tone meter checks across ready/hear/paused/popup/finished states, quiz mute and both open drawers. Completion keys remain playable without changing counts; a deliberately delayed audio start proves key-answer grading does not await audio. Syntax and App/Progress diagnostics pass; the full suite is 42 unit/24 browser tests.

## 2026-10-12 — Prepare GitHub publication

**Why:** The user requested publication to upbeatdevelopment/lucia. The source should be versioned without publishing their local piano history or generated/private files.

- **Introduction:** Records the requested repository target and what is excluded from version control.
- **Requirements:** Marks 41 blocked because GitHub reports the authenticated alexeightsix account lacks push permission. Source is prepared locally with private/generated files excluded and 42 passing unit tests; a verified remote commit is still required before publication can be reported complete.

## 2026-10-12 — Explain progress navigation and project setup

**Why:** The user could not find the progress section and requested a README. Setup and navigation should be clear without reading implementation details.

- **Introduction:** Locates Progress below session configuration in the drawer opened by the bottom-right sliders icon.
- **README:** Documents getting started, game rules, controls, timing progress, SQLite persistence, troubleshooting and test commands.
- **Requirements:** Marks 40 delivered after README link/command checks and readonly live-browser navigation verification. Repairs blank-line breaks so newer requests remain part of the Markdown ledger table.

## 2026-10-12 — Make response-time progress visible

**Why:** Correct-answer totals alone do not show how quickly the user recognises notes/chords. They requested a clear latest-times section and a graph showing improvement.

- **Introduction:** Settings exposes response-time Progress with phase/direction filters, separate hear/key speed lines and latest attempt outcomes. Timings measure active question time, exclude pauses, preserve retry history and original limits, and do not invent measurements for older attempts. SQLite retains timing metadata and the API returns a separate recent timed history.
- **Requirements:** Marks 39 delivered with 42 passing unit tests, 20 passing browser tests, syntax/diagnostic checks and live-5174 verification. Confirms original history IDs survive migration and the live graph renders real saved timings; desktop/mobile chart and table screenshots were inspected. Tests cover hidden-tab/popup/drawer pauses, cumulative retries, original limits, immutable failed-save metadata, filtering, and API/chart errors.

## 2026-10-11 — Move keyboard indicators above the keys

**Why:** The user wants octave numbers above the instrument, a left-to-right horizontal timer in the same area, and clean game key faces instead of tiny note/octave labels.

- **Introduction:** Octave ranges are numbered above every keyboard view. A full-width elapsed-time bar replaces the heading's circular timer, preserving remaining time, pause and reset behaviour. Only the learning popup keeps note/fingering labels on keys.
- **Requirements:** Marks 36–38 delivered with measured desktop/mobile octave alignment, full/compact/lesson coverage, timer fill/pause/reset/deadline checks, and game-versus-popup label assertions. Records 33 passing unit tests, 15 passing browser tests, syntax checks, readonly live-5174 verification and inspected screenshots. Corrects a history-test assumption exposed by the new clock-advancing timer case; session chronology itself is unchanged.

## 2026-10-11 — Accept any matching note and teach its chosen octave

**Why:** Recovery of the active session confirms the user's last correction was “A anywhere, but what octave?” The provisional octave-4-only grading rejected valid matching notes instead of teaching the register the user chose.

- **Introduction:** Play A accepts any displayed A; successful feedback names the actual key and octave. The note lesson explains octave boundaries without falsely requiring octave 4. Existing C-octave anchors and actual-key attempt history remain intact.
- **Requirements:** Marks 35 delivered with all-88-key grading coverage, actual-octave feedback across cycle transitions, wrong-note rejection, browser persistence checks, and desktop/mobile visual inspection. Records 33 passing unit tests, 13 passing browser tests, syntax checks and readonly live-5174 module/layout verification; the user's pending-save queue remains unconfirmed.

## 2026-10-11 — Verify cycles, controls, and educational results

**Why:** The accumulated interface and quiz changes need exercised evidence, and an old retry sentence contradicted the new pausing-popup behavior.

- **Introduction:** Removes the stale claim that the retry timer keeps running in the modal; it resumes after dismissal. Modal opening/pause and deadline resets occur before paint to avoid timer/input races.
- **Requirements:** Verification covers every target/direction and all 21 cycles, complete quiz storage, Mixed defaults, centered play prompts, keyboard shortcuts, paused replay/mute, result-only restart/statistics, educational shapes/fingerings, preserved history, and exact-5174 CSS/layout. Marks 24–34 delivered with 30 unit tests and 12 browser tests, plus an exact-5174 check and mobile modal bounds. Marks octave behavior blocked on the user's clarification. Notes superseded timer/phase/width evidence, updates the old single-dialog claim, and removes blank lines that broke the Markdown requirements table.

## 2026-10-11 — Explain and recover rejected history writes

**Why:** The user saw three unsaved entries after Mixed was introduced. Live servers retained old validators, rejecting new session directions. Restarted all preview backends; a deduplicated existing-ID probe now returns 201 while preserving four sessions and 33 attempts.

- **Introduction:** Requires backend restart after API changes and exposes save failure reasons. Queued writes must be retried before refreshing because their queue is in memory.

## 2026-10-11 — Introduce octaves in note-playing

**Why:** The user wants pressing the note to train its octave as well as its name.

- **Introduction:** Single-note key prompts show and require octave 4. C-octave anchors identify the register on the full keyboard; the learning popup explains that octave numbers change at C. Typed identification remains pitch-class based, and chord octave transpositions remain accepted.
- **Requirements:** Adds exact-note-register, prompt, anchor and octave-lesson checks.

## 2026-10-11 — Clear key-selection prompt and usable fingering guidance

**Why:** The user wants the play-the-note direction clearly centered and asked for fingering as well as chord shape in the learning popup. Review also found that newly missed targets needed current-cycle repetitions, not just later-cycle bias.

- **Introduction:** The Play target prompt is large and centered. Fingerings label the keyboard and both-hand table. Full-view chord clicks ascend in actual pitch, while compact view retains octave-wrap equivalence. New retry mistakes schedule current-cycle adaptive extras.
- **Requirements:** Adds prompt/voice-order checks and explicit both-hand fingering evidence.

## 2026-10-11 — Teach the shape in the answer popup

**Why:** The user stressed fast learning: the answer popup should be larger and explain the chord rather than merely state its name. They also requested removing the duplicate error heading.

- **Introduction:** Defines a labelled educational keyboard, color-coded root/third/fifth, major intervals, bass/voice-order and inversion explanations, and single-note location/enharmonic guidance, and suggested right/left-hand fingerings with thumb-to-little-finger numbering. Records Mixed session versus actual attempt directions and full-quiz completion. Adaptive extras stop when debt clears; every direction remains covered. Removes obsolete eight-answer counts from part descriptions because full cycles now govern advancement.
- **Requirements:** Adds educational-content/diagram and popup-only failure-message verification.

## 2026-10-11 — Mixed directions and complete 8/4/2-second cycles

**Why:** The user explicitly wants both directions by default, including named-note key selection within the same quiz, and full cycles at eight, four, and two seconds before progressing.

- **Introduction:** Mixed cycles cover each target in each direction. All seven complexity parts complete fixed 8/4/2-second cycles; second inversions also have simple/complex parts. Adaptive repeats weak targets without skipping others. The final cycle completes the quiz. Fixed timings replace the shrinking timer/start-duration control.
- **Requirements:** Records mixed-direction coverage, actual attempt directions, complete-cycle transitions and final completion.

## 2026-10-11 — Separate simple and more-complex chord parts

**Why:** The user wants the first major chords to be simple and explicitly requested multiple complexity parts rather than immediately mixing all chords and inversions.

- **Introduction:** Defines six sequential quiz parts. C/F/G basics precede all-root majors and first inversions; second inversions come last. Each finite part resets its timer after eight successes. Saved learning remains shared by musical category and is not erased by basic root pools.
- **Requirements:** Adds transition, beginner-pool, and timer-reset verification.

## 2026-10-11 — Modal failure answer and result summary

**Why:** The user wants the correct-answer reveal and correct-count/points displayed in a popup rather than inline with the piano.

- **Introduction:** Failure opens an answer/result modal. Retry rounds pause until Continue/Escape; finished sessions can restart from the popup. Main-view statistics move to the drawer. New session → belongs only to the result popup; View result reopens it after dismissal.
- **Requirements:** Adds modal behavior and safe retry-countdown verification.

## 2026-10-11 — Keyboard start and drawer-only playback controls

**Why:** The user wants a keyboard or Start → entry point and progressively fewer controls in the game itself, specifically moving both sound and Replay into the drawer.

- **Introduction:** Ctrl+Enter starts ready/finished sessions only. Sound and Replay live in the drawer; paused manual replay does not resume/reset gameplay.
- **Requirements:** Adds start-shortcut and drawer-playback verification.

## 2026-10-11 — Fullscreen container and subtle stage progress

**Why:** The user wants the game to fill the screen rather than a 90%-width frame, and settled on subtle progression after considering moving or removing the stage cards.

- **Introduction:** The container and piano are edge-to-edge. Stage progress becomes a muted inline label beside round information; the automatic three-stage game remains unchanged.
- **Requirements:** Records fullscreen sizing and subtle-stage verification; marks the exact-5174 stylesheet defect fixed after a real browser check.

## 2026-10-11 — Restore the styled preview at the user's actual URL

**Why:** The supplied screenshot shows an unstyled page and enormous black timer SVG at localhost:5174. Earlier verification covered 5173, not the user's preview; 5174 no longer had a serving process. This is a preview defect, not a reason to change the requested piano dimensions.

- **Introduction:** Documents the existing 5174 preview port and requires CSS loading there. Timer SVGs have explicit bounds/no-fill as a fallback against unstyled rendering. Shorter viewports compact the surrounding spacing to keep the controls on screen while preserving piano dimensions.
- **Requirements:** Records exact-URL stylesheet/layout verification pending completion.

## 2026-10-11 — Verify adaptive practice and the minimal enlarged game

**Why:** The added failure reveals, mistake-driven bias, drawer, and viewport sizing need exercised evidence before being marked delivered.

- **Requirements:** Marks requests 17–22 done with 25 unit tests, 11 browser tests, actual SQLite migration/order/retry checks, inspected failure/drawer/history screenshots, and measured 90% live keyboard width. Updates the old no-dialog claim to distinguish the requested settings drawer from the removed guide.

## 2026-10-11 — Explicit failure answers and adaptive mistake practice

**Why:** The user wants the correct answer clearly shown after failure and wants saved mistakes to keep shaping the note mix, with an explicit mode rather than hidden behavior.

- **Introduction:** Requires prominent correct-answer/key reveals even when retries are enabled. Adds persistent Adaptive/Balanced modes, individual SQLite attempts, phase-specific practice debt, bounded weighting and gradual debt reduction. Existing session summaries are preserved but cannot reconstruct unrecorded targets. Attempt sequences preserve learning order for tied timestamps, and queued failures merge with their full target histories to retain prior bias. Moves configuration, best-score statistics, and history to a pausing right-side drawer because the user wants the main game as minimal as possible.
- **Requirements:** Records the failure/adaptive/drawer follow-ups pending verification. Inspected the current local history: no completed sessions are saved yet.

## 2026-10-11 — Scale the piano to 90% width

**Why:** The user wants the piano to dominate the viewport, not remain a fixed-size or short horizontal strip.

- **Introduction:** Both full and compact keyboards use 90vw and roughly 50dvh key height, resize with the window, and avoid fixed minimum widths.
- **Requirements:** Adds the responsive keyboard-width requirement.

## 2026-10-11 — Record completed verification

**Why:** Requirements must reflect exercised behavior rather than implementation intent, especially after the interface, reverse exercises, and persistence requirements changed.

- **Requirements:** Marks all sixteen requests done with named evidence: 15 unit tests, 7 browser tests, SQLite reopening/retry checks, inspected desktop/mobile/chart screenshots, and a live localhost:5173 smoke check. Records zero npm audit vulnerabilities.

## 2026-10-11 — Configurable keyboard exercises and persistent practice history

**Why:** Follow-up requests make wrong-answer termination optional, add full/compact keyboards, request SQLite progress tracking and reverse name-to-key exercises, and remove remaining non-game UI.

- **Introduction:** Specifies the End on wrong answer switch, 88-key/single-octave views, Name → keys exercises for all three phases, local SQLite history and Chart.js progress, and a header/guide-free game-only interface with plain Settings controls. Node is required for persistent history; the game retains raw CDN JavaScript. Save retries retain original completion times and all failed sessions, and the API rejects cross-origin/non-JSON writes to prevent history poisoning.
- **Requirements:** Records the keyboard/history/reverse/UI requests and clarifies the wrong-answer toggle.

## 2026-10-11 — Private-practice UI and sudden-death answers

**Why:** The user wants only the game, with no marketing content, and wants incorrect answers to end the session.

- **Introduction:** Removes branding, hero/tagline/tip/footer/reference sections and decorative UI. Specifies literal gameplay copy and immediate session end for wrong or malformed answers; empty submissions remain ignored.
- **Requirements:** Records game-only presentation and wrong-answer termination.

## 2026-10-11 — Make the interface dark-only

**Why:** The user requests dark mode only. Verification also found an existing Vite preview tried to resolve raw browser imports as local npm packages, breaking that preview despite the static server working.

- **Introduction:** Establishes a fixed charcoal/violet theme without a theme toggle or OS preference switching. Piano keys retain their physical colors. Documents direct CDN imports for compatibility with the existing preview and the no-build static server.
- **Requirements:** Adds the dark-only requirement.

## 2026-10-11 — Extend the learning path and remove the app toolchain

**Why:** Follow-up requests add major chords, then inversions, and explicitly require raw JavaScript without a build system.

- **Introduction:** Specifies eight single notes, eight root-position major chords, then ongoing first/second inversions; each phase resets the shrinking countdown. Defines accepted chord answers and octave-fitted two-octave voicings so high inversions do not lose a visible key. Replaces the Vite/JSX setup with pinned React CDN imports and HTM, a static server, and plain Markdown documentation. Requires pausing during pending audio initialization to prevent unseen countdowns.
- **Requirements:** Records the three follow-up requests and updates the library/JavaScript requirements.

## 2026-10-11 — Establish the game contract before implementation

**Why:** The requested piano trainer needs explicit rules for note selection, answer spelling, timer progression, and repeat playback so the implementation is testable rather than ambiguous.

- **Introduction:** Defines the twelve-note pool, visual and ear-only modes, accepted accidentals, scoring, shortening countdown, configurable audio repeats, pause, and JavaScript/library choices.
- **Requirements:** Records the five user requirements as open pending verification.
