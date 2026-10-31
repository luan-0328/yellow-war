import Phaser from "phaser";
import { drawWorld } from "../ui/WorldArt";
import { GameButton, bindButtonKeyboard, panel, text } from "../ui/primitives";
import type { MatchState } from "../types/match";
import { audio } from "../services/AudioService";
export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }
  create(data: { match: MatchState }) {
    const match = data.match,
      won = match.status === "victory";
    drawWorld(this);
    this.add.rectangle(640, 360, 1280, 720, 0x15292b, 0.55);
    panel(this, 360, 115, 560, 490);
    text(
      this,
      640,
      151,
      won ? "旷野属于我们" : "伙伴们，来日再战",
      35,
      "#f0c457",
    ).setOrigin(0.5);
    text(
      this,
      640,
      218,
      won ? "胜利 · 敌方营地已被摧毁" : "战败 · 我方营地已被摧毁",
      18,
    ).setOrigin(0.5);
    const stats = [
      `战斗时长    ${Math.floor(match.elapsed / 60)} 分 ${Math.floor(match.elapsed % 60)} 秒`,
      `击败敌军    ${match.player.kills}`,
      `招募伙伴    ${match.player.recruited}`,
      `最终金币    ${Math.floor(match.player.gold)}`,
    ];
    text(this, 465, 278, stats.join("\n"), 21).setLineSpacing(14);
    const restart = new GameButton(
      this,
      425,
      484,
      208,
      this.scale.displaySize.width < 1000 ? 82 : 58,
      "再来一局",
      () => this.scene.start("Battle"),
      true,
    );
    const menu = new GameButton(
      this,
      648,
      484,
      208,
      this.scale.displaySize.width < 1000 ? 82 : 58,
      "返回主菜单",
      () => this.scene.start("Menu", { help: false }),
    );
    bindButtonKeyboard(this, [restart, menu], () => this.scene.start("Battle"));
    audio.play(won ? "victory" : "defeat");
    this.game.canvas.setAttribute(
      "aria-label",
      `${won ? "胜利" : "战败"}。击败敌军 ${match.player.kills}，招募 ${match.player.recruited}。Enter 再来一局。`,
    );
  }
}
