import { compactUI } from "./responsive";
import Phaser from "phaser";
import { COLORS, FONT } from "../game/gameConfig";
import { audio } from "../services/AudioService";

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 18,
  color = "#f9e8bc",
) {
  return scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    padding: { top: 3, bottom: 3 },
  });
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const g = scene.add.graphics();
  g.fillStyle(0x101b20, 0.3).fillRoundedRect(x, y + 5, width, height, 8);
  g.fillStyle(COLORS.ink, 0.96).fillRoundedRect(x, y, width, height, 8);
  g.lineStyle(1, 0x9f915c, 0.7).strokeRoundedRect(x, y, width, height, 8);
  g.lineStyle(1, 0xf3d38a, 0.12).lineBetween(
    x + 12,
    y + 2,
    x + width - 12,
    y + 2,
  );
  return g;
}

export class GameButton extends Phaser.GameObjects.Container {
  private plate: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private focused = false;
  private enabled = true;
  private selected = false;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private buttonWidth: number,
    private buttonHeight: number,
    label: string,
    private action: () => void,
    private primary = false,
  ) {
    super(scene, x, y);
    if (compactUI(scene)) {
      buttonHeight = Math.max(
        buttonHeight,
        scene.sys.settings.key === "Battle" ? 100 : 86,
      );
      this.buttonHeight = buttonHeight;
    }
    scene.add.existing(this);
    this.plate = scene.add.graphics();
    this.label = text(
      scene,
      buttonWidth / 2,
      buttonHeight / 2,
      label,
      primary ? 24 : 18,
    ).setOrigin(0.5);
    this.add([this.plate, this.label]);
    this.setSize(buttonWidth, buttonHeight).setInteractive(
      new Phaser.Geom.Rectangle(
        buttonWidth / 2,
        buttonHeight / 2,
        buttonWidth,
        buttonHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input!.cursor = "pointer";
    this.on("pointerover", () => this.focus(true));
    this.on("pointerout", () => this.focus(false));
    this.on("pointerdown", () => {
      if (this.enabled) this.setY(y + 2);
    });
    this.on("pointerup", () => {
      this.setY(y);
      this.activate();
    });
    const release = () => {
      if (this.active) this.setY(y);
    };
    scene.input.on("pointerup", release);
    this.once("destroy", () => scene.input.off("pointerup", release));
    this.draw();
  }
  activate() {
    if (this.enabled) {
      audio.unlock();
      audio.play("click");
      this.action();
    }
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    this.setAlpha(value ? 1 : 0.5);
    return this;
  }
  setSelected(value: boolean) {
    if (this.selected !== value) {
      this.selected = value;
      this.draw();
    }
    return this;
  }
  setLabel(label: string) {
    this.label.setText(label);
    return this;
  }
  focus(value: boolean) {
    this.focused = value;
    this.draw();
  }
  private draw() {
    const g = this.plate.clear();
    g.fillStyle(0x131b1b, 0.45).fillRoundedRect(
      0,
      5,
      this.buttonWidth,
      this.buttonHeight,
      5,
    );
    g.fillStyle(
      this.primary
        ? this.focused
          ? 0xffdb79
          : 0xe9b94c
        : this.focused
          ? 0x45514b
          : 0x2c3835,
      0.97,
    ).fillRoundedRect(0, 0, this.buttonWidth, this.buttonHeight, 5);
    g.lineStyle(
      this.focused || this.selected ? 2 : 1,
      this.focused || this.selected ? 0xffedb2 : 0xab945f,
    ).strokeRoundedRect(1, 1, this.buttonWidth - 2, this.buttonHeight - 2, 5);
    g.lineStyle(1, 0xfff1be, this.primary ? 0.55 : 0.13).lineBetween(
      9,
      3,
      this.buttonWidth - 9,
      3,
    );
    if (this.primary) {
      g.fillStyle(0x68501e).fillTriangle(
        this.buttonWidth - 37,
        this.buttonHeight / 2 - 7,
        this.buttonWidth - 37,
        this.buttonHeight / 2 + 7,
        this.buttonWidth - 28,
        this.buttonHeight / 2,
      );
      this.label.setColor("#332c1d");
    }
  }
}

export function bindButtonKeyboard(
  scene: Phaser.Scene,
  buttons: GameButton[],
  defaultAction?: () => void,
) {
  let focused = -1;
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  keyboard.addCapture(["TAB", "SPACE", "ENTER", "ESC"]);
  const handler = (event: KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      buttons[focused]?.focus(false);
      focused =
        (focused + (event.shiftKey ? buttons.length - 1 : 1) + buttons.length) %
        buttons.length;
      buttons[focused]?.focus(true);
    }
    if (event.key === "Enter" || event.code === "Space") {
      if (focused >= 0 && buttons[focused]?.active)
        buttons[focused]?.activate();
      else if (event.key === "Enter") defaultAction?.();
    }
  };
  keyboard.on("keydown", handler);
  scene.events.once("shutdown", () => {
    keyboard.off("keydown", handler);
    keyboard.removeCapture(["TAB", "SPACE", "ENTER", "ESC"]);
  });
}
