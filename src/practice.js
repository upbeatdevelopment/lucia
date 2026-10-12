export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const practiceKey = (stage, root) => `${stage}:${root}`;
export const nextDebt = (debt, result) => Math.max(0, Number(debt || 0) + (result === 'correct' ? -0.25 : 1));
export const practiceWeight = (debt) => 1 + 2 * Math.min(4, Math.max(0, Number(debt) || 0));

export function learn(practice, stage, root, result) {
  const key = practiceKey(stage, root);
  return { ...practice, [key]: nextDebt(practice[key], result) };
}

export function reconcilePractice(saved, history, pending) {
  const practice = { ...saved };
  const keys = new Set(pending.map((attempt) => practiceKey(attempt.stage, attempt.target)));
  const entries = new Map();
  for (const attempt of [...history, ...pending]) entries.set(attempt.id, attempt);
  const sorted = [...entries.values()].sort((left, right) => {
    const time = (left.completedAt || left.completed_at).localeCompare(right.completedAt || right.completed_at);
    if (time) return time;
    const session = (left.sessionId || left.session_id).localeCompare(right.sessionId || right.session_id);
    return session || (left.sequence || 0) - (right.sequence || 0);
  });
  for (const key of keys) practice[key] = 0;
  for (const attempt of sorted) {
    const key = practiceKey(attempt.stage, attempt.target);
    if (keys.has(key)) practice[key] = nextDebt(practice[key], attempt.result);
  }
  return practice;
}

export function pickRoot(previous, stage, practice = {}, mix = 'balanced', random = Math.random, roots = NOTES) {
  const alternatives = roots.filter((note) => note !== previous);
  const choices = alternatives.length ? alternatives : roots;
  const weights = choices.map((root) => mix === 'adaptive' ? practiceWeight(practice[practiceKey(stage, root)]) : 1);
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < choices.length; index++) {
    if (roll < weights[index]) return choices[index];
    roll -= weights[index];
  }
  return choices.at(-1);
}
