import Phaser from "phaser";
import type { Command } from "../types/match";
import { GameButton, panel, text } from "./primitives";
export class CommandPanel {
  readonly buttons: GameButton[] = [];
  constructor(scene: Phaser.Scene, onOrder: (order: Command) => void) {
    const compact = scene.scale.displaySize.width < 1000;
    panel(scene, 355, 167, 570, compact ? 102 : 62);
    (["advance", "hold", "rally"] as Command[]).forEach((command, i) => {
      const labels = compact
        ? ["进攻", "防守", "集合"]
        : ["进攻  [A]", "防守  [D]", "集合  [R]"];
      this.buttons.push(
        new GameButton(
          scene,
          369 + i * 183,
          177,
          171,
          compact ? 82 : 42,
          labels[i],
          () => onOrder(command),
        ),
      );
    });
    if (!compact)
      text(scene, 640, 238, "摧毁敌方营地，守护黄色伙伴。", 14, "#fff1c8")
        .setOrigin(0.5)
        .setShadow(1, 2, "#24302b", 2, true, true);
  }
  update(order: Command) {
    this.buttons.forEach((button, i) =>
      button.setSelected(["advance", "hold", "rally"][i] === order),
    );
  }
}
