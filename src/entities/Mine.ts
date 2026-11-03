import Phaser from "phaser";
import { text } from "../ui/primitives";
export class Mine {
  constructor(scene: Phaser.Scene, x: number, y = 590) {
    const g = scene.add.graphics().setY(y - 590);
    g.fillStyle(0x424a3d, 0.3).fillEllipse(x, 588, 84, 15);
    g.fillStyle(0x686752)
      .fillTriangle(x - 44, 584, x - 25, 550, x + 11, 583)
      .fillTriangle(x - 10, 584, x + 16, 536, x + 44, 584);
    g.fillStyle(0xdfb74e)
      .fillTriangle(x - 23, 568, x - 17, 550, x - 6, 570)
      .fillTriangle(x + 4, 568, x + 18, 546, x + 26, 568);
    g.lineStyle(2, 0xffe3a0)
      .lineBetween(x + 16, 548, x + 12, 562)
      .lineBetween(x - 18, 555, x - 20, 565);
    text(scene, x, y + 14, "金矿", 12, "#fff1c8").setOrigin(0.5, 0);
  }
}
