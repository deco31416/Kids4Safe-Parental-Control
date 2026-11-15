const SOUND_URL = '/sounds/monitor-alarma.mp3';

/** Owns every audio resource so dismissing an alert also cancels pending playback. */
export class EmergencyAlarm {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private oscillators = new Set<OscillatorNode>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private active = false;
  private blocked = false;

  constructor(private readonly onBlocked: (blocked: boolean) => void) {}

  private isCurrent(generation: number) {
    return this.active && this.generation === generation;
  }

  private setBlocked(blocked: boolean, generation: number) {
    if (!this.isCurrent(generation)) return;
    this.blocked = blocked;
    this.onBlocked(blocked);
  }

  start() {
    this.stop();
    this.active = true;
    const generation = this.generation;
    void this.playCustom(generation).catch(async () => {
      if (!this.isCurrent(generation)) return;
      const beep = () => this.playBeep(generation).catch(() => this.setBlocked(true, generation));
      await beep();
      if (this.isCurrent(generation)) this.interval = setInterval(() => void beep(), 1200);
    });
  }

  retry() {
    if (this.active && this.blocked) this.start();
  }

  stop() {
    this.active = false;
    this.blocked = false;
    this.generation++;
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    for (const oscillator of this.oscillators) {
      try { oscillator.stop(); } catch { /* Already stopped. */ }
      oscillator.disconnect();
    }
    this.oscillators.clear();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  private async playCustom(generation: number) {
    const audio = new Audio(SOUND_URL);
    this.audio = audio;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1;
    await audio.play();
    if (!this.isCurrent(generation)) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    this.setBlocked(false, generation);
  }

  private async playBeep(generation: number) {
    if (!this.isCurrent(generation)) return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      this.setBlocked(true, generation);
      return;
    }
    const context: AudioContext = this.context || new AudioContextCtor();
    this.context = context;
    if (context.state === 'suspended') {
      // Some browsers leave resume pending until a user gesture instead of rejecting it.
      this.setBlocked(true, generation);
      await context.resume();
    }
    if (!this.isCurrent(generation)) return;
    if (context.state !== 'running') {
      this.setBlocked(true, generation);
      return;
    }
    const now = context.currentTime;
    for (const [offset, frequency] of [[0, 880], [0.22, 1175], [0.44, 880]]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.34, now + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      this.oscillators.add(oscillator);
      oscillator.onended = () => {
        this.oscillators.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.18);
    }
    this.setBlocked(false, generation);
  }
}
