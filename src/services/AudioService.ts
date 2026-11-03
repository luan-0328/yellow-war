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
  play(
    kind:
      | "click"
      | "attack"
      | "deposit"
      | "hit"
      | "victory"
      | "defeat"
      | "slash"
      | "bow"
      | "magic"
      | "heavy"
      | "mine",
  ) {
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
      slash: 320,
      bow: 560,
      magic: 720,
      heavy: 70,
      mine: 1100,
    }[kind];
    const duration =
      kind === "victory" || kind === "defeat"
        ? 0.7
        : kind === "heavy"
          ? 0.24
          : kind === "magic"
            ? 0.19
            : 0.09;
    o.type =
      kind === "hit" || kind === "slash" || kind === "mine"
        ? "triangle"
        : "sine";
    o.frequency.setValueAtTime(frequency, now);
    o.frequency.exponentialRampToValueAtTime(
      kind === "victory"
        ? 990
        : frequency * (kind === "bow" ? 0.25 : kind === "magic" ? 1.4 : 0.65),
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
