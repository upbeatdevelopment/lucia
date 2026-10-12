import { expect, it } from 'vitest';
import { timingProgress } from './timingProgress.js';

const attempt = (id, response, direction = 'hear', result = 'correct', stage = 'notes', inversion = 0) => ({ id, response_seconds: response, duration_seconds: 8, direction, result, stage, inversion });
it('separates speed averages and plots only correct responses chronologically, including zero', () => {
  const model = timingProgress([attempt('timeout', 8, 'hear', 'timeout'), attempt('keys', 2, 'keys'), attempt('wrong', 1, 'hear', 'wrong'), attempt('zero', 0), attempt('older', 4)]);
  expect(model.latest.map((item) => item.id)).toEqual(['timeout', 'keys', 'wrong', 'zero', 'older']);
  expect(model.points.map((item) => item.id)).toEqual(['older', 'zero', 'keys']);
  expect(model.averages).toEqual({ hear: { count: 2, seconds: 2 }, keys: { count: 1, seconds: 2 } });
});
it('filters phase, inversion and direction without comparing unrelated exercises', () => {
  const data = [attempt('note', 1), attempt('major', 2, 'hear', 'correct', 'chords'), attempt('first', 3, 'keys', 'correct', 'inversions', 1), attempt('second', 4, 'hear', 'correct', 'inversions', 2)];
  expect(timingProgress(data, 'first').latest.map((item) => item.id)).toEqual(['first']);
  expect(timingProgress(data, 'second', 'keys').latest).toEqual([]);
  expect(timingProgress(data, 'chords', 'hear').points.map((item) => item.id)).toEqual(['major']);
});
it('limits latest rows, recent averages and plotted samples and ignores unknown timings', () => {
  const data = Array.from({ length: 120 }, (_, id) => attempt(String(id), id % 8));
  data.unshift(attempt('unknown', null), attempt('negative', -1), attempt('oversized', 9));
  const model = timingProgress(data);
  expect(model.latest).toHaveLength(10); expect(model.points).toHaveLength(100);
  expect(model.points[0].id).toBe('99'); expect(model.points.at(-1).id).toBe('0');
  expect(model.averages.hear.count).toBe(10); expect(model.averages.keys.seconds).toBeNull();
});
