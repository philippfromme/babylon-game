import * as BABYLON from "@babylonjs/core";

import { canvasToRawTexture } from "./canvasToRawTexture";

export function renderNoise2DDataToCanvas(canvas: HTMLCanvasElement, data: Float32Array) {
  const ctx = canvas.getContext("2d");

  const imageData = ctx!.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];

    imageData.data[i * 4] = value * 255;
    imageData.data[i * 4 + 1] = value * 255;
    imageData.data[i * 4 + 2] = value * 255;
    imageData.data[i * 4 + 3] = 255;
  }

  ctx!.putImageData(imageData, 0, 0);
}

export function createRawTextureFromNoise2DData(data: Float32Array, width: number, height: number, scene: BABYLON.Scene, name = "Noise map") {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  renderNoise2DDataToCanvas(canvas, data);

  return canvasToRawTexture(canvas, scene, {
    name,
  });
}
