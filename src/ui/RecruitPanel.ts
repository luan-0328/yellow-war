import Phaser from "phaser";
import { UNITS } from "../config/unitConfig";
import type { BattleModel } from "../game/BattleModel";
import type { UnitType } from "../types/unit";
import { GameButton, panel, text } from "./primitives";
export class RecruitPanel {
  readonly buttons: GameButton[] = [];
  constructor(
    scene: Phaser.Scene,
    onRecruit: (type: UnitType) => void,
    onHover: (message: string) => void,
  ) {
    const compact = scene.scale.displaySize.width < 1000;
    panel(scene, 20, compact ? 608 : 632, 1240, compact ? 98 : 73);
    UNITS.forEach((config, i) => {
      const x = 32 + i * 166;
      const button = new GameButton(
        scene,
        x,
        compact ? 615 : 641,
        158,
        compact ? 82 : 54,
        `${config.name}  ${config.cost}`,
        () => onRecruit(config.type),
      );
      // Official PNG thumbnails accompany a generous canvas hit area.
      button.setLabel("");
      const icon = scene.add
        .image(25, compact ? 73 : 50, `${config.type}-display`, "body")
        .setOrigin(0.5, 1);
      icon.setScale((compact ? 66 : 47) / icon.height);
      button.add([
        icon,
        text(scene, 48, compact ? 16 : 7, config.name, compact ? 21 : 16),
        text(
          scene,
          48,
          compact ? 49 : 29,
          compact ? `${config.cost} 金币` : `${config.cost} 金币   [${i + 1}]`,
          compact ? 18 : 12,
          "#f0c457",
        ),
      ]);
      button.on("pointerover", () => onHover(config.description));
      this.buttons.push(button);
    });
    text(scene, 1051, 643, "招募伙伴", 17, "#f0c457");
    text(scene, 1052, 674, "点击或按 1–6", 13, "#c8c6b3");
  }
  update(model: BattleModel) {
    this.buttons.forEach((button, i) => {
      button.setAlpha(model.state.player.gold >= UNITS[i].cost ? 1 : 0.62);
    });
  }
}
