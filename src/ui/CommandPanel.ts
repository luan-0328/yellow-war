import { compactUI } from "./responsive";
import Phaser from "phaser";
import type { Command } from "../types/match";
import { GameButton, panel } from "./primitives";
export class CommandPanel {
  readonly buttons: GameButton[] = [];
  constructor(scene: Phaser.Scene, onOrder: (order: Command) => void) {
    const compact = compactUI(scene);
    panel(scene, 20, 116, 435, compact ? 118 : 64);
    (["advance", "hold", "rally"] as Command[]).forEach((command, i) => {
      const labels = compact
        ? ["进攻", "防守", "集合"]
        : ["进攻  [A]", "防守  [D]", "集合  [R]"];
      this.buttons.push(
        new GameButton(
          scene,
          30 + i * 142,
          126,
          132,
          compact ? 82 : 42,
          labels[i],
          () => onOrder(command),
        ),
      );
    });
  }
  update(order: Command) {
    this.buttons.forEach((button, i) =>
      button.setSelected(["advance", "hold", "rally"][i] === order),
    );
  }
}
