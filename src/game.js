import { get, transpose } from '@tonaljs/note';
import { NOTES, learn, pickRoot, practiceKey, practiceWeight } from './practice.js';
export { NOTES } from './practice.js';
export const CYCLE_SECONDS = [8, 4, 2];
const BASIC_ROOTS = ['C', 'F', 'G'];
export const QUIZ_PARTS = [
  { title: 'Single notes', stage: 'notes', roots: NOTES, inversion: 0 },
  { title: 'Major (simple)', stage: 'chords', roots: BASIC_ROOTS, inversion: 0 },
  { title: 'Major (more complex)', stage: 'chords', roots: NOTES, inversion: 0 },
  { title: 'First inversion (simple)', stage: 'inversions', roots: BASIC_ROOTS, inversion: 1 },
  { title: 'First inversion (more complex)', stage: 'inversions', roots: NOTES, inversion: 1 },
  { title: 'Second inversion (simple)', stage: 'inversions', roots: BASIC_ROOTS, inversion: 2 },
  { title: 'Second inversion (more complex)', stage: 'inversions', roots: NOTES, inversion: 2 },
];
export const DEFAULT_SETTINGS = { mix: 'adaptive', direction: 'mixed', keyboard: 'full', mode: 'visual', startSeconds: 8, repeatSeconds: 2, endOnWrong: true };

