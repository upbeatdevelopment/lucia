---
title: Requirements
sidebar_position: 2
---

# Requirements

Append-only ledger. `done` requires named verification; `partial` means not fully exercised; `open` means accepted; `blocked` names a blocker; `declined` names a deliberate omission.

| # | Requirement | Status | Evidence / notes |
| --- | --- | --- | --- |
| 1 | React game with a random piano note including all naturals and sharps, answered by typing | done | src/game.test.js covers all 12 pitch classes; tests/game.spec.js plays typed rounds |
| 2 | Countdown gets progressively shorter | done | Original decrement delivered; superseded by full 8/4/2-second cycles in requirement 32 |
| 3 | Play immediately and every configurable X seconds | done | Browser test measures real Tone.js audio output, repeat interval, and mute/resume |
| 4 | Use pre-existing libraries | done | React, HTM, Tone.js, Tonal, Lucide, Chart.js load in real browser; Node SQLite exercised |
| 5 | Use JavaScript rather than TypeScript | done | Plain JS source; node --check passes; no .ts/.tsx app files |
| 6 | Introduce major chords in the second phase | done | Major triads follow notes; expanded into simple/complex parts and complete cycles by 30/32 |
| 7 | Introduce inversions in the third phase | done | Unit tests cover every root/voicing; later split into simple/complex first and second inversion parts (30) |
| 8 | No build system; raw JavaScript, Alpine or React CDN | done | node server.js serves working CDN React app at localhost:5173; no app build step |
| 9 | Dark mode only | done | Browser test forces OS light preference, asserts fixed dark scheme; desktop/mobile screenshots inspected |
| 10 | Remove all marketing; private game only | done | Browser asserts marketing copy absent; final desktop/mobile screenshots inspected |
| 11 | Wrong answers end the game | done | End on wrong answer switch, on by default; unit/browser tests verify instant loss, off retries, blank ignored |
| 12 | Full 88-key or single-octave keyboard mode | done | Unit/browser tests assert 88 total, 52 white/36 black, A0–C8; compact mode has 12 keys |
| 13 | SQLite history with progress over time | done | src/database.test.js verifies actual SQLite reopen/deduplication; browser tests verify chart, table, saved best, retry queue, timestamps/API validation |
| 14 | Inverse exercise: show note name, press key | done | Browser test plays all three phases in Name → keys mode; unit tests verify inversion voice ordering and octave equivalence |
| 15 | Remove Make it your own | done | Browser asserts old heading absent and Settings present |
| 16 | Remove header and How to play | done | Browser asserts no header/nav/footer or guide; requested Settings and result dialogs replace the removed guide |
| 17 | Show the correct note when an answer fails | done | Browser tests wrong answers, retries, ear mode, and timeouts; prominent answer/key screenshots inspected |
| 18 | Remember missed targets and bias future practice | done | src/practice.test.js verifies weighting/debt; src/adaptive-database.test.js verifies persisted attempts, order, deduplication, migration; browser tests saved and offline biases |
| 19 | Read history continuously and make bias a mode | done | Browser verifies SQLite-seeded Adaptive selection, Balanced selection, reload persistence, and failed-attempt reconciliation |
| 20 | Put all settings/etc in a drawer to minimize the game | done | Browser verifies hidden drawer, pause, Escape, locked controls; desktop/mobile drawer screenshots inspected |
| 21 | Piano scales to 90% width | done | Original sizing delivered; superseded by fullscreen requirement 24 |
| 22 | Piano takes much of the viewport | done | Browser measures >500px desktop and >400px mobile key heights; dominant keyboard screenshots inspected |
| 23 | Fix the weird/unstyled layout in the supplied screenshot | done | Exact localhost:5174 browser check passes: CSS MIME/rendering, bounded timer, visible controls; desktop/mobile screenshots inspected |
| 24 | Container fills the screen instead of 90% | done | Browser measures viewport-filling container and keyboard on desktop/mobile and live 5174 |
| 25 | Make stage progression subtle | done | Browser asserts no stage strip and inline label at ≤10px; screenshots inspected |
| 26 | Start with Ctrl+Enter or Start → | done | Mixed/hotkey browser test verifies initial/restart key shortcut and drawer guard |
| 27 | Sound on/off and Replay in drawer | done | Browser verifies no main Replay, unlocked paused Sound, actual audio replay/mute, and preserved countdown |
| 28 | Correct answer and correct/points summary in modal popup | done | Wrong/timeout/complete/retry browser cases and inspected learning-popup screenshots; no main results/score/error heading |
| 29 | New session belongs in the popup | done | Browser asserts main has no New session; popup restart and View result reopening exercised |
| 30 | Split chord complexity into multiple quiz parts | done | Unit checks all seven part pools and transitions; browser completes every part/cycle and tests inversion shapes |
| 31 | Both directions in the same quiz by default | done | Unit completes 342 Mixed questions covering each target/direction; browser checks default, alternation and actual saved direction |
| 32 | Full cycles at 8, then 4, then 2 seconds before advancing | done | Unit verifies all 21 cycles and final completion; browser finishes a 171-question single-direction quiz and saves Completed |
| 33 | Larger educational answer popup | done | Unit validates all-root/inversion tone roles and RH/LH fingerings; desktop/mobile diagrams/table screenshots inspected |
| 34 | Key-selection prompt is clear and centered | done | Browser measures centered Play target; unit tests actual full-view ascent and compact wrap; desktop/mobile screenshots inspected |
| 35 | Note-playing introduces octave | done | Unit checks all 88 matching keys, wrong/unplayable keys and octave feedback across cycle transitions; browser accepts C1/C♯7, saves actual keys, checks mobile feedback and teaches octave boundaries |
| 36 | Put octave numbers above the keyboard | done | Browser measures full-view octave 0–8 ranges against their keys on desktop/mobile, checks compact 4 and lesson 4–5; screenshots inspected |
| 37 | Horizontal timer above keyboard, going left to right | done | Browser checks bar position/width, left-anchored 25/50/75/100% fill, pause, reset, urgency and deadline; all 8/4/2 cycle ranges tested |
| 38 | Remove note/octave labels from game key faces | done | Browser asserts no game key labels before/after failure, retains accessible button names and popup note/finger labels; desktop/mobile screenshots inspected |
| 39 | Clear latest-times section and progress graph | done | Unit verifies timing capture, migration, validation, deduplication, 500-row query and filtered models; browser verifies pauses/retries/reload, actual chart datasets/filters, failures and desktop/mobile UI; live 5174 graph inspected |
| 40 | README with setup, controls and where to see progress | done | Expanded README covers setup, controls, progress, persistence and tests; relative links/npm commands checked and navigation verified in the live 5174 browser without writes |
| 41 | Publish source to upbeatdevelopment/lucia on GitHub | open | Existing github-upbeatdevelopment SSH alias authenticates as repository owner; configure origin for it, push main and compare remote/local commit IDs; private/generated files remain excluded |
| 42 | Stats belongs in its own drawer, separate from Settings | done | Browser checks separate contents, single open drawer, hotkey/control locks, Escape, pause timing and deadline/New session race; desktop/mobile live 5174 views inspected without writes |
| 43 | Always click notes and hear their sound regardless of game state | done | Real Tone meter verifies ready/hear/paused/popup/finished audio with quiz mute and open drawers; completion keys click without changing counts; delayed-audio test proves grading does not await sound |

