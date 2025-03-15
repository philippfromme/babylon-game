import * as BABYLON from "@babylonjs/core";

import { canvasToRawTexture } from "./canvasToRawTexture";

export interface ColorMapConfig {
  rows: Array<{
    height: number;
    cols: Array<{ color: string; width: number }>;
  }>;
}

export function renderColorMapToCanvas(canvas: HTMLCanvasElement, config: ColorMapConfig) {
  const ctx = canvas.getContext("2d");

  let yOffset = 0;

  const totalRowsHeight = config.rows.reduce((sum, row) => sum + row.height, 0);

  config.rows.forEach((row) => {
    const rowHeight = (row.height / totalRowsHeight) * canvas.height;

    let xOffset = 0;

    const totalColWidth = row.cols.reduce((sum, col) => sum + col.width, 0);

    row.cols.forEach((col) => {
      const colWidth = (col.width / totalColWidth) * canvas.width;

      ctx!.fillStyle = col.color;

      ctx!.fillRect(xOffset, yOffset, colWidth, rowHeight);

      xOffset += colWidth;
    });

    yOffset += rowHeight;
  });
}

export function createRawTextureFromColorMap(config: ColorMapConfig, width: number, height: number, scene: BABYLON.Scene, name = "Color map") {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  renderColorMapToCanvas(canvas, config);

  return canvasToRawTexture(canvas, scene, {
    name,
    blur: true,
    blurAmount: 8,
  });
}

const MOISTURE = {
  rows: [
    {
      height: 1,
      cols: [
        { color: "#555555", width: 2 },
        { color: "#888888", width: 2 },
        { color: "#bbbbaa", width: 5 },
        { color: "#dddde4", width: 10 },
      ],
    },
    {
      height: 1,
      cols: [
        { color: "#c9d29b", width: 1 },
        { color: "#889977", width: 1 },
        { color: "#99aa77", width: 1 },
      ],
    },
    {
      height: 2,
      cols: [
        { color: "#c9d29b", width: 1 },
        { color: "#88aa55", width: 2 },
        { color: "#679459", width: 2 },
        { color: "#448855", width: 1 },
      ],
    },
    {
      height: 1,
      cols: [
        { color: "#d2b98b", width: 1 },
        { color: "#88aa55", width: 1 },
        { color: "#559944", width: 2 },
        { color: "#337755", width: 2 },
      ],
    },
    {
      height: 0.25,
      cols: [{ color: "#a09077", width: 1 }],
    },
    {
      height: 0.75,
      cols: [
        { color: "#a09077", width: 1 },
        // { color: "#44447a", width: 1 },
      ], // under water
    },
  ],
};

export const COLOR_MAPS = {
  MOISTURE,
};
