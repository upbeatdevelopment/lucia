import { createElement, useEffect, useRef, useState } from 'https://esm.sh/react@19.0.0';
import htm from 'https://esm.sh/htm@3.1.1';
import { targetLabel } from './game.js';
import { practiceWeight } from './practice.js';

const html = htm.bind(createElement);
const phases = { notes: 'Notes', chords: 'Major chords', inversions: 'Inversions' };

export default function History({ refresh }) {
  const [sessions, setSessions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState([]);
  const [status, setStatus] = useState('loading');
  const canvas = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/history', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => {
        if (!Array.isArray(data.sessions)) throw new Error();
        setSessions(data.sessions);
        setAttempts(Array.isArray(data.attempts) ? data.attempts : []);
        setStats(Array.isArray(data.stats) ? data.stats : []);
        setStatus('ready');
      })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (status !== 'ready' || sessions.length === 0) return;
    let chart;
    let cancelled = false;
    import('https://esm.sh/chart.js@4.4.7/auto').then(({ default: Chart }) => {
      if (cancelled) return;
      const chronological = [...sessions].reverse();
      chart = new Chart(canvas.current, {
        type: 'line',
        data: {
          labels: chronological.map((session) => new Date(session.completed_at).toLocaleString()),
          datasets: [{ label: 'Correct answers', data: chronological.map((session) => session.correct_answers), borderColor: '#b29aef', backgroundColor: '#b29aef18', fill: true, tension: 0.15, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#9a91a7', maxTicksLimit: 6, maxRotation: 0 }, grid: { color: '#302a39' } },
            y: { beginAtZero: true, ticks: { color: '#9a91a7', precision: 0 }, grid: { color: '#302a39' }, title: { display: true, text: 'Correct answers', color: '#aba0b9' } },
          },
        },
      });
    }).catch(() => { if (!cancelled) setStatus('chart-error'); });
    return () => { cancelled = true; chart?.destroy(); };
  }, [sessions, status]);

  return html`<section className="history-panel" aria-label="Session history">
    ${status === 'loading' && html`<p className="muted">Loading history…</p>`}
    ${status === 'error' && html`<p role="alert">History is unavailable. Run the Node server to use SQLite history.</p>`}
    ${status === 'chart-error' && html`<p role="alert">The chart couldn’t load. Your saved sessions are listed below.</p>`}
    ${status === 'ready' && sessions.length === 0 && html`<p className="muted">No completed sessions yet.</p>`}
    ${stats.length > 0 && html`<h3>Adaptive priorities</h3><div className="history-table-scroll"><table className="priority-table"><thead><tr><th>Target</th><th>Phase</th><th>Misses</th><th>Correct</th><th>Weight</th></tr></thead><tbody>${stats.map((stat) => html`<tr key=${`${stat.stage}:${stat.target}`}><td>${targetLabel({ target: stat.target, stage: stat.stage, inversion: 0 })}</td><td>${phases[stat.stage]}</td><td>${stat.wrong_count + stat.timeout_count}</td><td>${stat.correct_count}</td><td>${practiceWeight(stat.debt)}×</td></tr>`)}</tbody></table></div>`}
    ${sessions.length > 0 && html`<div className="history-summary"><span>${sessions.length} session${sessions.length === 1 ? '' : 's'}</span><span>Best score: <strong>${Math.max(...sessions.map((session) => session.score)).toLocaleString()}</strong></span><span>Most correct: <strong>${Math.max(...sessions.map((session) => session.correct_answers))}</strong></span></div><div className="chart-container"><canvas ref=${canvas} role="img" aria-label="Correct answers per completed session over time" /></div><div className="history-table-scroll"><table className="session-table"><thead><tr><th>Completed</th><th>Score</th><th>Correct</th><th>Phase</th><th>Exercise</th><th>End</th></tr></thead><tbody>${sessions.map((session) => html`<tr key=${session.id}><td>${new Date(session.completed_at).toLocaleString()}</td><td>${session.score.toLocaleString()}</td><td>${session.correct_answers}</td><td>${phases[session.stage]}</td><td>${session.direction === 'mixed' ? 'Mixed' : session.direction === 'keys' ? 'Name → keys' : 'Hear → name'}</td><td>${session.end_reason === 'complete' ? 'Completed' : session.end_reason === 'wrong' ? 'Wrong answer' : 'Time expired'}</td></tr>`)}</tbody></table></div>`}
    ${attempts.some((attempt) => attempt.result !== 'correct') && html`<h3>Recent mistakes</h3><div className="history-table-scroll"><table className="mistake-table"><thead><tr><th>Time</th><th>Correct answer</th><th>Your answer</th></tr></thead><tbody>${attempts.filter((attempt) => attempt.result !== 'correct').map((attempt) => html`<tr key=${attempt.id}><td>${new Date(attempt.completed_at).toLocaleString()}</td><td>${targetLabel(attempt)}</td><td>${attempt.result === 'timeout' ? 'Time expired' : attempt.answer || 'No answer'}</td></tr>`)}</tbody></table></div>`}
  </section>`;
}
