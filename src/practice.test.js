import { expect, it } from 'vitest';
import { learn, nextDebt, pickRoot, practiceWeight, reconcilePractice } from './practice.js';
import { INITIAL_GAME, gameReducer } from './game.js';

it('keeps every note in the mix, caps bias, and requires four successes per miss', () => {
  expect(practiceWeight(0)).toBe(1);
  expect(practiceWeight(1)).toBe(3);
  expect(practiceWeight(100)).toBe(9);
  let debt = nextDebt(0, 'wrong');
  for (let index = 0; index < 3; index++) debt = nextDebt(debt, 'correct');
  expect(debt).toBe(0.25);
  expect(nextDebt(debt, 'correct')).toBe(0);
  expect(nextDebt(0, 'correct')).toBe(0);
  expect(nextDebt(0, 'timeout')).toBe(1);
});

it('biases repeated samples toward weak targets but Balanced remains uniform', () => {
  const practice = { 'notes:C': 4 };
  let adaptive = 0, balanced = 0;
  const sampled = new Set();
  for (let index = 0; index < 10000; index++) {
    const random = () => (index + 0.5) / 10000;
    const root = pickRoot('B', 'notes', practice, 'adaptive', random);
    sampled.add(root);
    if (root === 'C') adaptive++;
    if (pickRoot('B', 'notes', practice, 'balanced', random) === 'C') balanced++;
    expect(root).not.toBe('B');
  }
  expect(sampled.size).toBe(11);
  expect(adaptive).toBeGreaterThan(4500);
  expect(adaptive).toBeLessThan(5000);
  expect(balanced).toBeGreaterThan(850);
  expect(balanced).toBeLessThan(950);
});

it('isolates learning by phase and does not mutate the saved map', () => {
  const saved = { 'notes:C': 1, 'chords:C': 2 };
  expect(learn(saved, 'notes', 'C', 'correct')).toEqual({ 'notes:C': 0.75, 'chords:C': 2 });
  expect(saved['notes:C']).toBe(1);
  expect(pickRoot('F#', 'notes', { 'notes:C': 4 }, 'adaptive', () => 0.1)).toBe('C');
  expect(pickRoot('F#', 'notes', { 'notes:C': 4 }, 'balanced', () => 0.1)).toBe('C#');
});

it('reconciles queued misses with persistent history without erasing debt or double-counting', () => {
  const completedAt = '2026-01-01T12:00:00.000Z';
  const history = Array.from({ length: 4 }, (_, index) => ({ id: `saved-${index}`, sessionId: 'session', completedAt, sequence: index + 1, stage: 'notes', target: 'C', result: 'wrong' }));
  const pending = { id: 'pending', sessionId: 'session', completedAt, sequence: 5, stage: 'notes', target: 'C', result: 'wrong' };
  const laterCorrect = { id: 'correct', sessionId: 'session', completedAt, sequence: 6, stage: 'notes', target: 'C', result: 'correct' };
  expect(reconcilePractice({ 'notes:C': 4, 'chords:C': 2 }, history, [pending])).toEqual({ 'notes:C': 5, 'chords:C': 2 });
  expect(reconcilePractice({ 'notes:C': 3.75 }, [...history, laterCorrect], [pending])['notes:C']).toBe(4.75);
  expect(reconcilePractice({ 'notes:C': 5 }, [...history, pending], [pending])['notes:C']).toBe(5);
});

it('records the answered target before advancing and logs timeout only once', () => {
  let state = gameReducer(INITIAL_GAME, { type: 'start', settings: { endOnWrong: false }, random: () => 0 });
  state = gameReducer(state, { type: 'answer', answer: 'D', remaining: 3 });
  expect(state.lastAttempt).toMatchObject({ sequence: 1, target: 'C', result: 'wrong' });
  state = gameReducer(state, { type: 'answer', answer: 'C', remaining: 2, random: () => 0 });
  expect(state.target).not.toBe('C');
  expect(state.lastAttempt).toMatchObject({ sequence: 2, target: 'C', result: 'correct' });
  expect(state.practice['notes:C']).toBe(0.75);
  const expired = gameReducer(state, { type: 'tick', remaining: 0 });
  expect(expired.attemptCount).toBe(3);
  expect(expired.lastAttempt).toMatchObject({ target: state.target, result: 'timeout' });
  expect(gameReducer(expired, { type: 'tick', remaining: 0 })).toBe(expired);
});
