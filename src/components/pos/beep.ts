const STORAGE_KEY = "pharmacy.counterSound";

let muted = false;
let read = false;
let context: AudioContext | null = null;

/** The stored preference, read once — localStorage isn't there on the server. */
function ensureRead() {
  if (read) return;
  read = true;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    // Private windows and locked-down browsers: just leave the sound on.
  }
}

export function soundIsOn(): boolean {
  ensureRead();
  return !muted;
}

export function setSoundOn(on: boolean) {
  ensureRead();
  muted = !on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Not worth failing a sale over.
  }
}

/**
 * A short rising click when something lands in the basket — the same
 * reassurance a shop till gives, so the cashier can keep their eyes on the
 * customer and still know the scan or the keystroke took. Synthesised rather
 * than loaded from a file: nothing to download, and it works offline.
 */
export function beep() {
  ensureRead();
  if (muted) return;
  try {
    context ??= new AudioContext();
    // Browsers hold audio until the first gesture; adding an item is one.
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(880, now);
    tone.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
    // Ramped rather than switched on: a square edge would click.
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    tone.connect(volume).connect(context.destination);
    tone.start(now);
    tone.stop(now + 0.13);
  } catch {
    // No audio on this machine — the flash and the badge still say it landed.
  }
}
