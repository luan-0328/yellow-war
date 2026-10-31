export interface Settings {
  volume: number;
  muted: boolean;
}
const KEY = "yellow-war-settings-v1";
export class LocalSettings {
  static load(): Settings {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        volume:
          typeof data.volume === "number" && Number.isFinite(data.volume)
            ? Math.max(0, Math.min(1, data.volume))
            : 0.45,
        muted: data.muted === true,
      };
    } catch {
      return { volume: 0.45, muted: false };
    }
  }
  static save(settings: Settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* Private/storage-restricted browsers can still play. */
    }
  }
}
