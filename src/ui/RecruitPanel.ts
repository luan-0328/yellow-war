import { compactUI } from "./responsive";
import Phaser from "phaser";
import { UNITS } from "../config/unitConfig";
import { BALANCE } from "../config/balanceConfig";
import type { BattleModel } from "../game/BattleModel";
import type { UnitType } from "../types/unit";
import { GameButton, panel, text } from "./primitives";
export class RecruitPanel {
  readonly buttons: GameButton[] = [];
  private indicators: {
    badge: Phaser.GameObjects.Graphics;
    count: Phaser.GameObjects.Text;
    progress: Phaser.GameObjects.Graphics;
    status: Phaser.GameObjects.Text;
    width: number;
    height: number;
  }[] = [];
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
      const badge = scene.add.graphics();
      const count = text(
        scene,
        step - 30,
        compact ? 19 : 13,
        "",
        compact ? 21 : 15,
        "#fff1ba",
      ).setOrigin(0.5);
      const progress = scene.add.graphics();
      const status = text(
        scene,
        compact ? 48 : step - 65,
        compact ? 73 : 29,
        "",
        compact ? 17 : 12,
        "#fff1ba",
      );
      button.add([badge, count, progress, status]);
      this.indicators.push({
        badge,
        count,
        progress,
        status,
        width: step - 8,
        height: compact ? 100 : 54,
      });
      button.on("pointerover", () =>
        onHover(`${config.description}  训练 ${config.trainingTime} 秒`),
      );
      this.buttons.push(button);
    });
  }
  update(model: BattleModel) {
    this.buttons.forEach((button, i) => {
      const queue = model.training.player;
      const count = queue.filter((e) => e.unit.type === UNITS[i].type).length;
      const active =
        queue[0]?.unit.type === UNITS[i].type ? queue[0] : undefined;
      const indicator = this.indicators[i];
      const canRecruit =
        model.state.player.gold >= UNITS[i].cost &&
        model.reservedPopulation("player") < BALANCE.populationCap;
      button
        .setAlpha(canRecruit ? 1 : count ? 0.9 : 0.62)
        .setSelected(Boolean(active));
      indicator.badge.clear();
      if (count) {
        indicator.badge
          .fillStyle(0x182522, 0.98)
          .fillRoundedRect(indicator.width - 44, 2, 42, 28, 5);
        indicator.badge
          .lineStyle(1, 0xf0c457)
          .strokeRoundedRect(indicator.width - 44, 2, 42, 28, 5);
      }
      indicator.count.setText(count ? String(count) : "");
      indicator.status.setText(
        active ? `${Math.ceil(active.remaining)}秒` : count ? "等待" : "",
      );
      indicator.progress.clear();
      if (count) {
        indicator.progress
          .fillStyle(0x121e1c)
          .fillRect(5, indicator.height - 5, indicator.width - 10, 4);
        if (active)
          indicator.progress
            .fillStyle(0xf0c457)
            .fillRect(
              5,
              indicator.height - 5,
              (indicator.width - 10) * (1 - active.remaining / active.duration),
              4,
            );
      }
    });
  }
}
