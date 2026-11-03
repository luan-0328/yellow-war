import Phaser from "phaser";
import { GAME } from "./gameConfig";
import { BootScene } from "../scenes/BootScene";
import { PreloadScene } from "../scenes/PreloadScene";
import { MenuScene } from "../scenes/MenuScene";
import { BattleScene } from "../scenes/BattleScene";
import { PauseScene } from "../scenes/PauseScene";
import { ResultScene } from "../scenes/ResultScene";
import { DrillScene } from "../scenes/DrillScene";

export function createGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: GAME.width,
    height: GAME.height,
    backgroundColor: "#252b2c",
    antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      BattleScene,
      PauseScene,
      ResultScene,
      DrillScene,
    ],
    callbacks: {
      postBoot(game) {
        game.canvas.setAttribute("role", "application");
        game.canvas.setAttribute(
          "aria-label",
          "Yellow War。Enter 开始，Tab 切换按钮，空格确认，Esc 返回。",
        );
        game.canvas.setAttribute("tabindex", "0");
      },
    },
  });
}
