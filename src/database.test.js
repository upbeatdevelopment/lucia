import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openHistory, validSession } from '../database.js';

const temporary = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
const session = { id: 'test-session-1', completedAt: '2026-01-01T12:00:00.000Z', score: 250, correctAnswers: 2, stage: 'notes', endReason: 'wrong', direction: 'hear', keyboard: 'full', mode: 'visual', startSeconds: 8, repeatSeconds: 2, endOnWrong: true };

it('writes actual SQLite data, deduplicates retries, and survives reopening', () => {
  const directory = mkdtempSync(join(tmpdir(), 'piano-history-'));
  temporary.push(directory);
  const path = join(directory, 'history.sqlite');
  let history = openHistory(path);
  history.save(session);
  history.save(session);
  expect(history.list()).toHaveLength(1);
  expect(history.list()[0]).toMatchObject({ id: session.id, completed_at: session.completedAt, score: 250, correct_answers: 2, direction: 'hear', end_on_wrong: 1 });
  history.close();
  history = openHistory(path);
  expect(history.list()).toHaveLength(1);
  history.save({ ...session, id: 'second-session', score: 900, direction: 'keys', endOnWrong: false });
  expect(history.list()[0]).toMatchObject({ id: 'second-session', score: 900, end_on_wrong: 0 });
  history.close();
});

it('validates session fields without allowing invalid enum values or nonfinite numbers', () => {
  expect(validSession(session)).toBe(true);
  for (const change of [{ score: -1 }, { correctAnswers: 1.5 }, { direction: 'other' }, { stage: 'bad' }, { id: '../oops' }, { startSeconds: NaN }, { repeatSeconds: 0 }, { completedAt: 'not-a-date' }, { endOnWrong: 'yes' }, { endReason: 'cancelled' }]) expect(validSession({ ...session, ...change })).toBe(false);
  expect(validSession(null)).toBe(false);
});
