import { expect, it } from 'vitest';
import { get } from '@tonaljs/note';
import { CYCLE_SECONDS, DEFAULT_SETTINGS, INITIAL_GAME, NOTES, QUIZ_PARTS, buildCycle, gameReducer, isCorrect, isCorrectKeys, keyboardKeys, lessonFor, parseAnswer, pickNote, targetLabel, voicing } from './game.js';

const start = (settings = {}, practice = {}) => gameReducer(INITIAL_GAME, { type: 'start', settings: { mix: 'balanced', direction: 'hear', ...settings }, practice, random: () => 0 });
const correct = (state) => gameReducer(state, { type: 'answer', answer: state.target, keys: state.exercise === 'keys' ? voicing(state.target, state.stage, state.inversion) : undefined, remaining: state.duration, random: () => 0 });

it('covers all pitch classes without immediate repeats when alternatives exist', () => {
  expect(new Set(NOTES.map((note) => get(note).chroma)).size).toBe(12);
  expect(NOTES.map((_, index) => pickNote(undefined, () => (index + 0.1) / 12))).toEqual(NOTES);
  for (const previous of NOTES) for (let index = 0; index < 11; index++) expect(pickNote(previous, () => (index + 0.1) / 11)).not.toBe(previous);
});
it('parses accidentals/enharmonics but rejects malformed note answers', () => {
  for (const answer of [' c# ', 'c♯', 'Db', 'd♭', 'DB']) expect(isCorrect(answer, 'C#')).toBe(true);
  expect(isCorrect('Cb', 'B')).toBe(true); expect(isCorrect('E#', 'F')).toBe(true);
  for (const answer of ['', 'H', 'C4', 'C##', 'C major', 'C D', 'sharp']) expect(parseAnswer(answer)).toBeNull();
});
it('accepts major names, not minor/seventh names', () => {
  for (const answer of ['C', 'C major', 'cMAJOR', 'Cmaj', 'CM', 'C M']) expect(isCorrect(answer, 'C', 'chords')).toBe(true);
  expect(isCorrect('d♭ major', 'C#', 'inversions')).toBe(true);
  for (const answer of ['Cm', 'C minor', 'Cmin', 'C7', 'Cmaj7', 'C4']) expect(parseAnswer(answer, 'chords')).toBeNull();
});
it('defaults to both directions and fixed 8/4/2 timings', () => {
  expect(DEFAULT_SETTINGS.direction).toBe('mixed'); expect(CYCLE_SECONDS).toEqual([8, 4, 2]);
  expect(gameReducer(INITIAL_GAME, { type: 'start', settings: { startSeconds: 15 } }).duration).toBe(8);
});
it('completes every part, root and direction at 8 then 4 then 2 before advancing', () => {
  let state = start({ direction: 'mixed' });
  let total = 0;
  for (let part = 0; part < QUIZ_PARTS.length; part++) {
    for (let speed = 0; speed < 3; speed++) {
      const seen = new Set();
      const level = QUIZ_PARTS[part];
      for (let index = 0; index < level.roots.length * 2; index++) {
        expect(state).toMatchObject({ phase: 'running', part, speedIndex: speed, stage: level.stage, inversion: level.inversion, duration: CYCLE_SECONDS[speed] });
        expect(state.exercise).toBe(total % 2 ? 'keys' : 'hear');
        const key = `${state.target}:${state.exercise}`;
        expect(seen.has(key)).toBe(false); seen.add(key);
        state = correct(state); total++;
      }
      expect(seen).toEqual(new Set(level.roots.flatMap((root) => [`${root}:hear`, `${root}:keys`])));
    }
  }
  expect(total).toBe(342);
  expect(state).toMatchObject({ phase: 'over', endReason: 'complete', round: 343, attemptCount: 342 });
  expect(state.lastAttempt.result).toBe('correct');
});
it('single-direction quizzes cover each root once per cycle', () => {
  for (const direction of ['hear', 'keys']) {
    let state = start({ direction });
    for (let index = 0; index < 171; index++) { expect(state.exercise).toBe(direction); state = correct(state); }
    expect(state).toMatchObject({ phase: 'over', endReason: 'complete', round: 172 });
  }
});
it('simple major/inversion pools use only white-key C/F/G shapes', () => {
  for (const part of [1, 3, 5]) {
    expect(QUIZ_PARTS[part].roots).toEqual(['C', 'F', 'G']);
    for (const root of QUIZ_PARTS[part].roots) expect(voicing(root, QUIZ_PARTS[part].stage, QUIZ_PARTS[part].inversion).every((note) => !note.includes('#'))).toBe(true);
  }
});
it('adaptive cycles repeat weak roots without dropping other targets/directions', () => {
  const settings = { ...DEFAULT_SETTINGS, mix: 'adaptive' };
  const cycle = buildCycle(0, settings, { 'notes:C': 1 });
  expect(cycle.filter((item) => item.root === 'C')).toHaveLength(6);
  for (const root of NOTES) for (const direction of ['hear', 'keys']) expect(cycle.some((item) => item.root === root && item.direction === direction)).toBe(true);
  let state = start(settings, { 'notes:C': 1 });
  let cCorrect = 0;
  while (state.speedIndex === 0) { if (state.target === 'C') cCorrect++; state = correct(state); }
  expect(cCorrect).toBe(4); expect(state.practice['notes:C']).toBe(0);
});
it('new retry mistakes add current-cycle adaptive extras and preserve the failed prompt', () => {
  const state = start({ mix: 'adaptive', direction: 'mixed', endOnWrong: false });
  const next = gameReducer(state, { type: 'answer', answer: 'H', remaining: 3 });
  expect(next).toMatchObject({ phase: 'running', round: 1, target: 'C', exercise: 'hear', score: 0 });
  expect(next.cycleRemaining.filter((item) => item.root === 'C')).toHaveLength(6);
  expect(next.lastAttempt).toMatchObject({ result: 'wrong', direction: 'hear' });
});
it('records active response seconds, excludes pauses and keeps cumulative retry time', () => {
  let state = start({ endOnWrong: false });
  state = gameReducer(state, { type: 'answer', answer: 'H', remaining: 6 });
  expect(state.lastAttempt).toMatchObject({ responseSeconds: 2, durationSeconds: 8 });
  state = gameReducer(state, { type: 'pause', remaining: 6 });
  state = gameReducer(state, { type: 'resume' });
  state = gameReducer(state, { type: 'answer', answer: state.target, remaining: 4, random: () => 0 });
  expect(state.lastAttempt).toMatchObject({ responseSeconds: 4, durationSeconds: 8 });
  expect(state.remaining).toBe(8);
  const next = gameReducer(state, { type: 'answer', answer: state.target, remaining: 6.7654 });
  expect(next.lastAttempt.responseSeconds).toBe(1.235);
});
it('records full limit at every timeout path and the old limit across cycle changes', () => {
  const state = start();
  for (const type of ['tick', 'answer', 'pause']) {
    expect(gameReducer(state, { type, answer: state.target, remaining: -0.01 }).lastAttempt).toMatchObject({ responseSeconds: 8, durationSeconds: 8, result: 'timeout' });
  }
  let last = state;
  while (last.cycleRemaining.length > 1) last = correct(last);
  const next = gameReducer(last, { type: 'answer', answer: last.target, remaining: 7 });
  expect(next.duration).toBe(4);
  expect(next.lastAttempt).toMatchObject({ responseSeconds: 1, durationSeconds: 8 });
});
it('records the actual direction, not mixed', () => {
  let state = start({ direction: 'mixed' });
  state = correct(state); expect(state.lastAttempt.direction).toBe('hear');
  state = correct(state); expect(state.lastAttempt.direction).toBe('keys');
});
it('wrong answers end by default, blanks do nothing, wrong retries keep the cycle', () => {
  const state = start();
  expect(gameReducer(state, { type: 'answer', answer: 'H', remaining: 2 })).toMatchObject({ phase: 'over', endReason: 'wrong', score: 0 });
  expect(gameReducer(state, { type: 'answer', answer: ' ', remaining: 2 })).toBe(state);
  const retry = { ...state, settings: { ...state.settings, endOnWrong: false } };
  expect(gameReducer(retry, { type: 'answer', answer: 'H', remaining: 2 })).toMatchObject({ phase: 'running', cycleRemaining: state.cycleRemaining, feedback: { type: 'wrong' } });
});
it('deadline submissions time out and never earn points', () => {
  const state = start();
  for (const remaining of [0, -0.01]) expect(gameReducer(state, { type: 'answer', answer: state.target, remaining })).toMatchObject({ phase: 'over', endReason: 'timeout', score: 0 });
});
it('pauses without losing time and ignores stale actions', () => {
  const paused = gameReducer(start(), { type: 'pause', remaining: 4.2 });
  expect(gameReducer(paused, { type: 'tick', remaining: 0 })).toBe(paused);
  expect(gameReducer(paused, { type: 'answer', answer: paused.target, remaining: 3 })).toBe(paused);
  expect(gameReducer(paused, { type: 'resume' })).toMatchObject({ phase: 'running', remaining: 4.2 });
  expect(gameReducer(start(), { type: 'pause', remaining: 0 }).endReason).toBe('timeout');
});
it('voices every root/inversion with correct intervals in the lesson range', () => {
  for (const root of NOTES) for (const inversion of [0, 1, 2]) {
    const notes = voicing(root, inversion ? 'inversions' : 'chords', inversion);
    const midi = notes.map((note) => get(note).midi);
    expect(midi).toEqual([...midi].sort((a, b) => a - b));
    expect(midi.every((value) => value >= 60 && value <= 83)).toBe(true);
    expect(midi.map((value) => (value % 12 - get(root).chroma + 12) % 12).sort((a, b) => a - b)).toEqual([0, 4, 7]);
  }
});
it('provides full, compact and educational keyboards', () => {
  const full = keyboardKeys(); expect(full).toHaveLength(88); expect(full[0]).toBe('A0'); expect(full.at(-1)).toBe('C8');
  expect(full.filter((key) => !key.includes('#'))).toHaveLength(52);
  expect(keyboardKeys('single')).toHaveLength(12); expect(keyboardKeys('lesson')).toHaveLength(24);
});
it('accepts every matching piano register but rejects wrong or unplayable notes', () => {
  for (const note of keyboardKeys()) {
    const root = note.replace(/\d+$/, '');
    expect(isCorrectKeys([note], root, 'notes', 0, 'full')).toBe(true);
    expect(isCorrectKeys([note], root === 'C' ? 'D' : 'C', 'notes', 0, 'full')).toBe(false);
  }
  for (const [note, root] of [['C', 'C'], ['H4', 'C'], ['A-1', 'A'], ['A8', 'A'], ['C9', 'C']]) expect(isCorrectKeys([note], root, 'notes', 0)).toBe(false);
  expect(isCorrectKeys([], 'C', 'notes', 0)).toBe(false);
  expect(isCorrectKeys(['C4', 'C5'], 'C', 'notes', 0)).toBe(false);
});
it('reports the clicked note/octave and persists its actual key', () => {
  const state = start({ direction: 'keys' });
  expect(targetLabel(state)).toBe('C');
  for (const note of ['C1', 'C4', 'C8']) {
    const next = gameReducer(state, { type: 'answer', keys: [note], remaining: 8, random: () => 0 });
    expect(next.phase).toBe('running');
    expect(next.lastAttempt).toMatchObject({ answer: note, direction: 'keys', result: 'correct' });
    expect(next.feedback.text).toBe(`You played ${note} — octave ${note.at(-1)}`);
  }
});
it('preserves octave feedback at a cycle transition', () => {
  let state = start({ direction: 'keys' });
  while (state.cycleRemaining.length > 1) state = correct(state);
  const note = `${state.target}5`;
  const next = gameReducer(state, { type: 'answer', keys: [note], remaining: 8, random: () => 0 });
  expect(next.speedIndex).toBe(1);
  expect(next.feedback.text).toContain('octave 5');
  expect(next.feedback.text).toContain('4s cycle');
});
it('validates full-view ascending chord voices', () => {
  expect(isCorrectKeys(['E4', 'G4', 'C4'], 'C', 'inversions', 1)).toBe(true);
  expect(isCorrectKeys(['E4', 'G4', 'C4'], 'C', 'inversions', 1, 'full')).toBe(false);
  expect(isCorrectKeys(['E5', 'G5', 'C6'], 'C', 'inversions', 1, 'full')).toBe(true);
  expect(isCorrectKeys(['C6', 'E4', 'G3'], 'C', 'chords', 0, 'full')).toBe(false);
});
it('teaches tone roles, inversion bass, both-hand fingerings and enharmonic spellings', () => {
  for (const root of NOTES) for (const inversion of [0, 1, 2]) {
    const lesson = lessonFor({ target: root, stage: inversion ? 'inversions' : 'chords', inversion });
    expect(lesson.voices.map((voice) => voice.role)).toEqual(inversion === 1 ? ['third', 'fifth', 'root'] : inversion === 2 ? ['fifth', 'root', 'third'] : ['root', 'third', 'fifth']);
    expect(lesson.voices.map((voice) => voice.right)).toEqual(inversion === 1 ? [1, 2, 5] : [1, 3, 5]);
    expect(lesson.voices.map((voice) => voice.left)).toEqual(inversion === 2 ? [5, 2, 1] : [5, 3, 1]);
  }
  expect(lessonFor({ target: 'C#', stage: 'chords', inversion: 0 }).voices[1].name).toBe('E♯ (F)');
  expect(lessonFor({ target: 'A#', stage: 'notes', exercise: 'keys' }).explanation).toContain('B♭');
  const noteLesson = lessonFor({ target: 'A#', stage: 'notes', exercise: 'keys' }).explanation;
  expect(noteLesson).toContain('Any A♯');
  expect(noteLesson).toContain('C3–B3');
  expect(noteLesson).not.toContain('Match octave 4');
});
it('starts paused when requested and restarting resets every part/cycle', () => {
  expect(gameReducer(INITIAL_GAME, { type: 'start', paused: true }).phase).toBe('paused');
  const ended = gameReducer({ ...start(), stage: 'inversions', inversion: 2 }, { type: 'tick', remaining: 0 });
  expect(targetLabel(ended)).toBe('C major, second inversion');
  expect(gameReducer(ended, { type: 'start' })).toMatchObject({ part: 0, speedIndex: 0, stage: 'notes', inversion: 0, round: 1, duration: 8, score: 0 });
});
