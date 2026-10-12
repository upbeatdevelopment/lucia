import { afterEach, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openHistory, validAttempt } from '../database.js';

const temporary = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
const attempt = { id: 'timed-1', sessionId: 'timed-session', completedAt: '2026-01-01T12:00:00.000Z', target: 'C', stage: 'notes', inversion: 0, direction: 'hear', answer: 'C', result: 'correct', sequence: 1, responseSeconds: 1.25, durationSeconds: 8 };
const directory = () => { const path = mkdtempSync(join(tmpdir(), 'piano-timings-')); temporary.push(path); return join(path, 'history.sqlite'); };

it('persists exact timings across reopen and preserves the original on duplicate retries', () => {
  const path = directory(); let history = openHistory(path);
  history.saveAttempt(attempt); history.saveAttempt({ ...attempt, responseSeconds: 7 }); history.close();
  history = openHistory(path);
  expect(history.timings()).toHaveLength(1);
  expect(history.timings()[0]).toMatchObject({ response_seconds: 1.25, duration_seconds: 8, sequence: 1 });
  expect(history.stats()[0].correct_count).toBe(1);
  history.saveAttempt({ ...attempt, id: 'legacy', responseSeconds: undefined, durationSeconds: undefined });
  expect(history.attempts().find((row) => row.id === 'legacy')).toMatchObject({ response_seconds: null, duration_seconds: null });
  expect(history.timings()).toHaveLength(1); history.close();
});
it('migrates legacy and partially migrated attempt schemas without inventing timings or losing learning', () => {
  for (const columns of ['', ', sequence INTEGER DEFAULT 0', ', response_seconds REAL', ', duration_seconds REAL']) {
    const path = directory(); const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE attempts (id TEXT PRIMARY KEY, session_id TEXT, completed_at TEXT, target TEXT, stage TEXT, inversion INTEGER, direction TEXT, answer TEXT, result TEXT${columns});
      INSERT INTO attempts (id,session_id,completed_at,target,stage,inversion,direction,answer,result) VALUES ('legacy','old-session','2026-01-01T12:00:00.000Z','C','notes',0,'hear','D','wrong');`);
    old.close(); let history = openHistory(path);
    expect(history.attempts()[0]).toMatchObject({ id: 'legacy', response_seconds: null, duration_seconds: null, sequence: 0 });
    expect(history.timings()).toEqual([]); history.saveAttempt(attempt); history.close();
    history = openHistory(path);
    expect(history.attempts()).toHaveLength(2); expect(history.practice()['notes:C']).toBe(0.75);
    expect(history.timings()[0].response_seconds).toBe(1.25); history.close();
  }
});
it('lists the latest 500 timed attempts independently of newer untimed history, retaining outcomes and zero', () => {
  const history = openHistory(':memory:');
  for (let index = 0; index < 501; index++) history.saveAttempt({ ...attempt, id: `timed-${index}`, sequence: index, responseSeconds: index % 8, result: index % 2 ? 'wrong' : 'correct', completedAt: new Date(Date.parse(attempt.completedAt) + index * 1000).toISOString() });
  history.saveAttempt({ ...attempt, id: 'unknown-newer', completedAt: '2026-01-02T12:00:00.000Z', responseSeconds: null, durationSeconds: null });
  expect(history.attempts()).toHaveLength(100); expect(history.attempts()[0].id).toBe('unknown-newer');
  expect(history.timings()).toHaveLength(500); expect(history.timings()[0].id).toBe('timed-500');
  expect(history.timings().some((row) => row.response_seconds === 0)).toBe(true);
  expect(history.timings().some((row) => row.result === 'wrong')).toBe(true); history.close();
});
it('accepts legacy/nullable timings and validates numeric paired measurements against the question limit', () => {
  expect(validAttempt(attempt)).toBe(true);
  expect(validAttempt({ ...attempt, responseSeconds: 0, durationSeconds: 2 })).toBe(true);
  expect(validAttempt({ ...attempt, responseSeconds: undefined, durationSeconds: undefined })).toBe(true);
  expect(validAttempt({ ...attempt, responseSeconds: null, durationSeconds: null })).toBe(true);
  for (const change of [{ responseSeconds: -1 }, { responseSeconds: 8.001 }, { responseSeconds: '1' }, { responseSeconds: Infinity }, { responseSeconds: NaN }, { responseSeconds: null }, { durationSeconds: undefined }, { durationSeconds: 0 }, { durationSeconds: 16 }, { durationSeconds: '8' }]) expect(validAttempt({ ...attempt, ...change })).toBe(false);
});
