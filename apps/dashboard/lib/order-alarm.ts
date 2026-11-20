// ─── New-order sound ────────────────────────────────────────────────────────
// A chime that repeats every few seconds while an online order is waiting to
// be accepted. It plays through an <audio> element on loop, because browsers
// keep audio going in a background tab but slow timers right down.
//
// Browsers only let a page make sound after someone has clicked or tapped on
// it. start() says whether it's playing, so the Orders page can ask for one
// click when it isn't. Browser only.

const RATE = 22050;
const LOOP_SECONDS = 4;

/** Two rising notes, then quiet, as a WAV file. */
function chimeWav(): Blob {
  const n = RATE * LOOP_SECONDS;
  const samples = new Int16Array(n);
  const note = (start: number, length: number, freq: number) => {
    const a = Math.floor(start * RATE), b = Math.min(n, a + Math.floor(length * RATE));
    for (let i = a; i < b; i++) {
      const t = (i - a) / RATE;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 6); // quick attack, soft fade
      samples[i] += Math.round(Math.sin(2 * Math.PI * freq * t) * env * 0.45 * 32767);
    }
  };
  note(0, 0.45, 880);
  note(0.22, 0.6, 1318.5);
  note(1.1, 0.45, 880);
  note(1.32, 0.6, 1318.5);

  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(samples);
  return new Blob([buf], { type: "audio/wav" });
}

let audio: HTMLAudioElement | null = null;

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(URL.createObjectURL(chimeWav()));
    audio.loop = true;
  }
  return audio;
}

export const orderAlarm = {
  /** Starts the chime. Resolves false if the browser wants a click first. */
  async start(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const a = element();
    if (!a.paused) return true;
    try { await a.play(); return true; } catch { return false; }
  },
  stop(): void {
    if (audio && !audio.paused) { audio.pause(); audio.currentTime = 0; }
  },
};

const PREF = "zb_order_sound";

/** Whether this device wants the sound. On unless someone turned it off. */
export function soundPreferred(): boolean {
  try { return localStorage.getItem(PREF) !== "off"; } catch { return true; }
}

export function setSoundPreferred(on: boolean): void {
  try { localStorage.setItem(PREF, on ? "on" : "off"); } catch { /* private mode */ }
}
