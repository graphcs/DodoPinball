/**
 * Procedural audio using Web Audio API.
 * No external sound files needed.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    // Audio context created on first user interaction
    const initAudio = () => {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('keydown', initAudio);
    window.addEventListener('touchstart', initAudio);
  }

  private ensureContext(): boolean {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx !== null && this.masterGain !== null;
  }

  playFlipperUp() {
    if (!this.ensureContext()) return;
    this.playTone(200, 0.05, 'square', 0.15, 300);
  }

  playFlipperDown() {
    if (!this.ensureContext()) return;
    this.playTone(150, 0.04, 'square', 0.1);
  }

  playBumperHit() {
    if (!this.ensureContext()) return;
    this.playTone(600, 0.08, 'sine', 0.2, 200);
    this.playNoise(0.05, 0.15);
  }

  playSlingshotHit() {
    if (!this.ensureContext()) return;
    this.playTone(400, 0.06, 'triangle', 0.12, 150);
  }

  playDropTargetHit() {
    if (!this.ensureContext()) return;
    this.playTone(500, 0.1, 'sine', 0.15, 300);
  }

  playSpinnerSpin() {
    if (!this.ensureContext()) return;
    this.playTone(800, 0.03, 'sine', 0.05);
  }

  playRollover() {
    if (!this.ensureContext()) return;
    this.playTone(1000, 0.05, 'sine', 0.1, 200);
  }

  playRampComplete() {
    if (!this.ensureContext()) return;
    // Ascending arpeggio
    this.playTone(400, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.1), 80);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.1), 160);
    setTimeout(() => this.playTone(800, 0.15, 'sine', 0.12), 240);
  }

  playBankComplete() {
    if (!this.ensureContext()) return;
    // Fanfare
    this.playTone(523, 0.15, 'sine', 0.12);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.12), 120);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.15), 240);
    setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.18), 400);
  }

  playDrain() {
    if (!this.ensureContext()) return;
    this.playTone(200, 0.3, 'sine', 0.2, 80);
  }

  playPlungerCharge() {
    if (!this.ensureContext()) return;
    this.playTone(100, 0.02, 'sawtooth', 0.05, 120);
  }

  playPlungerRelease() {
    if (!this.ensureContext()) return;
    this.playTone(300, 0.1, 'sawtooth', 0.15, 100);
    this.playNoise(0.08, 0.1);
  }

  playExtraBall() {
    if (!this.ensureContext()) return;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.1), i * 100);
    });
  }

  playGameOver() {
    if (!this.ensureContext()) return;
    this.playTone(400, 0.3, 'sine', 0.15, 200);
    setTimeout(() => this.playTone(300, 0.3, 'sine', 0.15, 150), 300);
    setTimeout(() => this.playTone(200, 0.5, 'sine', 0.15, 100), 600);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFreq?: number,
  ) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (endFreq) {
      osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume: number) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(this.ctx.currentTime);
  }
}
