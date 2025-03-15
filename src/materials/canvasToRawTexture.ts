import * as BABYLON from "@babylonjs/core";

export interface CANVAS_TO_RAW_TEXTURE_OPTIONS {
  name?: string;
  invertY?: boolean;
  blur?: boolean;
  blurAmount?: number;
}

const DEFAULT_OPTIONS: Required<CANVAS_TO_RAW_TEXTURE_OPTIONS> = {
  name: "Raw texture",
  invertY: true, // Default to invert Y because canvas origin is top-left and WebGL origin is bottom-left
  blur: false,
  blurAmount: 4,
};

export function canvasToRawTexture(canvas: HTMLCanvasElement, scene: BABYLON.Scene, options: CANVAS_TO_RAW_TEXTURE_OPTIONS = DEFAULT_OPTIONS) {
  const { name, invertY, blur, blurAmount } = { ...DEFAULT_OPTIONS, ...options };

  const ctx = canvas.getContext("2d");

  if (blur) {
    // Apply blur effect
    ctx!.filter = `blur(${blurAmount}px)`;

    ctx!.drawImage(canvas, 0, 0);

    // Reset the filter
    ctx!.filter = "none";
  }

  const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);

  const data = new Uint8Array(imageData.data);

  const texture = new BABYLON.RawTexture(data, canvas.width, canvas.height, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, invertY, BABYLON.Texture.NEAREST_SAMPLINGMODE);

  texture.name = name || "Raw texture";

  return texture;
}
