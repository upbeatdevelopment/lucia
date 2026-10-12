export function timingProgress(attempts, phase = 'notes', direction = 'all') {
  const filtered = attempts.filter((attempt) => {
    const matchesPhase = phase === 'first' || phase === 'second'
      ? attempt.stage === 'inversions' && attempt.inversion === (phase === 'first' ? 1 : 2)
      : attempt.stage === phase;
    return matchesPhase && (direction === 'all' || attempt.direction === direction)
      && ['hear', 'keys'].includes(attempt.direction) && ['correct', 'wrong', 'timeout'].includes(attempt.result)
      && Number.isFinite(attempt.response_seconds) && Number.isFinite(attempt.duration_seconds)
      && attempt.response_seconds >= 0 && attempt.response_seconds <= attempt.duration_seconds && attempt.duration_seconds > 0;
  });
  const correct = filtered.filter((attempt) => attempt.result === 'correct');
  const averages = Object.fromEntries(['hear', 'keys'].map((exercise) => {
    const recent = correct.filter((attempt) => attempt.direction === exercise).slice(0, 10);
    return [exercise, { count: recent.length, seconds: recent.length ? recent.reduce((sum, attempt) => sum + attempt.response_seconds, 0) / recent.length : null }];
  }));
  return { latest: filtered.slice(0, 10), points: correct.slice(0, 100).reverse(), averages };
}
