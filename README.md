# Piano trainer

A private piano-training game for learning notes, major chords and inversions quickly. Plain JavaScript, React and a local SQLite database; dark-only and fullscreen, with no app build step.

## Getting started

Requires **Node.js 22.13+** (Node 24 recommended), npm and internet access for the browser's initial CDN library load.

```sh
npm install
npm start
```

Open **http://localhost:5173**. To use a different, unused port:

```sh
PORT=5175 npm start
```

The existing development preview is **http://localhost:5174**. `node server.js` also starts the application directly. Use the Node server rather than a static-only server: SQLite saving and progress require its API.

## Where to see your progress

1. Click **Stats** at the bottom-right, beside the Settings sliders icon.
2. **Progress** appears directly below your scores, with recent averages, a speed graph and **Latest times**.

Stats and Settings are separate drawers: Stats contains scores/progress/history; Settings contains configuration, sound and Replay.

The graph uses separate lines for **Hear → name** and **Name → keys**. Filter by notes, major chords, first inversions or second inversions, and by exercise direction. **Lower times mean faster correct responses.** The latest-times table also includes wrong answers and timeouts, with each question's time limit.

Response times measure active question time: pauses, either drawer, hidden tabs and learning popups do not count. Retry times include active time spent on earlier tries of the same question. Timing starts with new practice after this feature was added; older results are preserved without guessing their response times.

Click **History** below Progress in Stats for completed-session scores, the correct-answer graph, mistakes and adaptive priorities.

## Playing

Start with **Start →** or **Ctrl+Enter**. Mixed mode, enabled by default, alternates these exercises:

- **Hear → name:** listen and type the note or major chord; press Enter. Sharps, flats and enharmonic names work. Major chords accept `C`, `C major` or `Cmaj`; type the chord root, not the inversion's bass. Typed answers do not include octave numbers.
- **Name → keys:** click the requested note, or select three chord tones in **lowest-to-highest voice order**. Any matching single-note register is valid; feedback names the actual key and octave you chose. Full-view chord pitches must ascend. Compact view accepts the prescribed pitch-class order when it wraps left.

**Click any piano key to hear it**, before starting, during either exercise, while paused, after finishing or in the answer popup. Audio initializes on the first click. Manual clicks always sound—even with Quiz sound off—and do not reset the timer. Only main-keyboard clicks during a running Name → keys question are graded. Uncovered keys also remain playable while either drawer is open; quiz controls stay paused/locked until you close it.

The keyboard offers **Full 88 keys** or **Single octave**. Octave numbers are above the keys; game key faces are unlabelled. The horizontal timer above the keyboard fills from left to right as time runs out.

### Quiz progression

1. Single notes: all twelve pitch classes.
2. Simple major chords: C, F and G.
3. More-complex major chords: all twelve roots.
4. Simple first inversions: C, F and G.
5. More-complex first inversions: all twelve roots.
6. Simple second inversions: C, F and G.
7. More-complex second inversions: all twelve roots.

Complete every eligible target in each enabled direction at **8 seconds**, then **4**, then **2**, before advancing. Adaptive practice can add repetitions for weak targets. The final cycle completes the quiz.

Wrong answers and timeouts open an educational popup with the answer, chord shape, tone roles, intervals, inversion explanation and suggested right-/left-hand fingering. It also shows your correct-answer count and points. **New session** is in the finished-result popup; **View result** reopens a dismissed result.

## Controls and settings

- **Pause / Resume:** stops and restores the timer and automatic audio.
- **Settings:** opens configuration, Sound and Replay, and pauses play.
- **Stats:** opens scores, timing progress and history in a separate drawer. Closing either drawer leaves play paused until Resume.
- **Quiz sound and Replay:** inside Settings; controls automatic prompts and Replay, not manual key sounds. Replay works while paused without resetting the timer.
- **End on wrong answer:** on by default. Turn it off for retries after dismissing the learning popup; a timeout still ends the quiz.
- **Adaptive / Balanced:** Adaptive prioritises saved mistakes; Balanced covers roots without extra adaptive repetitions. The practice-mix choice survives reloads.

Each miss adds practice debt; four correct answers clear one miss. Selection bias is capped at 9×, and learning carries across sessions. Session configuration is locked during running/paused play; sound, replay and progress viewing remain available.

## Local data

Sessions, attempts, timings and adaptive learning are stored in **`data/history.sqlite`**, not in a cloud account. To use another database:

```sh
DB_PATH=/path/to/history.sqlite PORT=5175 npm start
```

Stop all servers using this database before copying the `data` directory for a backup. Keep any accompanying SQLite journal files together.

If a **Retry saves** warning appears, retry successfully **before refreshing or closing the page**: unsaved entries are held in memory. Retry IDs prevent duplicate records and preserve original timestamps and timings.

## Troubleshooting

- **Port already in use:** choose an unused port with `PORT=…`.
- **No sound:** check browser sound permissions; for automatic prompts, enable Quiz sound in Settings. Audio starts after a user interaction.
- **No timings yet:** play new questions; untimed older attempts cannot supply a speed graph.
- **History/API unavailable:** run `node server.js`, not a static file server. Restart the backend after server or database-validation changes; editing files does not reload Node automatically.
- **Changes not visible:** finish/retry pending saves before reloading the page.

## Development and tests

Libraries: React, HTM, Tone.js, Tonal, Lucide, Chart.js and Node's built-in SQLite. Browser modules load from pinned CDN URLs; there is no JSX transform, bundling or app build step. `vite.config.js` is only an optional legacy API proxy, not a runtime requirement.

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Browser tests use an isolated server on port 4180 and a separate SQLite database. Set `CHROME_PATH` to use a system Chrome executable if needed. Do not run write-producing tests against your personal preview/history.

## Specification

Documentation is the source of truth:

- [Game behavior](docs/docs/intro.md)
- [Requirements and verification](docs/docs/requirements.md)
- [Changelog and reasons](docs/docs/changelog.md)
