import { createElement, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'https://esm.sh/react@19.0.0';
import htm from 'https://esm.sh/htm@3.1.1';
import { ArrowRight, ChartColumn, Pause, Play, Settings2, Volume2, X } from 'https://esm.sh/lucide-react@0.468.0?external=react';
import { DEFAULT_SETTINGS, INITIAL_GAME, QUIZ_PARTS, displayNote, gameReducer, keyboardKeys, lessonFor, roundDirection, targetLabel, voicing } from './game.js';
import { playNotes, stopAudio, unlockAudio } from './audio.js';
import History from './History.js';
import Progress from './Progress.js';
import { practiceKey, reconcilePractice } from './practice.js';

const html = htm.bind(createElement);
const icon = (component, size = 18) => createElement(component, { size, 'aria-hidden': true });
const pitchClass = (note) => note.replace(/\d+$/, '');

function readSettings() {
  try {
    const mix = localStorage.getItem('piano-practice-mix');
    return { ...DEFAULT_SETTINGS, mix: ['adaptive', 'balanced'].includes(mix) ? mix : DEFAULT_SETTINGS.mix };
  } catch { return DEFAULT_SETTINGS; }
}

function Piano({ view, targets, selected, reveal, playing, onKey, roles = {}, fingers = {} }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (view !== 'full' || targets.length === 0) return;
    const container = scrollRef.current;
    const key = container.querySelector('.selected');
    if (key) container.scrollLeft = key.offsetLeft + key.offsetWidth / 2 - container.clientWidth / 2;
  }, [view, targets.join(',')]);
  const keys = keyboardKeys(view);
  const whiteCount = keys.filter((note) => !note.includes('#')).length;
  let whiteIndex = 0;
  const whites = [];
  const blacks = [];
  for (const note of keys) {
    if (note.includes('#')) blacks.push({ note, position: whiteIndex });
    else { whites.push(note); whiteIndex++; }
  }
  const octaves = whites.reduce((groups, note) => {
    const octave = note.match(/\d+$/)[0];
    if (groups.at(-1)?.octave === octave) groups.at(-1).count++;
    else groups.push({ octave, count: 1 });
    return groups;
  }, []);
  const highlighted = (note) => view === 'single'
    ? [...targets, ...selected].some((target) => pitchClass(target) === pitchClass(note))
    : [...targets, ...selected].includes(note);
  const key = (note, black, position) => html`<button key=${note} type="button" data-note=${note}
    className=${`${black ? 'black-key' : 'white-key'} ${highlighted(note) ? 'selected' : ''} tone-${roles[pitchClass(note)] || 'none'}`}
    style=${black ? { left: `${position * 100 / whiteCount}%`, width: `${62 / whiteCount}%` } : undefined}
    aria-label=${`Piano key ${displayNote(note)}`} onClick=${() => onKey(note)}>
    ${highlighted(note) && html`<span className="key-dot" />`}
    ${fingers[note] && html`<span className="key-finger">${fingers[note]}</span>`}
    ${reveal && html`<span className="key-label">${displayNote(note)}</span>`}
  </button>`;
  return html`<div ref=${scrollRef} className="keyboard-scroll" tabIndex="0" aria-label=${view === 'full' ? '88-key piano, A0 to C8' : view === 'lesson' ? 'Chord shape keyboard, C4 to B5' : 'Single-octave piano, C4 to B4'}><div className=${`piano ${view} ${playing ? 'is-playing' : ''}`}>
    <div className="piano-rail octave-guide" role="group" aria-label="Octave numbers">${octaves.map(({ octave, count }) => html`<span key=${octave} className="octave-number" data-octave=${octave} title=${`Octave ${octave}`} style=${{ width: `${count * 100 / whiteCount}%` }}>${octave}</span>`)}</div><div className="piano-keys"><div className="white-keys">${whites.map((note) => key(note, false))}</div>${blacks.map(({ note, position }) => key(note, true, position))}</div>
  </div></div>`;
}

function Countdown({ remaining, duration, active }) {
  const progress = Math.max(0, Math.min(1, remaining / duration));
  return html`<div className=${`countdown ${active && remaining < 2.5 ? 'urgent' : ''}`} role="progressbar" aria-label="Question timer" aria-valuemin="0" aria-valuemax=${duration} aria-valuenow=${Number((duration * (1 - progress)).toFixed(2))} aria-valuetext=${`${remaining.toFixed(1)} seconds remaining`}>
    <div className="timer-fill" style=${{ width: `${100 * (1 - progress)}%` }} />
    <div className="timer-readout"><strong>${remaining.toFixed(1)}</strong><span>s</span></div>
  </div>`;
}