export function pickNote(previous, random = Math.random) {
  return pickRoot(previous, 'notes', {}, 'balanced', random);
}
export function parseAnswer(input, stage = 'notes') {
  let normalized = input.trim().replaceAll('♯', '#').replaceAll('♭', 'b');
  if (stage !== 'notes') {
    const match = normalized.match(/^([a-g](?:#|b)?)(.*)$/i);
    if (!match) return null;
    const suffix = match[2].trim();
    if (suffix && suffix !== 'M' && !['major', 'maj'].includes(suffix.toLowerCase())) return null;
    normalized = match[1];
  }
  if (!/^[a-g](?:#|b)?$/i.test(normalized)) return null;
  const note = get(normalized[0].toUpperCase() + normalized.slice(1).toLowerCase());
  return note.empty ? null : note.chroma;
}
export function isCorrect(input, target, stage = 'notes') { return parseAnswer(input, stage) === get(target).chroma; }
export function displayNote(note) { return note.replaceAll('#', '♯'); }
export function voicing(target, stage = 'notes', inversion = 0) {
  const root = `${target}${inversion === 2 && get(target).chroma >= 8 ? 3 : 4}`;
  if (stage === 'notes') return [root];
  const notes = [root, transpose(root, '3M'), transpose(root, '5P')];
  for (let index = 0; index < inversion; index++) notes.push(transpose(notes.shift(), '8P'));
  return notes.map((note) => {
    const midi = get(note).midi;
    return `${NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
}
export function targetLabel(state) {
  if (state.stage === 'notes') return displayNote(state.target);
  return `${displayNote(state.target)} major${state.inversion ? `, ${state.inversion === 1 ? 'first' : 'second'} inversion` : ''}`;
}
export function keyboardKeys(view = 'full') {
  return Array.from({ length: view === 'full' ? 88 : view === 'lesson' ? 24 : 12 }, (_, index) => {
    const midi = (view === 'full' ? 21 : 60) + index;
    return `${NOTES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
}
export function isCorrectKeys(keys, target, stage, inversion, view = 'single') {
  if (stage === 'notes') {
    if (keys.length !== 1) return false;
    const note = get(keys[0]);
    return note.midi >= 21 && note.midi <= 108 && note.chroma === get(target).chroma;
  }
  const expected = voicing(target, stage, inversion).map((note) => get(note).chroma);
  return keys.length === expected.length && keys.every((note, index) => get(note).chroma === expected[index])
    && (view !== 'full' || keys.every((note, index) => index === 0 || get(note).midi > get(keys[index - 1]).midi));
}
export function roundDirection(state, settings = state.settings) {
  return state.phase === 'ready' ? settings.direction === 'keys' ? 'keys' : 'hear' : state.exercise;
}
export function buildCycle(part, settings, practice) {
  const level = QUIZ_PARTS[part];
  const directions = settings.direction === 'mixed' ? ['hear', 'keys'] : [settings.direction];
  return level.roots.flatMap((root) => {
    const count = settings.mix === 'adaptive' ? Math.ceil(practiceWeight(practice[practiceKey(level.stage, root)])) : 1;
    return directions.flatMap((direction) => Array.from({ length: count }, () => ({ root, direction })));
  });
}
function choosePrompt(previous, remaining, stage, practice, settings, round, random) {
  const preferred = settings.direction === 'mixed' ? round % 2 ? 'hear' : 'keys' : settings.direction;
  const candidates = remaining.some((item) => item.direction === preferred) ? remaining.filter((item) => item.direction === preferred) : remaining;
  const roots = [...new Set(candidates.map((item) => item.root))];
  const target = pickRoot(previous, stage, practice, settings.mix, random, roots);
  return { target, exercise: candidates.find((item) => item.root === target).direction };
}
export const INITIAL_GAME = {
  phase: 'ready', part: 0, speedIndex: 0, stage: 'notes', stageRound: 1, inversion: 0,
  target: 'F#', exercise: 'hear', round: 1, score: 0, duration: 8, remaining: 8,
  feedback: null, settings: DEFAULT_SETTINGS, endReason: null, practice: {},
  cycleRemaining: [], cycleAnswered: [], attemptCount: 0, lastAttempt: null,
};
function recordAttempt(state, action, result) {
  return {
    ...state, attemptCount: state.attemptCount + 1,
    practice: learn(state.practice, state.stage, state.target, result),
    lastAttempt: { sequence: state.attemptCount + 1, target: state.target, stage: state.stage, inversion: state.inversion,
      direction: state.exercise, result, answer: action.keys ? action.keys.join(' → ') : action.answer || '', completedAt: action.completedAt || null,
      durationSeconds: state.duration, responseSeconds: Number(Math.max(0, Math.min(state.duration, state.duration - action.remaining)).toFixed(3)) },
  };
}
function timeout(state, action) { return { ...recordAttempt(state, action, 'timeout'), phase: 'over', remaining: 0, feedback: null, endReason: 'timeout' }; }
export function gameReducer(state, action) {
  switch (action.type) {
    case 'start': {
      const settings = { ...DEFAULT_SETTINGS, ...action.settings, startSeconds: 8 };
      const practice = action.practice || state.practice;
      const cycleRemaining = buildCycle(0, settings, practice);
      return { ...INITIAL_GAME, settings, practice, cycleRemaining, phase: action.paused ? 'paused' : 'running',
        ...choosePrompt(state.target, cycleRemaining, 'notes', practice, settings, 1, action.random) };
    }
    case 'tick': return state.phase !== 'running' ? state : action.remaining <= 0 ? timeout(state, action) : { ...state, remaining: action.remaining };
    case 'answer': {
      if (state.phase !== 'running') return state;
      if (action.remaining <= 0) return timeout(state, action);
      if (state.exercise === 'hear' && !action.answer?.trim()) return state;
      const correct = state.exercise === 'keys' ? isCorrectKeys(action.keys || [], state.target, state.stage, state.inversion, state.settings.keyboard) : isCorrect(action.answer, state.target, state.stage);
      const learned = recordAttempt(state, action, correct ? 'correct' : 'wrong');
      if (!correct) {
        if (state.settings.endOnWrong) return { ...learned, phase: 'over', remaining: action.remaining, feedback: null, endReason: 'wrong' };
        const cycleRemaining = [...state.cycleRemaining];
        if (state.settings.mix === 'adaptive') {
          const count = Math.ceil(practiceWeight(learned.practice[practiceKey(state.stage, state.target)]));
          for (const direction of state.settings.direction === 'mixed' ? ['hear', 'keys'] : [state.settings.direction]) {
            const pending = cycleRemaining.filter((item) => item.root === state.target && item.direction === direction).length;
            for (let index = pending; index < count; index++) cycleRemaining.push({ root: state.target, direction });
          }
        }
        return { ...learned, cycleRemaining, remaining: action.remaining, feedback: { type: 'wrong' } };
      }
      const answered = new Set([...state.cycleAnswered, `${state.target}:${state.exercise}`]);
      const consumed = state.cycleRemaining.findIndex((item) => item.root === state.target && item.direction === state.exercise);
      let cycleRemaining = state.cycleRemaining.filter((_, index) => index !== consumed);
      if (state.settings.mix === 'adaptive' && !learned.practice[practiceKey(state.stage, state.target)]) {
        const kept = new Set();
        cycleRemaining = cycleRemaining.filter((item) => {
          if (item.root !== state.target) return true;
          const key = `${item.root}:${item.direction}`;
          if (answered.has(key) || kept.has(key)) return false;
          kept.add(key); return true;
        });
      }
      let part = state.part, speedIndex = state.speedIndex;
      const cycleDone = cycleRemaining.length === 0;
      const score = state.score + 100 + Math.ceil(action.remaining * 10);
      const round = state.round + 1;
      if (cycleDone && speedIndex === 2 && part === QUIZ_PARTS.length - 1) {
        return { ...learned, phase: 'over', endReason: 'complete', round, score, cycleRemaining, cycleAnswered: [...answered], remaining: action.remaining, feedback: null };
      }
      if (cycleDone) {
        if (speedIndex < 2) speedIndex++;
        else { part++; speedIndex = 0; }
        cycleRemaining = buildCycle(part, state.settings, learned.practice);
      }
      const level = QUIZ_PARTS[part];
      const duration = CYCLE_SECONDS[speedIndex];
      return { ...learned, part, speedIndex, stage: level.stage, inversion: level.inversion, round, score, duration, remaining: duration,
        stageRound: cycleDone ? 1 : state.stageRound + 1, cycleRemaining, cycleAnswered: cycleDone ? [] : [...answered],
        ...choosePrompt(state.target, cycleRemaining, level.stage, learned.practice, state.settings, round, action.random),
        feedback: { type: 'correct', text: [
          state.stage === 'notes' && state.exercise === 'keys' ? `You played ${displayNote(action.keys[0])} — octave ${get(action.keys[0]).oct}` : '',
          cycleDone ? `${level.title} · ${duration}s cycle` : '',
        ].filter(Boolean).join(' · ') || 'Correct.' } };
    }
    case 'pause': return state.phase !== 'running' ? state : action.remaining <= 0 ? timeout(state, action) : { ...state, phase: 'paused', remaining: action.remaining };
    case 'resume': return state.phase === 'paused' ? { ...state, phase: 'running' } : state;
    case 'reset': return { ...INITIAL_GAME };
    default: return state;
  }
}

export function lessonFor(state) {
  const flatNames = { 'C#': 'D♭', 'D#': 'E♭', 'F#': 'G♭', 'G#': 'A♭', 'A#': 'B♭' };
  const locations = { C: 'just left of the two-black-key group', D: 'between the two black keys', E: 'just right of the two-black-key group', F: 'just left of the three-black-key group', G: 'between the first two keys in the three-black-key group', A: 'between the last two keys in the three-black-key group', B: 'just right of the three-black-key group' };
  if (state.stage === 'notes') {
    const sharp = state.target.includes('#');
    const index = NOTES.indexOf(state.target);
    const location = sharp ? `${displayNote(state.target)} is the black key between ${NOTES[index - 1]} and ${NOTES[index + 1]}. ${flatNames[state.target]} names the same key.` : `${state.target} is the white key ${locations[state.target]}.`;
    return { explanation: location + (state.exercise === 'keys' ? ` Any ${displayNote(state.target)} on the piano is valid. Octave numbers change at C: for example, C3–B3 is octave 3. After a correct click, the feedback names the octave you chose. This diagram shows octave 4.` : ''), voices: [], roles: {}, fingers: {} };
  }
  const canonical = voicing(state.target, 'chords');
  const names = [state.target, transpose(state.target, '3M'), transpose(state.target, '5P')];
  const roles = ['root', 'third', 'fifth'];
  const right = state.inversion === 1 ? [1, 2, 5] : [1, 3, 5];
  const left = state.inversion === 2 ? [5, 2, 1] : [5, 3, 1];
  const notes = voicing(state.target, state.stage, state.inversion);
  const voices = notes.map((note, index) => {
    const tone = canonical.findIndex((item) => get(item).chroma === get(note).chroma);
    const written = displayNote(names[tone]);
    const actual = displayNote(note.replace(/\d+$/, ''));
    return { note, role: roles[tone], name: written === actual ? written : `${written} (${actual})`, right: right[index], left: left[index] };
  });
  const explanation = state.inversion === 1 ? 'First inversion: move the root up an octave. The third is now the bass; the chord name stays the same.' : state.inversion === 2 ? 'Second inversion: move the root and third up an octave. The fifth is now the bass; the chord name stays the same.' : 'Root position: root → third → fifth, from lowest to highest. The root is the bass.';
  return { explanation, voices, roles: Object.fromEntries(voices.map((voice) => [voice.note.replace(/\d+$/, ''), voice.role])), fingers: Object.fromEntries(voices.map((voice) => [voice.note, voice.right])) };
}
