import Phaser from "phaser";
import { GameButton, bindButtonKeyboard, panel, text } from "../ui/primitives";
import { audio } from "../services/AudioService";
export class PauseScene extends Phaser.Scene {
  constructor() {
    super("Pause");
  }
  create() {
    const compact = this.scale.displaySize.width < 1000;
    this.add.rectangle(640, 360, 1280, 720, 0x132327, 0.78).setInteractive();
    panel(this, 350, compact ? 80 : 143, 580, compact ? 570 : 434);
    text(this, 640, compact ? 116 : 172, "战场已暂停", 32, "#f0c457").setOrigin(
      0.5,
    );
    text(
      this,
      640,
      compact ? 173 : 230,
      "所有单位、采矿、投射物与 AI 计时已冻结",
      16,
    ).setOrigin(0.5);
    const resume = () => {
      this.game.events.emit("resume-match");
      this.scene.stop();
    };
    const continueButton = new GameButton(
      this,
      465,
      compact ? 212 : 275,
      350,
      compact ? 82 : 56,
      "继续战斗",
      resume,
      true,
    );
    const volume = text(
      this,
      640,
      compact ? 355 : 358,
      volumeLabel(),
      18,
    ).setOrigin(0.5);
    const update = (delta: number) => {
      audio.setVolume(Math.round((audio.settings.volume + delta) * 100) / 100);
      volume.setText(volumeLabel());
      audio.play("click");
    };
    const minus = new GameButton(
      this,
      465,
      compact ? 316 : 345,
      compact ? 82 : 52,
      compact ? 82 : 44,
      "−",
      () => update(-0.1),
    );
    const plus = new GameButton(
      this,
      compact ? 733 : 763,
      compact ? 316 : 345,
      compact ? 82 : 52,
      compact ? 82 : 44,
      "+",
      () => update(0.1),
    );
    const mute = new GameButton(
      this,
      465,
      compact ? 420 : 410,
      350,
      compact ? 82 : 45,
      "切换静音",
      () => {
        audio.toggle();
        volume.setText(volumeLabel());
      },
    );
    const menu = new GameButton(
      this,
      465,
      compact ? 522 : 474,
      350,
      compact ? 82 : 48,
      "结束本局并返回菜单",
      () => {
        this.scene.stop("Battle");
        this.scene.start("Menu", { help: false });
      },
    );
    bindButtonKeyboard(this, [continueButton, minus, plus, mute, menu], resume);
    this.input.keyboard?.once("keydown-ESC", resume);
  }
}
function volumeLabel() {
  return audio.settings.muted
    ? "音效已关闭"
    : `音量  ${Math.round(audio.settings.volume * 100)}%`;
}
