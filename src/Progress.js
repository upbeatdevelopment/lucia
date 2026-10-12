import { createElement, useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@19.0.0';
import htm from 'https://esm.sh/htm@3.1.1';
import { targetLabel } from './game.js';
import { timingProgress } from './timingProgress.js';

const html = htm.bind(createElement);
const exercises = { hear: 'Hear → name', keys: 'Name → keys' };
const results = { correct: 'Correct', wrong: 'Wrong', timeout: 'Timeout' };
const seconds = (value) => value === null ? '—' : `${value.toFixed(2)} s`;

export default function Progress({ refresh }) {
  const [timings, setTimings] = useState([]);
  const [phase, setPhase] = useState('notes');
  const [direction, setDirection] = useState('all');
  const [status, setStatus] = useState('loading');
  const [chartError, setChartError] = useState(false);
  const canvas = useRef(null);
  const model = useMemo(() => timingProgress(timings, phase, direction), [timings, phase, direction]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/history', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => {
        if (controller.signal.aborted) return;
        setTimings(Array.isArray(data.timings) ? data.timings : []);
        setStatus('ready');
      })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    setChartError(false);
    if (status !== 'ready' || !model.points.length) return;
    let chart, cancelled = false;
    import('https://esm.sh/chart.js@4.4.7/auto').then(({ default: Chart }) => {
      if (cancelled) return;
      const points = model.points;
      chart = new Chart(canvas.current, {
        type: 'line',
        data: {
          labels: points.map((attempt) => new Date(attempt.completed_at).toLocaleString()),
          datasets: ['hear', 'keys'].filter((exercise) => points.some((attempt) => attempt.direction === exercise)).map((exercise) => ({
            label: exercises[exercise], data: points.map((attempt) => attempt.direction === exercise ? attempt.response_seconds : null),
            borderColor: exercise === 'hear' ? '#b29aef' : '#90cfb8', backgroundColor: exercise === 'hear' ? '#b29aef' : '#90cfb8',
            spanGaps: true, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2, tension: 0.1,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { labels: { color: '#c3b5d2', boxWidth: 12, font: { size: 10 } } },
            tooltip: { callbacks: { label: ({ dataset, dataIndex, parsed }) => `${dataset.label}: ${seconds(parsed.y)} · ${targetLabel(points[dataIndex])} · ${points[dataIndex].duration_seconds}s limit` } },
          },
          scales: {
            x: { ticks: { color: '#9a91a7', maxTicksLimit: 4, maxRotation: 0, font: { size: 9 }, callback: (value) => new Date(points[value].completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, grid: { color: '#302a39' } },
            y: { beginAtZero: true, ticks: { color: '#9a91a7' }, grid: { color: '#302a39' }, title: { display: true, text: 'Response time (seconds)', color: '#aba0b9' } },
          },
        },
      });
    }).catch(() => { if (!cancelled) setChartError(true); });
    return () => { cancelled = true; chart?.destroy(); };
  }, [model, status]);

  return html`<section className="progress-panel" aria-label="Timing progress">
    <h3>Progress</h3><p className="progress-description">Response times · lower is faster. Pauses don’t count; retries include earlier tries.</p>
    <div className="progress-filters">
      <label>Phase<select aria-label="Progress phase" value=${phase} onChange=${(event) => setPhase(event.target.value)}><option value="notes">Single notes</option><option value="chords">Major chords</option><option value="first">First inversions</option><option value="second">Second inversions</option></select></label>
      <label>Exercise<select aria-label="Progress exercise" value=${direction} onChange=${(event) => setDirection(event.target.value)}><option value="all">Both directions</option><option value="hear">Hear → name</option><option value="keys">Name → keys</option></select></label>
    </div>
    ${status === 'loading' && html`<p className="muted">Loading progress…</p>`}
    ${status === 'error' && html`<p role="alert">Progress is unavailable. Reopen Settings to retry.</p>`}
    ${status === 'ready' && html`
      <div className="progress-summary">${['hear', 'keys'].filter((exercise) => direction === 'all' || direction === exercise).map((exercise) => html`<div key=${exercise}><span>${exercises[exercise]}</span><strong>${seconds(model.averages[exercise].seconds)}</strong><small>Average · last ${model.averages[exercise].count} correct</small></div>`)}</div>
      ${model.points.length > 0 && html`<div className="timing-chart"><canvas ref=${canvas} role="img" aria-label="Correct response times over practice attempts" /></div><p className="progress-description">Correct answers only. Each exercise has its own line.</p>`}
      ${model.latest.length > 0 && model.points.length === 0 && html`<p className="muted">No correct responses to graph yet. Your latest attempts are listed below.</p>`}
      ${chartError && html`<p role="alert">The speed graph couldn’t load. Your latest times are still listed below.</p>`}
      <h4>Latest times</h4>
      ${model.latest.length === 0 ? html`<p className="muted">${timings.length ? 'No timed attempts match these filters yet.' : 'Timing starts with new practice. Older attempts have no recorded response time; their scores remain in History.'}</p>` : html`
        <div className="timing-table-scroll"><table className="timing-table"><thead><tr><th>When</th><th>Target</th><th>Exercise</th><th>Time</th><th>Result</th></tr></thead><tbody>${model.latest.map((attempt) => html`<tr key=${attempt.id} data-attempt-id=${attempt.id}><td title=${new Date(attempt.completed_at).toLocaleString()}>${new Date(attempt.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td>${targetLabel(attempt)}</td><td>${attempt.direction === 'hear' ? 'Hear' : 'Keys'}</td><td><strong>${seconds(attempt.response_seconds)}</strong><small>${attempt.duration_seconds}s limit</small></td><td className=${`timing-${attempt.result}`}>${results[attempt.result]}</td></tr>`)}</tbody></table></div>`}
    `}
  </section>`;
}
