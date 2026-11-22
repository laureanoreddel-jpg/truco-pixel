/** Soniditos chiptune generados con WebAudio, sin archivos de audio. */
export class AudioFx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.05, delay = 0): void {
    const ctx = this.context();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  click(): void {
    this.beep(420, 0.06, 'square', 0.035);
  }

  card(): void {
    this.beep(220, 0.05, 'triangle', 0.05);
    this.beep(330, 0.05, 'triangle', 0.03, 0.04);
  }

  truco(): void {
    this.beep(392, 0.09, 'square', 0.05);
    this.beep(523, 0.09, 'square', 0.05, 0.09);
    this.beep(659, 0.16, 'square', 0.05, 0.18);
  }

  win(): void {
    [523, 659, 784, 1046].forEach((freq, i) => this.beep(freq, 0.14, 'square', 0.045, i * 0.1));
  }

  lose(): void {
    [392, 330, 262].forEach((freq, i) => this.beep(freq, 0.18, 'sawtooth', 0.035, i * 0.12));
  }
}
