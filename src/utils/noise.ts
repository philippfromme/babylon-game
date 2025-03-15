import { createNoise2D } from "simplex-noise";

import alea from "alea";

export interface NoiseConfig {
  seed?: number;
  scale?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  offsetX?: number;
  offsetY?: number;
  exponent?: number;
  fudgeFactor?: number;
}

export const DEFAULT_NOISE_CONFIG: Required<NoiseConfig> = {
  seed: 0,
  scale: 1, // scale the frequency of the noise
  octaves: 6, // octaves is the number of layers of noise
  persistence: 0.5, // persistence is the amount the amplitude changes between octaves
  lacunarity: 2, // lacunarity is the frequency multiplier between octaves
  offsetX: 0, // the offset of the noise
  offsetY: 0, // the offset of the noise
  exponent: 1, // the exponent of the noise
  fudgeFactor: 1.2, // the fudge factor of the noise
};

export function createNoise2DData(width: number, height: number, config: NoiseConfig = DEFAULT_NOISE_CONFIG) {
  const _config: Required<NoiseConfig> = { ...DEFAULT_NOISE_CONFIG, ...config };

  const randomFunction = alea(config.seed);

  const noiseFunction = createNoise2D(randomFunction);

  const data = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      let value = 0;

      // Normalize coordinates to 0-1 range
      const nx = x / width; // [0-1]
      const ny = y / height; // [0-1]

      for (let i = 0; i < _config.octaves; i++) {
        const scale = Math.pow(_config.lacunarity, i);
        const amplitude = Math.pow(_config.persistence, i);

        value += noiseFunction((nx * (1 / _config.scale) + _config.offsetX) * scale, (ny * (1 / _config.scale) + _config.offsetY) * scale) * amplitude;
      }

      value = Math.pow(Math.abs(value) * _config.fudgeFactor, _config.exponent);

      data[index] = value;
    }
  }

  const highestValue = Math.max(...data);
  const lowestValue = Math.min(...data);

  console.log("Highest value", highestValue);
  console.log("Lowest value", lowestValue);

  for (let i = 0; i < data.length; i++) {
    data[i] = (data[i] - lowestValue) / (highestValue - lowestValue);
  }

  return data;
}
