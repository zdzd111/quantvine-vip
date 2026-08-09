let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain = 0.045) {
  const ac = context();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0.0001, ac.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

/** Soft two-note chime for completed tasks / balance updates. */
export function playSuccess() {
  try {
    tone(880, 0, 0.16);
    tone(1318.5, 0.11, 0.22);
  } catch {
    /* audio is optional */
  }
}

/** Short click used for copy / submit confirmations. */
export function playTap() {
  try {
    tone(620, 0, 0.08, 0.03);
  } catch {
    /* audio is optional */
  }
}

export function playError() {
  try {
    tone(320, 0, 0.14, 0.035);
    tone(220, 0.1, 0.18, 0.035);
  } catch {
    /* audio is optional */
  }
}
