import * as BABYLON from "@babylonjs/core";

export function createDummyTexture(scene: BABYLON.Scene, width: number, height: number, color = new BABYLON.Color4(1, 0, 1, 1)) {
  const data = new Uint8Array(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = color.r * 255;
    data[i + 1] = color.g * 255;
    data[i + 2] = color.b * 255;
    data[i + 3] = color.a * 255;
  }

  const texture = new BABYLON.RawTexture(data, width, height, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);

  texture.name = "Dummy texture";

  return texture;
}
