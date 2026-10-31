import Phaser from "phaser";
import { BALANCE } from "../config/balanceConfig";
import type { BattleModel } from "../game/BattleModel";
import { panel, text } from "./primitives";
export class HUD {
  private gold: Phaser.GameObjects.Text;
  private population: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private bars: Phaser.GameObjects.Graphics;
  private playerHp: Phaser.GameObjects.Text;
  private enemyHp: Phaser.GameObjects.Text;
  readonly notice: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene) {
    panel(scene, 20, 18, 1240, 86);
    text(scene, 40, 30, "Yellow War", 24, "#f0c457");
    this.gold = text(scene, 40, 66, "", 17, "#ffe4a1");
    this.population = text(scene, 205, 67, "", 16);
    text(scene, 360, 31, "我方营地", 14, "#9cdae0");
    text(scene, 705, 31, "敌方营地", 14, "#f1ae98");
    this.playerHp = text(scene, 466, 32, "", 13);
    this.enemyHp = text(scene, 813, 32, "", 13);
    this.bars = scene.add.graphics();
    this.timer = text(scene, 988, 48, "", 19).setOrigin(0.5);
    this.notice = text(
      scene,
      640,
      127,
      "先招募矿工壮大经济，再组建前排与远程部队。",
      17,
      "#ffe4a1",
    ).setOrigin(0.5);
    this.notice.setShadow(1, 2, "#24302b", 3, true, true);
  }
  update(model: BattleModel) {
    const s = model.state;
    this.gold.setText("金币  " + Math.floor(s.player.gold));
    this.population.setText(`人口  ${model.population("player")} / 30`);
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
      ["player", 360, 0x70b8c4],
      ["enemy", 705, 0xd88169],
    ] as const) {
      this.bars.fillStyle(0x101d20).fillRoundedRect(x, 65, 240, 10, 3);
      this.bars
        .fillStyle(color)
        .fillRect(x + 1, 66, (238 * s[team].baseHp) / BALANCE.baseHp, 8);
    }
  }
}
