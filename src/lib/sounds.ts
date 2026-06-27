let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playLikeSound() {
  playTone(523, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 60);
}

export function playUnlikeSound() {
  playTone(400, 0.1, 'sine', 0.08);
}

export function playSaveSound() {
  playTone(880, 0.05, 'square', 0.06);
}

export function playFollowSound() {
  playTone(523, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(784, 0.1, 'sine', 0.1), 80);
}

export function playUnfollowSound() {
  playTone(400, 0.08, 'sine', 0.08);
}

export function playTipSound() {
  playTone(988, 0.15, 'triangle', 0.1);
  setTimeout(() => playTone(1319, 0.2, 'triangle', 0.1), 100);
}

export function playNotificationSound() {
  playTone(660, 0.08, 'sine', 0.08);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.08), 100);
}
