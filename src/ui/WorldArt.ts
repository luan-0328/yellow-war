import Phaser from "phaser";

/** Original scenery drawn as a single cached texture; character art is never modified. */
export function drawWorld(scene: Phaser.Scene, width?: number) {
  const fixed = width === undefined;
  width ??= 1280;
  const key = `world-${width}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, 720)!;
    const c = texture.getContext();
    c.scale(width / 1280, 1);
    const sky = c.createLinearGradient(0, 0, 0, 570);
    sky.addColorStop(0, "#66888d");
    sky.addColorStop(0.54, "#b6c0aa");
    sky.addColorStop(1, "#edd099");
    c.fillStyle = sky;
    c.fillRect(0, 0, 1280, 720);
    const glow = c.createRadialGradient(998, 210, 10, 998, 210, 330);
    glow.addColorStop(0, "#fff2bda0");
    glow.addColorStop(1, "#ffe7a000");
    c.fillStyle = glow;
    c.fillRect(0, 0, 1280, 550);
    c.fillStyle = "#f7e4ad";
    c.beginPath();
    c.arc(998, 210, 60, 0, Math.PI * 2);
    c.fill();
    function shape(points: number[][], color: string) {
      c.fillStyle = color;
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
    }
    // Distant ridges, softened by the warm haze.
    shape(
      [
        [0, 370],
        [80, 310],
        [170, 335],
        [290, 250],
        [380, 315],
        [470, 289],
        [590, 360],
        [710, 285],
        [815, 315],
        [910, 275],
        [1040, 330],
        [1170, 260],
        [1280, 320],
        [1280, 570],
        [0, 570],
      ],
      "#8b9e95",
    );
    shape(
      [
        [0, 425],
        [110, 355],
        [230, 410],
        [360, 340],
        [465, 400],
        [560, 375],
        [685, 440],
        [830, 363],
        [960, 393],
        [1090, 343],
        [1280, 410],
        [1280, 580],
        [0, 580],
      ],
      "#718781",
    );
    shape(
      [
        [0, 487],
        [115, 445],
        [220, 472],
        [360, 425],
        [500, 480],
        [650, 445],
        [790, 490],
        [930, 428],
        [1075, 461],
        [1170, 420],
        [1280, 452],
        [1280, 600],
        [0, 600],
      ],
      "#596f64",
    );
    // Old watchtowers on the horizon.
    for (const [x, y] of [
      [350, 395],
      [1088, 360],
    ]) {
      c.fillStyle = "#526b65";
      c.fillRect(x, y, 24, 75);
      c.fillRect(x - 4, y, 32, 9);
      for (let i = 0; i < 3; i++) c.fillRect(x - 4 + i * 12, y - 9, 8, 12);
      c.fillStyle = "#9eaa8d";
      c.fillRect(x + 10, y + 20, 5, 13);
    }
    const field = c.createLinearGradient(0, 485, 0, 720);
    field.addColorStop(0, "#9b9b62");
    field.addColorStop(0.48, "#bba069");
    field.addColorStop(1, "#635b3e");
    c.fillStyle = field;
    c.beginPath();
    c.moveTo(0, 516);
    c.bezierCurveTo(320, 473, 770, 538, 1280, 493);
    c.lineTo(1280, 720);
    c.lineTo(0, 720);
    c.fill();
    shape(
      [
        [0, 574],
        [270, 558],
        [610, 570],
        [910, 550],
        [1280, 567],
        [1280, 636],
        [900, 611],
        [600, 630],
        [240, 611],
        [0, 634],
      ],
      "#c9ad79",
    );
    let seed = 81;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 2100; i++) {
      const x = random() * 1280,
        y = 520 + random() * 200;
      c.fillStyle = i % 2 ? "#edcf9430" : "#444e3628";
      c.fillRect(x, y, 1 + random() * 4, 1 + random() * 2);
    }
    for (let i = 0; i < 200; i++) {
      const x = random() * 1280,
        y = 525 + random() * 150;
      if (y > 562 && y < 617) continue;
      c.strokeStyle = i % 2 ? "#59683d" : "#dbbb73";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x - 3, y - 5);
      c.lineTo(x, y);
      c.lineTo(x + 2, y - 9);
      c.moveTo(x, y);
      c.lineTo(x + 6, y - 4);
      c.stroke();
    }
    // Foreground corners frame the play area, below the characters' feet.
    shape(
      [
        [0, 658],
        [85, 632],
        [172, 658],
        [220, 720],
        [0, 720],
      ],
      "#414f3e",
    );
    shape(
      [
        [1280, 642],
        [1200, 650],
        [1130, 680],
        [1085, 720],
        [1280, 720],
      ],
      "#414f3e",
    );
    texture.refresh();
  }
  const backdrop = scene.add.image(0, 0, key).setOrigin(0);
  if (fixed) {
    const fit = () =>
      backdrop.setDisplaySize(
        scene.scale.gameSize.width,
        scene.scale.gameSize.height,
      );
    backdrop.setScrollFactor(0);
    fit();
    scene.scale.on("resize", fit);
    scene.events.once("shutdown", () => scene.scale.off("resize", fit));
  }
}

export function drawBase(scene: Phaser.Scene, x: number, enemy = false) {
  const g = scene.add.graphics();
  const flag = enemy ? 0xc56c58 : 0xe8bd58;
  g.fillStyle(0x262f2b, 0.2).fillEllipse(x, 589, 158, 19);
  g.fillStyle(0x676e63).fillRect(x - 48, 478, 96, 110);
  g.fillStyle(0x929382)
    .fillRect(x - 55, 475, 32, 114)
    .fillRect(x + 23, 475, 32, 114);
  g.fillStyle(0xb4af92)
    .fillRect(x - 59, 470, 40, 14)
    .fillRect(x + 19, 470, 40, 14);
  for (const tx of [x - 59, x + 19])
    for (let i = 0; i < 3; i++) g.fillRect(tx + i * 15, 458, 10, 15);
  g.fillStyle(0x333c38).fillRoundedRect(x - 17, 542, 34, 47, {
    tl: 17,
    tr: 17,
    bl: 0,
    br: 0,
  });
  g.lineStyle(2, 0x535d53, 0.6);
  for (let y = 500; y < 585; y += 19) {
    g.lineBetween(x - 52, y, x - 25, y);
    g.lineBetween(x + 25, y, x + 52, y);
  }
  g.fillStyle(0x333d38)
    .fillRect(x - 42, 502, 7, 17)
    .fillRect(x + 35, 502, 7, 17);
  g.fillStyle(0x444d42).fillRect(x - 2, 407, 4, 89);
  g.fillStyle(flag).fillPoints(
    [
      new Phaser.Math.Vector2(x + 2, 409),
      new Phaser.Math.Vector2(x + 47, 416),
      new Phaser.Math.Vector2(x + 34, 432),
      new Phaser.Math.Vector2(x + 2, 430),
    ],
    true,
  );
  g.lineStyle(1, 0xffe3a1, 0.6).lineBetween(x + 7, 414, x + 7, 425);
}
