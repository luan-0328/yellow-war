import type Phaser from "phaser";

export const compactUI = (scene: Phaser.Scene) =>
  scene.scale.displaySize.height < 600 || scene.scale.displaySize.width < 1000;

/** Menus keep their composition while the canvas fills the available screen. */
export function centerStage(scene: Phaser.Scene) {
  const align = () =>
    scene.cameras.main.setScroll(
      (1280 - scene.scale.gameSize.width) / 2,
      (720 - scene.scale.gameSize.height) / 2,
    );
  align();
  scene.scale.on("resize", align);
  scene.events.once("shutdown", () => scene.scale.off("resize", align));
}
