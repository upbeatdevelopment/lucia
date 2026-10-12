---
title: Piano trainer
slug: /
sidebar_position: 1
---

# Piano trainer

A private JavaScript React piano-training game. These docs are the source of truth; discrepancies in code are defects.

## Game rules

The twelve pitch classes are C, C♯, D, D♯, E, F, F♯, G, G♯, A, A♯, and B. Roots are selected from the current part's unfinished cycle targets, uniformly in Balanced mode or with history-based weights/repetitions in Adaptive mode. Immediate repeats are avoided whenever another eligible target remains.

1. **Single notes:** all twelve roots.
2. **Major — simple:** root-position C, F, or G major triads (white keys only).
3. **Major — more complex:** root-position major triads across all twelve roots, introducing black keys.
4. **First inversions — simple:** first-inversion C, F, or G major triads.
5. **First inversions — more complex:** first-inversion major triads across all twelve roots.
6. **Second inversions — simple:** C, F, or G major triads in second inversion.
7. **Second inversions — more complex:** second-inversion major triads across all twelve roots.

Each part completes three full cycles: **8 seconds**, then **4**, then **2** per question, before advancing. Every eligible target must be answered correctly in each enabled direction during each cycle. Balanced covers each once; Adaptive schedules up to nine copies per direction for weak roots at a time, while still covering every target. Wrong retries do not consume a target and add adaptive repetitions to the current cycle. Queued adaptive extras are removed once debt clears, but any unanswered direction is still completed. The quiz finishes after the final second-inversion cycle. Fixed cycles replace the shrinking timer and configurable starting duration. A correct answer earns 100 points plus ten points per remaining second, rounded up. Running out of time ends the session and reveals the answer, including the inversion.

**End on wrong answer** is a switch, on by default. When on, a wrong or malformed nonempty answer ends the session immediately. When off, it opens the learning popup and permits retries after dismissal; the clock pauses while the popup is open. Empty submissions do nothing. After a wrong answer or timeout, a larger educational modal names the correct note/chord/inversion and shows correct-count/points together. A labelled one/two-octave keyboard illustrates the actual shape. For chords it distinguishes root, third and fifth, explains major intervals and bass/voice order, and shows how the inversion moves the notes. The keyboard labels suggested right-hand fingers; a voice-ordered table gives both right/left hands. Numbers 1–5 mean thumb through little finger, with a reminder to adjust uncomfortable fingerings. For single notes it explains the key's location, enharmonic name, and how octave numbers change at C. Failure messaging appears only in the popup, not again in the main heading. The matching piano keys are highlighted behind the popup, including in ear-only and reverse modes. Retry rounds pause while the popup is open; Continue or Escape resumes the remaining countdown. Finished sessions offer New session → only in the popup. Dismissing it leaves a View result button to reopen the result; Ctrl+Enter can still restart. Escape/close dismisses a finished-session popup without starting another game.

## Directions and keyboard views

**Mixed** is the default exercise. It alternates typed identification with name-to-keys, so a single quiz uses both directions. It alternates while both directions have unfinished targets. Each cycle covers every target in both directions; single-direction modes remain selectable. Individual saved attempts retain the actual direction, not “mixed.”

**Hear → name** plays a note or chord. Type the name and press Enter. Sharps/flats and ASCII/musical accidentals are accepted case-insensitively (`C#`, `c♯`, `Db`). Chords accept a root alone or a major suffix (`C`, `C major`, `Cmaj`, `CM`); minor/seventh names are rejected. Octave numbers are not part of typed answers. Choose See + hear for highlighted keys or Ear training to hide the target.

**Name → keys** displays a large centered **Play [target]** prompt above the piano, with click instructions directly beneath and no highlighted answer. Single-note prompts ask for the pitch class (for example Play A♯); any matching key on the displayed keyboard is correct. After clicking, feedback identifies the actual key and octave, for example You played A♯5 — octave 5. An octave-number guide sits above the keys, aligned to each octave's white-key range. The full keyboard shows 0–8, including its partial end octaves; compact view shows 4 and the two-octave lesson shows 4–5. Octave numbers change at C. Game key faces have no note or octave text; the learning popup retains note/fingering labels. Compact view offers octave 4 only. Click/tap a key for a single note. For chords/inversions, click three notes **in voice order, lowest to highest**. The first selected pitch class must be the bass of the requested inversion. The third click automatically submits the chord. For chords, any octave transposition is accepted. On the full keyboard, chord keys must ascend in actual pitch so the requested bass is truly lowest. Compact view accepts the prescribed pitch-class order even when it wraps left. Incorrect selections clear for a retry when sudden death is off. Undo removes the latest partial chord selection.

