import { LocalSettings } from "./LocalSettings";
/** Lightweight original synthesized cues. No missing external audio files or autoplay. */
class AudioService {
  settings = LocalSettings.load();
  private context?: AudioContext;
  private last = 0;
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {
      /* Audio is optional. */
    }
  }
  setVolume(volume: number) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.settings.muted = volume === 0;
    LocalSettings.save(this.settings);
  }
  toggle() {
    this.settings.muted = !this.settings.muted;
    LocalSettings.save(this.settings);
    this.unlock();
  }
  play(kind: "click" | "attack" | "deposit" | "hit" | "victory" | "defeat") {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.settings.muted ||
      !this.settings.volume
    )
      return;
    const now = c.currentTime;
    if (kind === "hit" && now - this.last < 0.09) return;
    this.last = now;
    const o = c.createOscillator(),
      g = c.createGain();
    const frequency = {
      click: 480,
      attack: 180,
      deposit: 880,
      hit: 95,
      victory: 660,
      defeat: 170,
    }[kind];
    const duration = kind === "victory" || kind === "defeat" ? 0.7 : 0.09;
    o.type = kind === "hit" ? "triangle" : "sine";
    o.frequency.setValueAtTime(frequency, now);
    o.frequency.exponentialRampToValueAtTime(
      kind === "victory" ? 990 : frequency * 0.65,
      now + duration,
    );
    g.gain.setValueAtTime(this.settings.volume * 0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.connect(g);
    g.connect(c.destination);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start(now);
    o.stop(now + duration);
  }
}
export const audio = new AudioService();