## Verification

2026-10-12 separate Stats/free-play follow-up: **42 unit tests and 24 browser tests pass**; syntax checks, App/Progress language-server diagnostics and whitespace checks pass. Stats has its own visible button and scores/progress/history drawer; Settings retains configuration/Quiz sound/Replay. Uncovered keys play through non-modal drawers, and real audio levels were measured across game states with quiz sound off. Grade-only-when-running and delayed-audio isolation are covered. Review identified a deadline/drawer overlap: New session now dismisses the drawer before starting, with a dedicated regression test. Desktop/mobile live **localhost:5174** views were inspected in a separate readonly browser with no history writes.

2026-10-12 response-time progress: **42 unit tests and 20 browser tests pass**; syntax checks, Progress language-server diagnostics and readonly live **localhost:5174** layout check pass. Graph datasets exclude failures, separate directions and respect phase filters; hidden-tab, popup and drawer pauses are excluded, and failed-save retries preserve timing/timestamps. Inspected populated desktop/mobile graphs and latest-times tables. Restarted preview backends for timing persistence/migration; verified every original **10 session / 50 attempt** ID remains. New live timings are being saved, and the actual live graph was inspected in a separate browser with no history writes.

2026-10-11 keyboard indicators: **33 unit tests and 15 browser tests pass**; syntax checks and the readonly live **localhost:5174** layout check pass. Inspected desktop/mobile full keyboards, compact octave 4, half-filled horizontal timer and the mobile fingering popup. Keys retain their half-viewport height. The history test identifies its saved session rather than assuming it has the newest timestamp, since timer tests advance a separate browser clock.

2026-10-11 octave follow-up: **33 unit tests and 13 browser tests pass**; syntax checks pass. Desktop/mobile actual-key feedback and the octave lesson were visually inspected. Readonly live **localhost:5174** CSS/layout check passes; the browser imports the served game module and confirms Play A accepts A0/A3/A7 and reports A3 as octave 3, with no history writes. Personal history remains **4 sessions / 33 attempts**; draining the user's in-memory retry queue is still unconfirmed.

2026-10-11 fullscreen/cycle follow-ups: **30 unit tests, 12 browser tests pass; audit 0 vulnerabilities**. Browser checks every quiz part and timer cycle, Mixed defaults/directions, hotkey, pausing learning popup, actual audio in the drawer, failed-write reason/retry, and SQLite completion/history. Separate readonly live **localhost:5174** fullscreen/CSS test passes. Desktop/mobile chord-shape, fingering, centered prompt, drawer and chart screenshots inspected. Restarted stale API backends; Mixed/completed validation returns 201 on an existing ID without altering the user's **4 sessions / 33 attempts**. User still needs to retry their queued writes before refreshing. Octave-4 behavior was provisional at this checkpoint; the octave follow-up above supersedes it.

2026-10-11 follow-ups: `npm test` — **25 passed**; `npm run test:e2e` — **11 passed**; `npm audit` — **0 vulnerabilities**. Live localhost:5173: **1296px piano width at 1440px viewport (90%), 525px key height, 88 keys, functioning drawer, Adaptive default, no page errors, complete history API**. Desktop/mobile keyboard and drawer, correct-answer reveal, adaptive priorities, mistakes, and history-chart screenshots inspected. Test attempts were saved only in the isolated test database, not personal history.

2026-10-11: `npm test` — **15 passed**. `npm run test:e2e` — **7 passed** against an isolated SQLite database. `npm audit` — **0 vulnerabilities**. Final localhost:5173 browser check: **88 keys, no header, dark scheme, no page errors, working history API**. Screenshots reviewed for desktop, mobile, reverse mode, inversions, and the rendered history chart.
