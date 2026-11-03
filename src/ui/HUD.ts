import { compactUI } from "./responsive";
import Phaser from "phaser";
import { BALANCE } from "../config/balanceConfig";
import type { BattleModel } from "../game/BattleModel";
import { panel, text } from "./primitives";
export class HUD {
  private barX = [360, 705];
  private gold: Phaser.GameObjects.Text;
  private population: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private bars: Phaser.GameObjects.Graphics;
  private playerHp: Phaser.GameObjects.Text;
  private enemyHp: Phaser.GameObjects.Text;
  readonly notice: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene) {
    const compact = compactUI(scene);
    const width = scene.scale.gameSize.width;
    const playerX = Math.max(360, width * 0.32);
    const enemyX = Math.max(705, width * 0.58);
    this.barX = [playerX, enemyX];
    panel(scene, 20, 18, width - 40, compact ? 100 : 86);
    text(scene, 40, 30, "Yellow War", 24, "#f0c457");
    this.gold = text(scene, 40, 66, "", compact ? 22 : 17, "#ffe4a1");
    this.population = text(scene, 205, 67, "", compact ? 20 : 16);
    text(scene, playerX, 31, "我方营地", 14, "#9cdae0");
    text(scene, enemyX, 31, "敌方营地", 14, "#f1ae98");
    this.playerHp = text(scene, playerX + 106, 32, "", 13);
    this.enemyHp = text(scene, enemyX + 108, 32, "", 13);
    this.bars = scene.add.graphics();
    this.timer = text(scene, width - 292, 48, "", 19).setOrigin(0.5);
    this.notice = text(
      scene,
      compact ? width / 2 : (470 + width - 20) / 2,
      compact ? 254 : 145,
      "先招募矿工壮大经济，再组建前排与远程部队。",
      compact ? 20 : 16,
      "#ffe4a1",
    ).setOrigin(0.5);
    if (!compact) panel(scene, 470, 116, width - 490, 64).setDepth(1);
    this.notice
      .setDepth(2)
      .setWordWrapWidth(width - 500)
      .setAlign("center");
    this.notice.setShadow(1, 2, "#24302b", 3, true, true);
  }
  update(model: BattleModel) {
    const s = model.state;
    this.gold.setText("金币  " + Math.floor(s.player.gold));
    this.population.setText(
      `人口 ${model.population("player")}+${model.training.player.length} / 30`,
    );
    this.timer.setText(
      `${Math.floor(s.elapsed / 60)
        .toString()
        .padStart(2, "0")}:${Math.floor(s.elapsed % 60)
        .toString()
        .padStart(2, "0")}`,
    );
    this.playerHp.setText(`${Math.ceil(s.player.baseHp)} / 1800`);
    this.enemyHp.setText(`${Math.ceil(s.enemy.baseHp)} / 1800`);
    this.bars.clear();
    for (const [team, x, color] of [
      ["player", this.barX[0], 0x70b8c4],
      ["enemy", this.barX[1], 0xd88169],
    ] as const) {
      this.bars.fillStyle(0x101d20).fillRoundedRect(x, 65, 240, 10, 3);
      this.bars
        .fillStyle(color)
        .fillRect(x + 1, 66, (238 * s[team].baseHp) / BALANCE.baseHp, 8);
    }
  }
}
