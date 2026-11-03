import { centerStage } from "../ui/responsive";
import Phaser from "phaser";
import { UNITS } from "../config/unitConfig";
import { prepareCharacterTexture } from "../services/prepareCharacterTexture";
import { FONT } from "../game/gameConfig";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }
  preload() {
    centerStage(this);
    document.querySelector<HTMLElement>("#load-status")!.hidden = true;
    this.add
      .text(640, 310, "Yellow War", {
        fontFamily: "Georgia",
        fontSize: "54px",
        color: "#f0c457",
      })
      .setOrigin(0.5);
    const status = this.add
      .text(640, 425, "准备角色素材…", {
        fontFamily: FONT,
        fontSize: "18px",
        color: "#f9e8bc",
      })
      .setOrigin(0.5);
    this.add.rectangle(640, 385, 360, 4, 0x51534a);
    const bar = this.add.rectangle(460, 385, 1, 4, 0xf0c457).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => {
      bar.width = 360 * value;
    });
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.registry.set("assetError", true);
      status
        .setText(`素材加载失败：${file.key}\n请刷新页面重试。`)
        .setColor("#ffa18d");
      console.error(`Character asset failed: ${file.url}`);
    });
    for (const unit of UNITS)
      this.load.image(
        unit.type,
        `${import.meta.env.BASE_URL}assets/characters/${unit.type}.png`,
      );
  }
  create() {
    if (this.registry.get("assetError")) return;
    for (const unit of UNITS) {
      prepareCharacterTexture(this, unit.type);
    }
    this.scene.start(
      ["drill", "formation"].includes(
        new URLSearchParams(window.location.search).get("view") || "",
      )
        ? "Drill"
        : "Menu",
    );
  }
}
