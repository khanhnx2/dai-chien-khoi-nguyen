// Âm thanh tổng hợp bằng Web Audio (không cần file asset → chạy offline, deploy nhẹ).
// Singleton `sound` để mọi hệ thống (combat, roof, scene) gọi được.
// AudioContext chỉ chạy sau thao tác người dùng (chính sách trình duyệt) — tự resume khi phát.

type Sfx = 'spawn' | 'special' | 'win' | 'lose' | 'slash' | 'arrow' | 'egg' | 'water' | 'magic';

const THROTTLE_MS = 55; // chống trùng lặp SFX cùng loại quá dày

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterSfx: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private lastPlayed = new Map<Sfx, number>();

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null; // môi trường không phải trình duyệt (test Node)
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterSfx = this.ctx.createGain();
      this.masterSfx.gain.value = 0.9;
      this.masterSfx.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopMusic();
  }
  isMuted(): boolean {
    return this.muted;
  }

  // ---- SFX ----
  play(sfx: Sfx): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime * 1000;
    if (now - (this.lastPlayed.get(sfx) ?? -1e9) < THROTTLE_MS) return;
    this.lastPlayed.set(sfx, now);

    switch (sfx) {
      case 'spawn': return this.blip(220, 0.08, 'square', 0.15);
      case 'special': return this.sweep(400, 900, 0.25, 'triangle', 0.16);
      case 'win': return this.arpeggio([523, 659, 784]);
      case 'lose': return this.sweep(400, 120, 0.4, 'sawtooth', 0.16);
      case 'slash': return this.noise(0.09, 1600, 0.22); // chém: whoosh
      case 'arrow': return this.sweep(900, 420, 0.08, 'triangle', 0.14); // bắn tên: twang
      case 'egg': return this.sweep(300, 560, 0.11, 'sine', 0.16); // ném trứng: lob nhẹ
      case 'water': return this.noise(0.13, 3200, 0.18); // bắn nước: spray
      case 'magic': return this.magic(); // bắn phép: sparkle
    }
  }

  private osc(): { ctx: AudioContext; o: OscillatorNode; g: GainNode } | null {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterSfx) return null;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(this.masterSfx);
    return { ctx, o, g };
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number): void {
    const n = this.osc();
    if (!n) return;
    n.o.type = type;
    n.o.frequency.value = freq;
    n.g.gain.setValueAtTime(vol, n.ctx.currentTime);
    n.g.gain.exponentialRampToValueAtTime(0.001, n.ctx.currentTime + dur);
    n.o.start();
    n.o.stop(n.ctx.currentTime + dur);
  }

  private sweep(from: number, to: number, dur: number, type: OscillatorType, vol: number): void {
    const n = this.osc();
    if (!n) return;
    n.o.type = type;
    n.o.frequency.setValueAtTime(from, n.ctx.currentTime);
    n.o.frequency.linearRampToValueAtTime(to, n.ctx.currentTime + dur);
    n.g.gain.setValueAtTime(vol, n.ctx.currentTime);
    n.g.gain.exponentialRampToValueAtTime(0.001, n.ctx.currentTime + dur);
    n.o.start();
    n.o.stop(n.ctx.currentTime + dur);
  }

  private arpeggio(freqs: number[]): void {
    freqs.forEach((f, i) => {
      const n = this.osc();
      if (!n) return;
      const t = n.ctx.currentTime + i * 0.12;
      n.o.type = 'square';
      n.o.frequency.value = f;
      n.g.gain.setValueAtTime(0.14, t);
      n.g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      n.o.start(t);
      n.o.stop(t + 0.14);
    });
  }

  /** Tiếng "whoosh/spray": nhiễu trắng qua bandpass. */
  private noise(dur: number, filterFreq: number, vol: number): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterSfx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter).connect(g).connect(this.masterSfx);
    src.start();
    src.stop(ctx.currentTime + dur);
  }

  /** Tiếng phép "sparkle": 2 sine dịch cao + rung. */
  private magic(): void {
    [700, 1050].forEach((f, i) => {
      const n = this.osc();
      if (!n) return;
      const t = n.ctx.currentTime + i * 0.04;
      n.o.type = 'sine';
      n.o.frequency.setValueAtTime(f, t);
      n.o.frequency.linearRampToValueAtTime(f * 1.8, t + 0.14);
      n.g.gain.setValueAtTime(0.13, t);
      n.g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      n.o.start(t);
      n.o.stop(t + 0.16);
    });
  }

  // ---- Nhạc nền (loop arpeggio nhẹ nhàng) ----
  startMusic(): void {
    const ctx = this.ensureCtx();
    if (!ctx || this.musicTimer !== null) return;
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.06; // nền nhẹ, không át SFX
      this.musicGain.connect(ctx.destination);
    }
    // Vòng hợp âm 4 nhịp, mỗi nhịp rải vài nốt.
    const chords = [
      [262, 330, 392], // C
      [294, 349, 440], // Dm
      [349, 440, 523], // F
      [392, 494, 587], // G
    ];
    let bar = 0;
    const beatMs = 620;
    const playBar = () => {
      if (this.muted || !this.ctx || !this.musicGain) return;
      const notes = chords[bar % chords.length];
      notes.forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        const t = this.ctx!.currentTime + i * 0.14;
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g).connect(this.musicGain!);
        o.start(t);
        o.stop(t + 0.5);
      });
      bar++;
    };
    playBar();
    this.musicTimer = window.setInterval(playBar, beatMs);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

/** Singleton dùng chung toàn game. */
export const sound = new SoundManager();