The **Keyboard** control selects **Full 88 keys** (default, A0–C8) or **Single octave** (C4–B4). The full view shows actual voiced pitches. Both keyboard views fill the available width of the fullscreen game container, with keys about half the viewport height (240–600px bounds), making the piano the dominant part of the game view and resizing with the window; the full view fits all 88 keys rather than imposing a fixed minimum width. Single-octave view highlights each chord pitch class once, regardless of its actual octave. In reverse mode, select voices in the requested order even when the next pitch class wraps to the left of the previous one.

Targets use C4–B4 for notes. Major triads play root, major third, and perfect fifth together. First inversion moves the root up one octave; second inversion moves root and third up. High second inversions shift the whole voicing down an octave to fit C4–B5. Tone.js generates piano-like tones locally; no remote sample files are needed.

## Adaptive practice

**Practice mix** selects **Adaptive** (default) or **Balanced**. The choice persists across browser reloads. Adaptive reloads saved SQLite attempt history before every new session and retries queued history writes before loading, uses the bias on every round and across sessions, and also learns immediately from the current session. Balanced selects roots uniformly but still loads and records learning history for future adaptive practice. Queued failed attempts are merged with the full saved history for their targets in completion/sequence order, rather than replacing existing debt with an incomplete local baseline.

Each target has independent practice debt per phase (single notes, major chords, inversions), shared across exercise directions and related simple/more-complex parts. Basic parts limit selection to C/F/G without deleting debt for other roots; the more-complex parts reintroduce all twelve roots. A wrong answer or timeout adds 1 debt; a correct answer removes 0.25, down to zero. Selection weight is `1 + 2 × min(debt, 4)`: one miss gives 3× weight, capped at 9× so every other note stays in the mix. Four subsequent successes are needed to clear one miss. No time-based decay erases the bias. Immediate repeats are avoided whenever another target remains in the selected direction. Correct answers lower debt for the answered target, not the next root.

History lists practice priorities with lifetime misses/successes and current weight, plus recent mistakes with the requested target and submitted answer. Old session summaries do not contain target names and cannot be used to reconstruct past note-specific mistakes. New individual attempts provide that evidence. Unfinished sessions still contribute any recorded attempts.

## Controls

Start a session with **Start →** or **Ctrl+Enter**; after failure the same shortcut starts a new session. The shortcut does not interrupt running/paused play and is inactive while the drawer is open or initialization is in progress.

The Settings button opens a right-side drawer containing all configuration, sound on/off, Replay, best-score statistics, and history. Sound and Replay remain usable while paused. Replay plays the current target once while paused or after failure, without resuming gameplay or resetting the countdown. The controls set practice mix, direction, highlighted/ear-only practice, keyboard view, replay interval (0.5–5 seconds), and End on wrong answer. They lock during a running or paused session. Opening the drawer pauses the game; closing it leaves the game paused until Resume. Escape and the close button dismiss the drawer.

Sound plays immediately and repeats at the selected interval (default two seconds). Replay does not reset the countdown. Muting does not pause the countdown. Pause stops both timer and automatic replay; resume restores remaining time. Opening the settings/history drawer or switching away from the page pauses the session. If this occurs during audio initialization, the session starts paused.

## History

The Node server stores completed sessions, individual attempts, and per-target practice statistics in SQLite at `data/history.sqlite`, using Node's built-in `node:sqlite`. Each session and attempt has a unique ID so retries do not create duplicates or increase bias twice. Attempts retain their session sequence so equal timestamps and out-of-order retries are learned in original answer order. Mixed sessions are stored as Mixed; individual attempts store the actual hear/key direction. Individual attempts record target root, phase, inversion, exercise direction, answer/key sequence, correct/wrong/timeout result, timestamp, active response seconds and question time limit. Response time is the question's time limit minus its remaining time at submission, rounded to milliseconds: pauses, hidden tabs, drawer and learning-popup pauses do not count; retry submissions include active time spent on earlier tries of that same question. Timeouts record the full time limit. The saved attempt retains the original question's limit even when the next question changes cycle speed. Old attempts and queued legacy writes remain valid with unknown (null) timings; no response times are inferred from old scores. Existing session databases are migrated without deleting their history. Completion time is captured when the game ends and retained unchanged across save retries. History records completion time, score, correct-answer count, phase reached, ending reason, direction, keyboard view, starting timer, replay interval, wrong-answer setting, and practice-mix mode. Wrong-answer, timeout, and full-quiz completion endings are recorded; an unfinished session is not.

