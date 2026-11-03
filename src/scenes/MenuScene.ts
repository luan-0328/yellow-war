import { centerStage, compactUI } from "../ui/responsive";
import Phaser from "phaser";
import { drawWorld } from "../ui/WorldArt";
import { GameButton, bindButtonKeyboard, panel, text } from "../ui/primitives";
import { UNITS } from "../config/unitConfig";
import { Unit } from "../entities/Unit";
import { GAME, TITLE_FONT } from "../game/gameConfig";
import { audio } from "../services/AudioService";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }
  create() {
    centerStage(this);
    this.game.canvas.setAttribute(
      "aria-label",
      "Yellow War 主菜单。Enter 开始游戏，Tab 选择开始、兵种演练与音效。H 查看操作说明。",
    );
    drawWorld(this);
    const shade = this.add.graphics();
    shade.fillStyle(0x1a2c2b, 0.24).fillRect(0, 0, 1280, 720);
    shade.lineStyle(1, 0xf7de9b, 0.45).strokeRoundedRect(24, 24, 1232, 672, 8);
    text(this, 80, 65, "黄色伙伴战争", 20, "#ffdfa0");
    this.add.text(73, 112, "YELLOW", {
      fontFamily: TITLE_FONT,
      fontSize: "98px",
      fontStyle: "bold",
      color: "#ffe4a1",
      stroke: "#35413b",
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 5,
        color: "#18282180",
        blur: 1,
        fill: true,
      },
    });
    this.add.text(76, 202, "WAR", {
      fontFamily: TITLE_FONT,
      fontSize: "105px",
      fontStyle: "bold",
      color: "#ffe4a1",
      stroke: "#35413b",
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 5,
        color: "#18282180",
        blur: 1,
        fill: true,
      },
    });
    text(this, 82, 326, "经营矿脉，集结伙伴，赢下这场战争。", 17, "#fff0c9");
    const compact = compactUI(this);
    const fullscreen = this.scale.fullscreen.available
      ? new GameButton(
          this,
          1062,
          48,
          170,
          compact ? 86 : 48,
          "全屏游玩",
          () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
          },
        )
      : undefined;
    const start = new GameButton(
      this,
      82,
      compact ? 370 : 382,
      292,
      compact ? 82 : 64,
      "开始游戏",
      () => this.scene.start("Battle"),
      true,
    );
    const help = new GameButton(
      this,
      82,
      compact ? 468 : 463,
      292,
      compact ? 76 : 48,
      "兵种演练",
      () => this.scene.start("Drill"),
    );
    const sound = new GameButton(
      this,
      82,
      compact ? 559 : 528,
      292,
      compact ? 64 : 44,
      audio.settings.muted ? "音效：关闭" : "音效：开启",
      () => {
        audio.toggle();
        sound.setLabel(audio.settings.muted ? "音效：关闭" : "音效：开启");
      },
    );
    if (!compact)
      text(this, 83, 589, "Enter 开始  /  H 操作说明", 14, "#fff0c9");
    // All six official characters appear as large, unaltered illustrations.
    const xs = [484, 610, 735, 862, 994, 1140];
    const heights = [170, 185, 180, 210, 220, 325];
    UNITS.forEach((unit, i) => new Unit(this, unit, xs[i], 599, heights[i]));
    panel(this, 456, 626, 753, 41);
    text(this, 480, 634, "六位伙伴，一支军团。", 16, "#f9e8bc");
    text(this, 939, 636, "旷野集结 · 整军出征", 14, "#c8c6b3");
    text(this, 80, 645, `v${GAME.version}  /  黄色伙伴战争`, 14, "#f9e8bc");
    if (
      this.scene.settings.data &&
      (this.scene.settings.data as { help?: boolean }).help
    ) {
      const veil = this.add
        .rectangle(640, 360, 1280, 720, 0x142126, 0.78)
        .setDepth(1000)
        .setInteractive();
      const content = this.add.container(0, 0).setDepth(1001);
      const p = panel(this, 350, 180, 580, 400);
      const title = text(this, 392, 208, "出发之前", 30, "#f0c457");
      const body = text(
        this,
        392,
        269,
        "矿工自动采矿，返回营地交付金币。\n1–6 加入训练队列，训练完成后出营。\nA 进攻 · D 防守 · R 集合 · Esc 暂停。\n← → 或拖动查看战场，Home 回营。\n\n保护己方营地，摧毁敌方营地获胜。\n建议先补矿工，再搭配前排与远程。",
        18,
      );
      body.setLineSpacing(8);
      const close = new GameButton(this, 535, 467, 210, 48, "返回菜单", () =>
        this.scene.restart({ help: false }),
      );
      content.add([p, title, body, close]);
      veil.on("pointerdown", () => this.scene.restart({ help: false }));
      bindButtonKeyboard(this, [close], () =>
        this.scene.restart({ help: false }),
      );
    } else
      bindButtonKeyboard(
        this,
        [start, help, sound, ...(fullscreen ? [fullscreen] : [])],
        () => this.scene.start("Battle"),
      );
    this.input.keyboard?.once("keydown-ESC", () =>
      this.scene.restart({ help: false }),
    );
    this.input.keyboard?.once("keydown-H", () =>
      this.scene.restart({ help: true }),
    );
  }
}
