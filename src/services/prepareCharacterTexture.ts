import Phaser from "phaser";
import type { UnitType } from "../types/unit";
import frames from "../config/characterFrames.json";

/** Remove leftover warm white matte in the supplied cutouts, without changing source PNGs.
 * Flood follows background-connected neutral pixels; the lower leg gap can seed a hole.
 * Saturated yellow skin, dark outlines, equipment and upper highlights are preserved.
 */
export function prepareCharacterTexture(scene: Phaser.Scene, type: UnitType) {
  const source = scene.textures.get(type).getSourceImage() as HTMLImageElement;
  const texture = scene.textures.createCanvas(
    `${type}-display`,
    source.width,
    source.height,
  )!;
  const c = texture.getContext();
  c.drawImage(source, 0, 0);
  const image = c.getImageData(0, 0, source.width, source.height);
  const { data, width, height } = image;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0,
    tail = 0;
  const eligible = (index: number) => {
    const i = index * 4,
      r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (data[i + 3] === 0) return true;
    if (index / width < height * 0.65)
      return (
        r > 242 &&
        g > 240 &&
        b > 236 &&
        Math.max(r, g, b) - Math.min(r, g, b) < 16
      );
    return (
      r > 200 &&
      g > 188 &&
      b > 158 &&
      Math.max(r, g, b) - Math.min(r, g, b) < 60
    );
  };
  const push = (index: number) => {
    if (
      index < 0 ||
      index >= width * height ||
      visited[index] ||
      !eligible(index)
    )
      return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (
      data[i + 3] === 0 ||
      (p / width > height * 0.7 &&
        data[i] > 242 &&
        data[i + 1] > 240 &&
        data[i + 2] > 235)
    )
      push(p);
  }
  while (head < tail) {
    const p = queue[head++];
    data[p * 4 + 3] = 0;
    if (p % width > 0) push(p - 1);
    if (p % width < width - 1) push(p + 1);
    push(p - width);
    push(p + width);
  }
  c.putImageData(image, 0, 0);
  texture.refresh();
  const f = frames[type];
  texture.add("body", 0, f.x, f.y, f.width, f.height);
}
