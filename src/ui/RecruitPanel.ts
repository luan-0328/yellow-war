import { compactUI } from "./responsive";
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
    const compact = compactUI(scene);
    const width = scene.scale.gameSize.width;
    const step = (width - 64) / 6;
    panel(scene, 20, compact ? 608 : 632, width - 40, compact ? 106 : 73);
    UNITS.forEach((config, i) => {
      const x = 32 + i * step;
      const button = new GameButton(
        scene,
        x,
        compact ? 615 : 641,
        step - 8,
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
          `${config.cost}金 · ${config.trainingTime}秒`,
          compact ? 15 : 12,
          "#f0c457",
        ),
      ]);
      button.on("pointerover", () =>
        onHover(`${config.description}  训练 ${config.trainingTime} 秒`),
      );
      this.buttons.push(button);
    });
  }
  update(model: BattleModel) {
    this.buttons.forEach((button, i) => {
      button.setAlpha(
        model.state.player.gold >= UNITS[i].cost &&
          model.training.player.length < 5 &&
          model.reservedPopulation("player") < 30
          ? 1
          : 0.62,
      );
    });
  }
}
