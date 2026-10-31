import Phaser from "phaser";
import type { Team, UnitConfig, UnitRuntime } from "../types/unit";
import { BALANCE } from "../config/balanceConfig";
import { COLORS } from "../game/gameConfig";

/** Unaltered static character artwork; movements and feedback transform the whole image. */
export class Unit {
  readonly sprite: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Graphics;
  private health?: Phaser.GameObjects.Graphics;
  constructor(
    scene: Phaser.Scene,
    readonly config: UnitConfig,
    public x: number,
    public footY: number,
    height = config.displayHeight,
    team: Team = "player",
  ) {
    this.marker = scene.add.graphics().setDepth(footY - 0.5);
    this.sprite = scene.add
      .image(x, footY, `${config.type}-display`, "body")
      .setOrigin(0.5, 1)
      .setDepth(footY);
    this.sprite.setScale(height / this.sprite.height);
    this.setTeam(team);
  }
  sync(scene: Phaser.Scene, unit: UnitRuntime) {
    this.x = unit.x;
    this.footY = unit.y;
    this.sprite.setPosition(unit.x, unit.y).setDepth(unit.y);
    this.marker.setDepth(unit.y - 0.5);
    this.setTeam(unit.team);
    this.health ??= scene.add.graphics();
    const y = unit.y - this.config.displayHeight - 12;
    this.health
      .clear()
      .setDepth(630)
      .fillStyle(0x152326, 0.85)
      .fillRoundedRect(unit.x - 23, y, 46, 5, 2);
    this.health
      .fillStyle(unit.team === "player" ? COLORS.blue : COLORS.red)
      .fillRect(unit.x - 22, y + 1, (44 * unit.hp) / this.config.maxHp, 3);
    if (unit.carrying)
      this.health.fillStyle(COLORS.gold).fillCircle(unit.x + 30, y + 3, 4);
    if (unit.hitTimer > 0) {
      this.sprite.setTint(0xffefcf);
      this.sprite.setTintMode(Phaser.TintModes.FILL);
    } else this.sprite.clearTint();
    const deadAlpha =
      unit.hp > 0
        ? 1
        : Math.max(0, 1 - unit.deathTimer / BALANCE.deathDuration);
    this.sprite.setAlpha(
      deadAlpha *
        (unit.state === "spawning"
          ? 0.5 + 0.5 * (1 - unit.timer / BALANCE.spawnDuration)
          : 1),
    );
    this.marker.setAlpha(deadAlpha);
    this.health.setAlpha(deadAlpha);
    this.sprite.setAngle(
      unit.state === "attacking" &&
        unit.attackTimer > this.config.attackInterval - 0.15
        ? unit.team === "player"
          ? 3
          : -3
        : 0,
    );
  }
  destroy() {
    this.sprite.destroy();
    this.marker.destroy();
    this.health?.destroy();
  }
  setTeam(team: Team, selected = false) {
    this.sprite.setFlipX(team === "enemy");
    const width = Math.max(55, this.sprite.displayWidth * 0.77);
    this.marker
      .clear()
      .fillStyle(0x222a24, 0.23)
      .fillEllipse(this.x, this.footY + 1, width + 12, 13);
    this.marker.lineStyle(
      selected ? 2 : 1.5,
      team === "player" ? COLORS.blue : COLORS.red,
      selected ? 1 : 0.8,
    );
    this.marker.strokeEllipse(this.x, this.footY + 1, width, 12);
  }
}
