import { afterEach, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openHistory, validAttempt } from '../database.js';

const temporary = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
const attempt = { id: 'attempt-1', sessionId: 'session-1', completedAt: '2026-01-01T12:00:00.000Z', target: 'C#', stage: 'notes', inversion: 0, direction: 'hear', answer: 'D', result: 'wrong' };

it('persists note-specific learning and deduplicates attempts without adding bias twice', () => {
  const dir = mkdtempSync(join(tmpdir(), 'adaptive-history-'));
  temporary.push(dir);
  const path = join(dir, 'history.sqlite');
  let history = openHistory(path);
  history.saveAttempt(attempt);
  history.saveAttempt(attempt);
  expect(history.attempts()).toHaveLength(1);
  expect(history.practice()).toEqual({ 'notes:C#': 1 });
  history.close();
  history = openHistory(path);
  expect(history.practice()['notes:C#']).toBe(1);
  history.saveAttempt({ ...attempt, id: 'attempt-2', result: 'correct', answer: 'C#', completedAt: '2026-01-01T12:00:01.000Z' });
  expect(history.practice()['notes:C#']).toBe(0.75);
  expect(history.stats()[0]).toMatchObject({ wrong_count: 1, correct_count: 1 });
  history.close();
});

it('delayed retries are learned in completion order, not insertion order', () => {
  const history = openHistory(':memory:');
  history.saveAttempt({ ...attempt, id: 'later', result: 'correct', completedAt: '2026-01-01T12:00:01.000Z' });
  history.saveAttempt(attempt);
  expect(history.practice()['notes:C#']).toBe(0.75);
  history.close();
});

it('uses answer sequence for timestamp ties even when correct saves before a missed retry', () => {
  const history = openHistory(':memory:');
  history.saveAttempt({ ...attempt, id: 'correct-later', sequence: 2, result: 'correct' });
  history.saveAttempt({ ...attempt, sequence: 1 });
  expect(history.practice()['notes:C#']).toBe(0.75);
  history.close();
});

it('migrates old session-only SQLite databases without erasing saved sessions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'old-piano-history-'));
  temporary.push(dir);
  const path = join(dir, 'history.sqlite');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE sessions (id TEXT PRIMARY KEY, completed_at TEXT, score INTEGER, correct_answers INTEGER, stage TEXT, end_reason TEXT, direction TEXT, keyboard_view TEXT, practice_mode TEXT, start_seconds REAL, repeat_seconds REAL, end_on_wrong INTEGER);
    INSERT INTO sessions VALUES ('legacy', '2026-01-01T12:00:00.000Z', 400, 3, 'notes', 'wrong', 'hear', 'full', 'visual', 8, 2, 1);`);
  old.close();
  const history = openHistory(path);
  expect(history.list()[0]).toMatchObject({ id: 'legacy', score: 400, practice_mix: 'balanced' });
  expect(history.practice()).toEqual({});
  history.saveAttempt(attempt);
  expect(history.practice()['notes:C#']).toBe(1);
  history.close();
});

it('validates attempt targets, inversion stage, payload sizes, timestamps, and results', () => {
  expect(validAttempt(attempt)).toBe(true);
  for (const change of [{ target: 'H' }, { result: 'maybe' }, { stage: 'inversions', inversion: 0 }, { stage: 'notes', inversion: 1 }, { answer: 'x'.repeat(257) }, { completedAt: 'tomorrow' }, { id: '../bad' }]) expect(validAttempt({ ...attempt, ...change })).toBe(false);
});
