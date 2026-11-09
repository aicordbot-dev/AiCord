/**
 * src/lib/audio.ts
 * Subtle, procedural WebAudio micro-feedback synthesizer for AiCord.
 * 100% zero audio files: synthesizes pure WebAudio oscillators with smooth exponential envelopes.
 * Muted by default so it never plays unprompted.
 */

// Storage key for sound preference
const SOUND_STORAGE_KEY = 'aicord_sound_enabled';
const SOUND_EVENT_NAME = 'aicord_sound_change';

// Shared WebAudio context (lazy-initialized upon user gesture)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Check whether sound feedback is enabled. Defaults to false (muted).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable or disable sound feedback.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent(SOUND_EVENT_NAME, { detail: { enabled } }));
    if (enabled) {
      getAudioContext();
      // Soft chime confirmation when enabled
      playChime();
    }
  } catch {
    // ignore
  }
}

/**
 * Toggle sound feedback on/off. Returns the new state.
 */
export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  return next;
}

/**
 * Subscribe to sound enabled state changes.
 */
export function onSoundStateChange(callback: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ enabled: boolean }>;
    callback(custom.detail?.enabled ?? isSoundEnabled());
  };
  window.addEventListener(SOUND_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(SOUND_EVENT_NAME, handler);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL SOUND SYNTHESIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft subtle click / pop sound (e.g. for tabs, buttons, chips).
 */
export function playPop(freq = 420): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Coin flip chime / bell ring (dual harmonic crystal tone).
 */
export function playChime(freq1 = 880, freq2 = 1320): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq1, now);
    osc2.frequency.setValueAtTime(freq2, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Card flick / deal sound (crisp snap for blackjack & crates).
 */
export function playCard(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore
  }
}

/**
 * Positive success sound (ascending arpeggio C5 -> E5 -> G5).
 */
export function playSuccess(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.23);
    });
  } catch {
    // Ignore
  }
}

/**
 * Mystery Crate Unbox fanfare (rising sweep + sparkling chords).
 */
export function playUnbox(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Rising sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(260, now);
    sweep.frequency.exponentialRampToValueAtTime(987.77, now + 0.3); // B5

    sweepGain.gain.setValueAtTime(0.07, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(now);
    sweep.stop(now + 0.36);

    // Sparkle chime after sweep
    setTimeout(() => {
      playSuccess();
    }, 280);
  } catch {
    // Ignore
  }
}