function Drawer({ open, onClose, title, id, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open && !ref.current.open) ref.current.show();
    else if (!open && ref.current.open) ref.current.close();
    const onEscape = (event) => {
      if (event.key === 'Escape' && !document.querySelector('dialog:modal')) {
        event.preventDefault();
        onClose();
      }
    };
    if (open) document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);
  return html`<dialog ref=${ref} className=${`side-drawer ${id}-drawer`} aria-labelledby=${`${id}-drawer-title`}
    onCancel=${(event) => { event.preventDefault(); onClose(); }}>
    <div className="drawer-heading"><h2 id=${`${id}-drawer-title`}>${title}</h2><button className="text-button" onClick=${onClose} aria-label=${`Close ${title.toLowerCase()}`}>${icon(X, 20)}</button></div>
    ${children}
  </dialog>`;
}

function ResultPopup({ open, game, onClose, onStart, onKey }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (open && !ref.current.open) ref.current.showModal();
    else if (!open && ref.current.open) ref.current.close();
  }, [open]);
  const complete = game.endReason === 'complete';
  const lesson = lessonFor(game);
  return html`<dialog ref=${ref} className="answer-popup" aria-labelledby="result-title" aria-describedby="answer-target"
    onCancel=${(event) => { event.preventDefault(); onClose(); }}>
    <div className="drawer-heading"><h2 id="result-title">${complete ? 'Quiz complete' : 'Correct answer'}</h2><button className="text-button" aria-label="Close result" onClick=${onClose}>${icon(X, 20)}</button></div>
    ${!complete && html`<p className="failure-reason">${game.lastAttempt?.result === 'timeout' ? 'Time’s up.' : 'Incorrect answer.'}</p><div className="answer-reveal"><strong id="answer-target">${targetLabel(game)}</strong></div>
    ${open && html`<div className="lesson-keyboard"><${Piano} view=${game.stage === 'notes' ? 'single' : 'lesson'} targets=${voicing(game.target, game.stage, game.inversion)} selected=${[]} reveal=${true} playing=${false} onKey=${onKey} roles=${lesson.roles} fingers=${lesson.fingers} /><span className="lesson-caption">${game.stage === 'notes' ? 'Find this key by its neighboring black-key group.' : 'Highlighted shape · numbers on keys are right-hand fingers'}</span></div>`}
    <div className="lesson-details"><div><p>${lesson.explanation}</p>${game.stage !== 'notes' && html`<p>Major = root + <strong>4 semitones</strong> (third) + <strong>7 semitones</strong> (fifth).</p><p className="finger-guide">1 thumb · 2 index · 3 middle · 4 ring · 5 little. Suggested fingerings—adjust if uncomfortable.</p>`}</div>
    ${lesson.voices.length > 0 && html`<table className="fingering-table"><caption>Lowest → highest · RH / LH fingers</caption><thead><tr><th>Tone</th><th>Key</th><th>RH</th><th>LH</th></tr></thead><tbody>${lesson.voices.map((voice) => html`<tr key=${voice.note}><td><span className=${`tone-tag ${voice.role}`}>${voice.role}</span></td><td>${voice.name}</td><td>${voice.right}</td><td>${voice.left}</td></tr>`)}</tbody></table>`}</div>`}
    ${complete && html`<p id="answer-target">Every part completed at 8, 4, and 2 seconds.</p><div className="lesson-keyboard"><${Piano} view="single" targets=${[]} selected=${[]} reveal=${false} playing=${false} onKey=${onKey} /><span className="lesson-caption">Click keys to play.</span></div>`}
    <p className="result-summary">${game.round - 1} correct · ${game.score.toLocaleString()} points</p>
    ${game.phase === 'over' ? html`<button className="primary-button" aria-label="New session" aria-keyshortcuts="Control+Enter" onClick=${onStart}>New session ${icon(ArrowRight, 16)}</button>` : html`<button className="primary-button" onClick=${onClose}>Continue ${icon(ArrowRight, 16)}</button>`}
  </dialog>`;
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, INITIAL_GAME);
  const [settings, setSettings] = useState(readSettings);
  const [muted, setMuted] = useState(false);
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState([]);
  const [best, setBest] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [historyError, setHistoryError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [saveErrors, setSaveErrors] = useState(0);
  const [saveReason, setSaveReason] = useState('');
  const deadline = useRef(0);
  const inputRef = useRef(null);
  const pulseTimeout = useRef(null);
  const pauseRequested = useRef(false);
  const starting = useRef(false);
  const resultPaused = useRef(false);
  const sessionId = useRef(null);
  const failedSessions = useRef(new Map());
  const savesInFlight = useRef(new Map());
  const sessionActive = ['running', 'paused'].includes(game.phase);
  const currentSettings = sessionActive || game.phase === 'over' ? game.settings : settings;
  const reverse = roundDirection(game, currentSettings) === 'keys';
  const stage = QUIZ_PARTS[game.part];
  const targets = voicing(game.target, game.stage, game.inversion);
  const remainingNow = () => Math.max(0, (deadline.current - performance.now()) / 1000);
  const configure = (key, value) => setSettings((previous) => ({ ...previous, [key]: value }));

  function soundTarget() {
    if (muted) return;
    playNotes(targets);
    setPlaying(true);
    clearTimeout(pulseTimeout.current);
    pulseTimeout.current = setTimeout(() => setPlaying(false), 240);
  }

  useEffect(() => {
    fetch('/api/history').then((response) => response.ok ? response.json() : null)
      .then((data) => { if (Array.isArray(data?.sessions)) setBest((previous) => Math.max(previous, ...data.sessions.map((session) => session.score))); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('piano-practice-mix', settings.mix); } catch { /* Storage is optional. */ }
  }, [settings.mix]);

  // Establish deadlines before paint so rapid inputs cannot use the previous round's clock.
  useLayoutEffect(() => {
    if (game.phase !== 'running') return;
    deadline.current = performance.now() + game.remaining * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, (deadline.current - performance.now()) / 1000);
      dispatch({ type: 'tick', remaining, completedAt: remaining <= 0 ? new Date().toISOString() : undefined });
    }, 50);
    inputRef.current?.focus();
    return () => clearInterval(interval);
  }, [game.phase, game.round]);

  useEffect(() => {
    if (game.phase !== 'running' || muted) { stopAudio(); setPlaying(false); return; }
    soundTarget();
    const interval = setInterval(soundTarget, game.settings.repeatSeconds * 1000);
    return () => { clearInterval(interval); clearTimeout(pulseTimeout.current); stopAudio(); };
  }, [game.phase, game.round, muted]);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        pauseRequested.current = true;
        if (game.phase === 'running') dispatch({ type: 'pause', remaining: remainingNow(), completedAt: new Date().toISOString() });
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [game.phase]);

  function persist(entry, path = '/api/sessions') {
    const key = `${path}:${entry.id}`;
    if (savesInFlight.current.has(key)) return savesInFlight.current.get(key);
    const task = (async () => {
      try {
        const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}${detail.error ? `: ${String(detail.error).slice(0, 160)}` : ''}`);
        }
        failedSessions.current.delete(key);
        setHistoryVersion((version) => version + 1);
      } catch (error) { failedSessions.current.set(key, { entry, path }); setSaveReason(error.message || 'Network unavailable'); }
      finally {
        savesInFlight.current.delete(key);
        setSaveErrors(failedSessions.current.size);
        if (!failedSessions.current.size) setSaveReason('');
      }
    })();
    savesInFlight.current.set(key, task);
    return task;
  }

  useEffect(() => {
    if (!game.lastAttempt || !sessionId.current) return;
    const attempt = game.lastAttempt;
    persist({ ...attempt, id: `${sessionId.current}-${attempt.sequence}`, sessionId: sessionId.current,
      completedAt: attempt.completedAt || new Date().toISOString() }, '/api/attempts');
  }, [game.attemptCount]);

  useEffect(() => {
    if (game.phase !== 'over' || !sessionId.current) return;
    setBest((previous) => Math.max(previous, game.score));
    const session = {
      id: sessionId.current, completedAt: game.lastAttempt?.completedAt || new Date().toISOString(), score: game.score, correctAnswers: game.round - 1,
      stage: game.stage, endReason: game.endReason, ...game.settings,
    };
    persist(session);
  }, [game.phase]);

  useLayoutEffect(() => {
    if (!game.lastAttempt || (game.lastAttempt.result === 'correct' && game.phase !== 'over')) return;
    resultPaused.current = game.phase === 'running';
    if (resultPaused.current) dispatch({ type: 'pause', remaining: remainingNow(), completedAt: new Date().toISOString() });
    setResultOpen(true);
  }, [game.attemptCount]);

  function closeResult() {
    setResultOpen(false);
    if (resultPaused.current && game.phase === 'paused' && !document.hidden) dispatch({ type: 'resume' });
    resultPaused.current = false;
  }

  useEffect(() => {
    const onStartKey = (event) => {
      if (!event.ctrlKey || event.key !== 'Enter') return;
      event.preventDefault();
      if (!event.repeat && !drawer && !loading && ['ready', 'over'].includes(game.phase)) start();
    };
    document.addEventListener('keydown', onStartKey);
    return () => document.removeEventListener('keydown', onStartKey);
  }, [game.phase, settings, drawer, loading]);

  async function start({ dismissDrawer = false } = {}) {
    if (starting.current || !['ready', 'over'].includes(game.phase) || (drawer && !dismissDrawer)) return;
    if (dismissDrawer) setDrawer(null);
    starting.current = true;
    setResultOpen(false);
    resultPaused.current = false;
    pauseRequested.current = false;
    setLoading(true);
    setAudioError('');
    let practice = game.practice;
    await Promise.all([...savesInFlight.current.values()]);
    await Promise.all([...failedSessions.current.values()].map(({ entry, path }) => persist(entry, path)));
    try {
      const pending = [...failedSessions.current.values()].filter(({ path }) => path === '/api/attempts').map(({ entry }) => entry);
      const query = new URLSearchParams();
      for (const key of new Set(pending.map((entry) => practiceKey(entry.stage, entry.target)))) query.append('pending', key);
      const response = await fetch(`/api/history${query.size ? `?${query}` : ''}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.practice || typeof data.practice !== 'object') throw new Error();
      practice = reconcilePractice(data.practice, data.practiceHistory || [], pending);
      setHistoryError(false);
    } catch { setHistoryError(true); }
    try { await unlockAudio(); }
    catch { setAudioError('Audio is unavailable. Check browser sound permissions.'); setMuted(true); }
    setAnswer('');
    setSelected([]);
    sessionId.current = crypto.randomUUID();
    dispatch({ type: 'start', settings, practice, paused: pauseRequested.current || document.hidden });
    setLoading(false);
    starting.current = false;
  }

  async function toggleSound() {
    if (muted) {
      try { await unlockAudio(); setMuted(false); setAudioError(''); }
      catch { setAudioError('Audio is unavailable. Check browser sound permissions.'); }
    } else setMuted(true);
  }

  function submit(event) {
    event.preventDefault();
    if (!answer.trim()) return;
    dispatch({ type: 'answer', answer, remaining: remainingNow(), completedAt: new Date().toISOString() });
    setAnswer('');
    inputRef.current?.focus();
  }

  async function auditionKey(note) {
    try {
      await unlockAudio();
      playNotes([note]);
      setAudioError('');
    } catch { setAudioError('Audio is unavailable. Check browser sound permissions.'); }
  }

  function pressKey(note) {
    auditionKey(note);
    if (!reverse || game.phase !== 'running') return;
    const keys = [...selected, note];
    if (keys.length === (game.stage === 'notes' ? 1 : 3)) {
      dispatch({ type: 'answer', keys, remaining: remainingNow(), completedAt: new Date().toISOString() });
      setSelected([]);
    } else setSelected(keys);
  }

  function pause() {
    if (loading) pauseRequested.current = true;
    if (game.phase === 'running') dispatch({ type: 'pause', remaining: remainingNow(), completedAt: new Date().toISOString() });
  }

  function openDrawer(name) {
    pause();
    setDrawer(name);
  }

  function toggleHistory() {
    setHistoryOpen((value) => !value);
  }

  const displayedTime = game.phase === 'ready' ? settings.startSeconds : game.remaining;
  const revealing = game.phase === 'over' || game.feedback?.type === 'wrong';
  const showTarget = revealing || (!reverse && currentSettings.mode === 'visual');
  const heading = game.phase === 'paused' ? 'Paused' : reverse ? `Play ${targetLabel(game)}` : game.stage === 'notes' ? 'What’s the note?' : 'What’s the chord?';
  const instruction = game.phase === 'paused' ? 'Timer and sound paused.' : reverse ? game.stage === 'notes' ? `Any ${displayNote(game.target)} is valid. Click one to see its octave.` : 'Press three keys in voice order, lowest to highest.' : currentSettings.mode === 'ear' ? 'Listen and type the name.' : game.stage === 'notes' ? 'Name the highlighted key.' : 'Name the major chord, not its bass note.';

  return html`<main className="app-shell">
    <section className="game-card" aria-label="Piano training game" data-stage=${game.stage}>
      ${game.phase !== 'over' && html`<div className=${`challenge-heading ${reverse ? 'key-prompt' : ''}`}><div><span className="round-label">Round <strong>${String(game.round).padStart(2, '0')}</strong> · ${currentSettings.mix === 'adaptive' ? 'Adaptive' : 'Balanced'} <span className="stage-progress" aria-label="Stage progress">· ${stage.title} <b>${game.duration}s</b></span></span><h1>${heading}</h1><p>${instruction}</p></div></div>`}
      <div className="keyboard-stage"><${Countdown} remaining=${displayedTime} duration=${game.phase === 'ready' ? settings.startSeconds : game.duration} active=${game.phase === 'running'} /><${Piano} view=${currentSettings.keyboard} targets=${showTarget ? targets : []} selected=${revealing ? [] : selected} reveal=${false} playing=${playing} onKey=${pressKey} /><div className="keyboard-caption">${currentSettings.keyboard === 'full' ? '88 keys · A0–C8' : 'Single octave · C4–B4'}${currentSettings.keyboard === 'single' && game.stage !== 'notes' ? ' · Pitch classes' : ''}</div></div>
      <div className="answer-area">
        ${game.phase === 'ready' ? html`<button className="primary-button" aria-label="Start" aria-keyshortcuts="Control+Enter" title="Ctrl+Enter" onClick=${() => start()} disabled=${loading || Boolean(drawer)}>${loading ? 'Loading…' : 'Start'}${icon(ArrowRight, 16)}</button>`
          : game.phase === 'paused' ? html`<button className="primary-button" disabled=${Boolean(drawer)} onClick=${() => dispatch({ type: 'resume' })}>${icon(Play, 16)}Resume</button>`
          : game.phase === 'over' ? !resultOpen && html`<button className="secondary-button" disabled=${loading || Boolean(drawer)} onClick=${() => setResultOpen(true)}>${loading ? 'Loading…' : 'View result'}</button>`
          : reverse ? html`<div className="key-selection"><span>${game.stage === 'notes' ? 'Click or tap a piano key.' : `${selected.length}/3 selected${selected.length ? `: ${selected.map((note) => displayNote(pitchClass(note))).join(' → ')}` : ''}`}</span>${selected.length > 0 && html`<button className="secondary-button" onClick=${() => setSelected((keys) => keys.slice(0, -1))}>Undo</button>`}</div>`
          : html`<form onSubmit=${submit} className=${`answer-form ${game.feedback?.type === 'wrong' ? 'answer-wrong' : ''}`}><input ref=${inputRef} aria-label="Your answer" placeholder=${game.stage === 'notes' ? 'Note name, e.g. F#' : 'Chord name, e.g. C major'} value=${answer} onChange=${(event) => setAnswer(event.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck=${false} maxLength=${20} /><button aria-label="Submit answer" type="submit">${icon(ArrowRight, 21)}</button></form>`}
        ${game.phase === 'running' && html`<span className=${`feedback ${game.feedback?.type || ''}`} aria-live="polite">${game.feedback?.type === 'wrong' ? '' : game.feedback?.text || (!reverse ? 'Enter to submit · # and b accepted' : '')}</span>`}
      </div>
      <div className="game-controls">${sessionActive && html`<button className="text-button" disabled=${Boolean(drawer)} aria-label=${game.phase === 'paused' ? 'Resume session' : 'Pause session'} onClick=${() => game.phase === 'paused' ? dispatch({ type: 'resume' }) : pause()}>${icon(game.phase === 'paused' ? Play : Pause, 16)}${game.phase === 'paused' ? 'Resume' : 'Pause'}</button>`}<button className="text-button" onClick=${() => openDrawer('stats')} aria-label="Stats">${icon(ChartColumn, 17)}Stats</button><button className="text-button" onClick=${() => openDrawer('settings')} aria-label="Settings">${icon(Settings2, 17)}</button></div>
    </section>
    <${Drawer} id="settings" title="Settings" open=${drawer === 'settings'} onClose=${() => setDrawer(null)}>
    <div className="drawer-sound"><label className="switch-row"><span>Quiz sound</span><input type="checkbox" role="switch" aria-label="Quiz sound" checked=${!muted} onChange=${toggleSound} /></label></div>
    <div className="drawer-playback"><button className="secondary-button" disabled=${game.phase === 'ready' || loading || muted} onClick=${soundTarget}>${icon(Volume2, 16)}Replay</button><span className="repeat-indicator">Every ${currentSettings.repeatSeconds}s</span></div>
    <section className="settings-panel" aria-label="Session settings"><fieldset disabled=${sessionActive || loading}><div className="settings-grid">
      <label className="setting">Practice mix<select aria-label="Practice mix" value=${settings.mix} onChange=${(event) => configure('mix', event.target.value)}><option value="adaptive">Adaptive · mistake history</option><option value="balanced">Balanced · random</option></select></label>
      <label className="setting">Exercise<select aria-label="Exercise" value=${settings.direction} onChange=${(event) => configure('direction', event.target.value)}><option value="mixed">Mixed · both directions</option><option value="hear">Hear → name</option><option value="keys">Name → keys</option></select></label>
      <label className="setting">Keyboard<select aria-label="Keyboard view" value=${settings.keyboard} onChange=${(event) => configure('keyboard', event.target.value)}><option value="full">Full 88 keys</option><option value="single">Single octave</option></select></label>
      <label className="setting">Hints<select aria-label="Hints" value=${settings.mode} onChange=${(event) => configure('mode', event.target.value)}><option value="visual">See + hear</option><option value="ear">Ear training</option></select></label>
      <label className="switch-row"><span>End on wrong answer</span><input type="checkbox" role="switch" aria-label="End on wrong answer" checked=${settings.endOnWrong} onChange=${(event) => configure('endOnWrong', event.target.checked)} /></label>
      <div className="setting"><div className="range-heading"><label htmlFor="repeat">Replay interval</label><output htmlFor="repeat">${settings.repeatSeconds}s</output></div><input id="repeat" type="range" min="0.5" max="5" step="0.5" value=${settings.repeatSeconds} onChange=${(event) => configure('repeatSeconds', Number(event.target.value))} /></div>
    </div></fieldset></section>
    </${Drawer}>
    <${Drawer} id="stats" title="Stats" open=${drawer === 'stats'} onClose=${() => setDrawer(null)}>
    <div className="stats-row"><span>Best score <strong className="best-value">${best.toLocaleString()}</strong></span></div>
    <div className="drawer-score"><span>Points <strong className="score-value">${game.score.toLocaleString()}</strong></span><span>Correct <strong className="correct-value">${game.round - 1}</strong></span></div>
    ${drawer === 'stats' && html`<${Progress} refresh=${historyVersion} />`}
    <div className="history-control"><button className="secondary-button" onClick=${toggleHistory} aria-expanded=${historyOpen}>${historyOpen ? 'Hide history' : 'History'}</button></div>
    ${drawer === 'stats' && historyOpen && html`<${History} refresh=${historyVersion} />`}
    </${Drawer}>
    <${ResultPopup} open=${resultOpen} game=${game} onClose=${closeResult} onStart=${() => start({ dismissDrawer: true })} onKey=${auditionKey} />
    ${audioError && html`<p className="error-message" role="alert">${audioError}</p>`}
    ${historyError && settings.mix === 'adaptive' && html`<p className="error-message" role="alert">Saved adaptive history is unavailable. Using current-session mistakes.</p>`}
    ${saveErrors > 0 && html`<p className="error-message" role="alert">${saveErrors} history entr${saveErrors === 1 ? 'y' : 'ies'} not saved.${saveReason ? ` ${saveReason}.` : ''} <button onClick=${() => { for (const { entry, path } of failedSessions.current.values()) persist(entry, path); }}>Retry saves</button></p>`}
  </main>`;
}
