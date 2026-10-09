/** Petit moteur audio WebAudio sans asset : bips, succès, erreur, porte. */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.06, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  click(): void {
    this.tone(520, 0.06, "square", 0.04);
  }
  select(): void {
    this.tone(680, 0.05, "triangle", 0.05);
  }
  error(): void {
    this.tone(180, 0.22, "sawtooth", 0.05);
    this.tone(140, 0.28, "sawtooth", 0.04, 0.05);
  }
  success(): void {
    this.tone(523, 0.12, "sine", 0.06);
    this.tone(659, 0.12, "sine", 0.06, 0.1);
    this.tone(784, 0.2, "sine", 0.07, 0.2);
  }
  hint(): void {
    this.tone(400, 0.1, "sine", 0.05);
    this.tone(600, 0.14, "sine", 0.05, 0.08);
  }
  door(): void {
    this.tone(120, 0.35, "sine", 0.06);
    this.tone(240, 0.3, "triangle", 0.04, 0.08);
  }
  win(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, "sine", 0.07, i * 0.14));
  }
}
