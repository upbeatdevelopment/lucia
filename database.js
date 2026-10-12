import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { NOTES, nextDebt, practiceKey } from './src/practice.js';

export function openHistory(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, completed_at TEXT NOT NULL, score INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL, stage TEXT NOT NULL, end_reason TEXT NOT NULL,
      direction TEXT NOT NULL, keyboard_view TEXT NOT NULL, practice_mode TEXT NOT NULL,
      start_seconds REAL NOT NULL, repeat_seconds REAL NOT NULL, end_on_wrong INTEGER NOT NULL,
      practice_mix TEXT NOT NULL DEFAULT 'balanced'
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, completed_at TEXT NOT NULL,
      target TEXT NOT NULL, stage TEXT NOT NULL, inversion INTEGER NOT NULL,
      direction TEXT NOT NULL, answer TEXT NOT NULL, result TEXT NOT NULL,
      sequence INTEGER NOT NULL DEFAULT 0, response_seconds REAL, duration_seconds REAL
    );
    CREATE INDEX IF NOT EXISTS attempts_target ON attempts(stage, target, completed_at);
    CREATE TABLE IF NOT EXISTS practice_stats (
      stage TEXT NOT NULL, target TEXT NOT NULL, debt REAL NOT NULL,
      wrong_count INTEGER NOT NULL, correct_count INTEGER NOT NULL, timeout_count INTEGER NOT NULL,
      last_attempt_at TEXT NOT NULL, PRIMARY KEY(stage, target)
    );
  `);
  if (!db.prepare('PRAGMA table_info(sessions)').all().some((column) => column.name === 'practice_mix')) {
    db.exec("ALTER TABLE sessions ADD COLUMN practice_mix TEXT NOT NULL DEFAULT 'balanced'");
  }
  if (!db.prepare('PRAGMA table_info(attempts)').all().some((column) => column.name === 'sequence')) {
    db.exec('ALTER TABLE attempts ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0');
  }
  for (const column of ['response_seconds', 'duration_seconds']) {
    if (!db.prepare('PRAGMA table_info(attempts)').all().some((item) => item.name === column)) {
      db.exec(`ALTER TABLE attempts ADD COLUMN ${column} REAL`);
    }
  }
  db.exec('CREATE INDEX IF NOT EXISTS attempts_timing_recent ON attempts(completed_at DESC, session_id DESC, sequence DESC) WHERE response_seconds IS NOT NULL AND duration_seconds IS NOT NULL');
  const insertSession = db.prepare(`INSERT INTO sessions
    (id, completed_at, score, correct_answers, stage, end_reason, direction, keyboard_view, practice_mode, start_seconds, repeat_seconds, end_on_wrong, practice_mix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`);
  const insertAttempt = db.prepare('INSERT INTO attempts (id, session_id, completed_at, target, stage, inversion, direction, answer, result, sequence, response_seconds, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING');
  const targetAttempts = db.prepare('SELECT * FROM attempts WHERE stage = ? AND target = ? ORDER BY completed_at, session_id, sequence, rowid');
  const updateStats = db.prepare(`INSERT INTO practice_stats VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stage, target) DO UPDATE SET debt=excluded.debt, wrong_count=excluded.wrong_count,
    correct_count=excluded.correct_count, timeout_count=excluded.timeout_count, last_attempt_at=excluded.last_attempt_at`);
  const listSessions = db.prepare('SELECT * FROM sessions ORDER BY completed_at DESC, rowid DESC LIMIT 500');
  const listAttempts = db.prepare('SELECT * FROM attempts ORDER BY completed_at DESC, rowid DESC LIMIT 100');
  const listTimings = db.prepare('SELECT * FROM attempts WHERE response_seconds IS NOT NULL AND duration_seconds IS NOT NULL ORDER BY completed_at DESC, session_id DESC, sequence DESC, rowid DESC LIMIT 500');
  const listStats = db.prepare('SELECT * FROM practice_stats ORDER BY debt DESC, last_attempt_at DESC');
  return {
    save(session) {
      insertSession.run(session.id, session.completedAt, session.score, session.correctAnswers, session.stage,
        session.endReason, session.direction, session.keyboard, session.mode,
        session.startSeconds, session.repeatSeconds, session.endOnWrong ? 1 : 0, session.mix || 'balanced');
    },
    saveAttempt(attempt) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const inserted = insertAttempt.run(attempt.id, attempt.sessionId, attempt.completedAt, attempt.target,
          attempt.stage, attempt.inversion, attempt.direction, attempt.answer, attempt.result, attempt.sequence || 0,
          attempt.responseSeconds ?? null, attempt.durationSeconds ?? null);
        if (inserted.changes > 0) {
          // Recompute in completion order so delayed retries do not distort learning.
          const history = targetAttempts.all(attempt.stage, attempt.target);
          let debt = 0, wrong = 0, correct = 0, timeouts = 0;
          for (const item of history) {
            debt = nextDebt(debt, item.result);
            if (item.result === 'correct') correct++;
            else if (item.result === 'wrong') wrong++;
            else timeouts++;
          }
          updateStats.run(attempt.stage, attempt.target, debt, wrong, correct, timeouts, history.at(-1).completed_at);
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    targetHistory: (stage, target) => targetAttempts.all(stage, target),
    list: () => listSessions.all(),
    attempts: () => listAttempts.all(),
    timings: () => listTimings.all(),
    stats: () => listStats.all(),
    practice: () => Object.fromEntries(listStats.all().map((row) => [practiceKey(row.stage, row.target), row.debt])),
    close: () => db.close(),
  };
}

const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value);
const validTime = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && Date.parse(value) >= 0 && Date.parse(value) <= Date.now() + 86400000;
const validStage = (value) => ['notes', 'chords', 'inversions'].includes(value);
const validDirection = (value) => ['hear', 'keys'].includes(value);

export function validSession(value) {
  if (!value || typeof value !== 'object') return false;
  return validId(value.id) && validTime(value.completedAt)
    && Number.isSafeInteger(value.score) && value.score >= 0 && value.score <= 100000000
    && Number.isSafeInteger(value.correctAnswers) && value.correctAnswers >= 0 && value.correctAnswers <= 1000000
    && validStage(value.stage) && ['timeout', 'wrong', 'complete'].includes(value.endReason) && (validDirection(value.direction) || value.direction === 'mixed')
    && ['full', 'single'].includes(value.keyboard) && ['visual', 'ear'].includes(value.mode)
    && (value.mix === undefined || ['adaptive', 'balanced'].includes(value.mix))
    && Number.isFinite(value.startSeconds) && value.startSeconds >= 4 && value.startSeconds <= 15
    && Number.isFinite(value.repeatSeconds) && value.repeatSeconds >= 0.5 && value.repeatSeconds <= 5
    && typeof value.endOnWrong === 'boolean';
}

export function validAttempt(value) {
  if (!value || typeof value !== 'object') return false;
  const response = value.responseSeconds ?? null, duration = value.durationSeconds ?? null;
  const validTiming = (response === null && duration === null) || (Number.isFinite(response) && Number.isFinite(duration)
    && duration >= 2 && duration <= 15 && response >= 0 && response <= duration);
  return validTiming && validId(value.id) && validId(value.sessionId) && validTime(value.completedAt)
    && NOTES.includes(value.target) && validStage(value.stage) && validDirection(value.direction)
    && (value.stage === 'inversions' ? [1, 2].includes(value.inversion) : value.inversion === 0)
    && (value.sequence === undefined || (Number.isSafeInteger(value.sequence) && value.sequence >= 0 && value.sequence <= 1000000))
    && ['correct', 'wrong', 'timeout'].includes(value.result)
    && typeof value.answer === 'string' && value.answer.length <= 256;
}