To find progress, click the **sliders icon at the bottom-right** (Settings), then scroll below the session configuration to **Progress**. This section is available whenever Settings opens, without first opening History. It shows recent average correct-response times separately for Hear → name and Name → keys, a Chart.js speed graph (lower seconds is faster), and the ten latest timed attempts with target, exercise, response seconds, time limit and correct/wrong/timeout outcome. Filters select notes, major chords, first inversions or second inversions and either/both exercise directions. The graph plots up to 100 recent correct responses, with separate lines for the two directions; mistakes/timeouts remain visible in the latest-times table rather than masquerading as speed improvements. The API returns the latest 500 timed attempts independently of the ordinary recent-attempt list. Data survives reloads; unfinished sessions contribute their saved attempts. Empty or legacy-only history explains that timing starts with new practice. Request or chart failures are explicit; readable summaries/tables remain available if the graph cannot load.

History shows a Chart.js line chart of correct answers over completed sessions and a recent-session table with timestamps, score, correct answers, phase, direction, and ending reason. Data survives browser/server restarts. History-save failures show the HTTP/server reason when available and do not block gameplay. Restart the backend after changing API validation; static file updates alone do not reload the running Node process. Retry queued entries before refreshing, because the queue is in memory. Failed session/attempt writes remain in an in-memory retry queue across subsequent sessions; Retry saves attempts every queued entry. The API validates session fields, accepts only JSON writes, and rejects cross-origin browser submissions. History shows up to the most recent 500 sessions, oldest to newest in the chart and newest first in the table. No accounts or cloud storage are used.

## Appearance

Dark-only, game-only. There are no logos, hero/tagline sections, promotional text, tips, reference-note tiles, decorative statistics, or marketing footers. The controls heading is **Settings**, not “Make it your own.” There is no page header, branding, navigation, or How to play button/dialog. The game container fills the viewport edge-to-edge, with no outer gutters or 90% width restriction. The main game contains only piano, answer input/prompt, countdown, and small game controls. Current score/correct count are in the drawer and the failure popup, not the main view. Stage progress is a small muted inline label beside the round information, not a separate strip of cards or tabs. All settings, best-score statistics, and history are hidden in the drawer until requested. Only pause/resume and the settings button remain in the main game's small control row; sound and Replay are in the drawer, not a page header. The theme never follows OS light preferences and has no light-mode toggle. Physical white/black piano keys remain recognizable, with violet selection highlights. The initial page loads the game stylesheet as CSS on whichever server port is used. The countdown is a full-width horizontal bar directly above the octave guide and keyboard, not a circle in the heading. Its fill advances from left to right as elapsed time increases, from empty at the start to full at the deadline. A small remaining-seconds readout stays on the bar; urgent colour appears below 2.5 seconds. Pause, drawer and learning-popup pauses freeze it, and each correct answer resets it for the next question. The bar is accessible as a progress indicator with remaining time in its label. On shorter viewports, compact spacing keeps the ready/running game controls visible without changing the requested piano width or height.

## Development

Source repository target: [upbeatdevelopment/lucia](https://github.com/upbeatdevelopment/lucia). Version control includes source, tests and documentation, not local SQLite history, dependencies, environment files or generated output.

```bash
node server.js
# http://localhost:5173
# If occupied: PORT=4173 node server.js
# Existing browser preview: PORT=5174 node server.js
```

Requires Node 22.13+ (Node 24 recommended) for SQLite. No app build system, JSX transform, or bundling is required. Pinned React, React DOM, HTM, Tone.js, Tonal, Lucide, and Chart.js load from esm.sh. UI/audio modules use direct CDN URLs to work in existing previews, with an import map for CDN React dependencies and the shared Tonal logic. Initial load requires internet access.

A plain static server can run the game but cannot save/read SQLite history; use `node server.js` for the complete application.

```bash
npm install
npm test
npx playwright install chromium
npm run test:e2e
```

Test tooling is not an app build pipeline. Documentation is plain Markdown, with no documentation build step.
