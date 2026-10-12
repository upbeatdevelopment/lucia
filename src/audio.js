// Tone.js handles polyphony, audio scheduling, and synthesis. No remote samples.
let tone;
let instrument;
let loading;

export async function unlockAudio() {
  loading ??= import('https://esm.sh/tone@15.1.22');
  tone = await loading;
  await tone.start();
  if (!instrument) {
    instrument = new tone.PolySynth(tone.Synth, {
      oscillator: { type: 'custom', partials: [1, 0.45, 0.18, 0.08, 0.04] },
      envelope: { attack: 0.004, decay: 1.1, sustain: 0, release: 0.6 },
      volume: -16,
    }).toDestination();
  }
}

export function playNotes(notes) {
  if (instrument && tone.getContext().state === 'running') {
    instrument.triggerAttackRelease(notes, 0.8, tone.now());
  }
}

export function stopAudio() {
  instrument?.releaseAll();
}
