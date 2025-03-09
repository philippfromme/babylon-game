import * as BABYLON from "@babylonjs/core";

import "@babylonjs/core/Debug/debugLayer";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import "@babylonjs/inspector";

import { createNoise2D, NoiseFunction2D } from "simplex-noise";

import alea from "alea";

import MoveCameraInput from "./MoveCameraInput";

import HeightColorMaterialPlugin from "./materials/HeightColorMaterialPlugin";

import { GUI } from "./lil-gui/XYController";

let gui: GUI | null = null;

interface CreateTerrainSettings {
  frequency: number;
  exponent: number;
  octaves: number;
  terrainWidth: number;
  terrainHeight: number;
  vertexCount: number;
  lightDirection: {
    x: number;
    y: number;
  };
  lightIntensity?: number;
  ambientLightIntensity?: number;
  lowColor: string;
  midColor: string;
  highColor: string;
}

const defaultSettings: CreateTerrainSettings = {
  frequency: 2,
  exponent: 3,
  octaves: 10,
  terrainWidth: 50,
  terrainHeight: 10,
  vertexCount: 500,
  lightDirection: { x: 0.5, y: 0.5 },
  lightIntensity: 0.7,
  ambientLightIntensity: 0.5,
  lowColor: "#0000ff",
  midColor: "#00ff00",
  highColor: "#ff0000",
};

const settings: CreateTerrainSettings = { ...defaultSettings };

if (localStorage.getItem("babylon-game-settings")) {
  let newSettings;

  try {
    newSettings = JSON.parse(localStorage.getItem("babylon-game-settings")!);
  } catch (error) {
    console.error("Error parsing settings", error);

    localStorage.removeItem("babylon-game-settings");

    newSettings = { ...defaultSettings };
  }

  updateSettings(newSettings);
} else {
  localStorage.setItem("babylon-game-settings", JSON.stringify(settings));
}

function updateSettings(newSettings: CreateTerrainSettings) {
  settings.frequency = newSettings.frequency;
  settings.exponent = newSettings.exponent;
  settings.octaves = newSettings.octaves;
  settings.terrainWidth = newSettings.terrainWidth;
  settings.terrainHeight = newSettings.terrainHeight;
  settings.vertexCount = newSettings.vertexCount;
  settings.lightDirection = { ...newSettings.lightDirection };
  settings.lightIntensity = newSettings.lightIntensity;
  settings.ambientLightIntensity = newSettings.ambientLightIntensity;
  settings.lowColor = newSettings.lowColor;
  settings.midColor = newSettings.midColor;
  settings.highColor = newSettings.highColor;
}

class App {
  terrain: BABYLON.Mesh | null = null;

  constructor() {
    this.init();
  }

  async init() {
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);

    const engine = new BABYLON.Engine(canvas, true, {
      useHighPrecisionFloats: true,
    });

    const scene = new BABYLON.Scene(engine);

    // create camera
    const camera = createCamera(canvas, scene);

    const defaultPipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera]);

    // enable fxaa
    defaultPipeline.fxaaEnabled = true;

    // enable grain
    // defaultPipeline.grainEnabled = true;
    // defaultPipeline.grain.intensity = 10;
    // defaultPipeline.grain.animated = true;

    // create directional light
    const directionalLight = new BABYLON.DirectionalLight("DirectionalLight", new BABYLON.Vector3(settings.lightDirection.x * 5, -1, settings.lightDirection.y * 5), scene);

    directionalLight.intensity = settings.lightIntensity ?? 0.5;

    // create ambient light
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);

    ambientLight.intensity = settings.ambientLightIntensity ?? 0.5;

    scene.clearColor = BABYLON.Color3.Black().toColor4(1);

    // add material
    const material = new BABYLON.StandardMaterial("terrainMaterial", scene);

    material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    material.specularColor = new BABYLON.Color3(0, 0, 0);

    const heightColorMaterialPlugin = new HeightColorMaterialPlugin(material);

    heightColorMaterialPlugin.isEnabled = true;

    heightColorMaterialPlugin.setColors(BABYLON.Color3.FromHexString(settings.lowColor), BABYLON.Color3.FromHexString(settings.midColor), BABYLON.Color3.FromHexString(settings.highColor));
    heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);

    const terrain = (this.terrain = createTerrain(scene, material, settings));

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);

    shadowGenerator.usePoissonSampling = true;
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.addShadowCaster(terrain, true);
    shadowGenerator.getShadowMap()?.renderList?.push(terrain);

    terrain.receiveShadows = true;

    const reset = () => {
      const newSettings = { ...defaultSettings };

      updateSettings(newSettings);

      localStorage.setItem("babylon-game-settings", JSON.stringify(settings));

      setupGUI();

      this.terrain?.dispose();
      this.terrain = createTerrain(scene, material, settings);

      heightColorMaterialPlugin.setColors(BABYLON.Color3.FromHexString(settings.lowColor), BABYLON.Color3.FromHexString(settings.midColor), BABYLON.Color3.FromHexString(settings.highColor));
      heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);
    };

    const setupGUI = () => {
      gui?.destroy();

      gui = new GUI();

      const folder = gui.addFolder("Terrain Settings");

      folder.add(settings, "frequency", 1, 10).step(1);
      folder.add(settings, "exponent", 1, 10).step(1);
      folder.add(settings, "octaves", 1, 10).step(1);
      folder.add(settings, "terrainWidth", 10, 100).step(10);
      folder.add(settings, "terrainHeight", 1, 100).step(1);
      folder.add(settings, "vertexCount", 10, 1000).step(10);

      const colorsFolder = gui.addFolder("Colors");

      colorsFolder.addColor(settings, "lowColor");
      colorsFolder.addColor(settings, "midColor");
      colorsFolder.addColor(settings, "highColor");

      const lightFolder = gui.addFolder("Light");

      lightFolder.addXY(settings, "lightDirection").name("Direction");
      lightFolder.add(directionalLight, "intensity", 0, 1).step(0.1);
      lightFolder.add(ambientLight, "intensity", 0, 1).step(0.1).name("ambient intensity");

      const resetFolder = gui.addFolder("Reset");

      resetFolder.add(
        {
          reset,
        },
        "reset"
      );

      gui.onFinishChange((event) => {
        const { property } = event;

        if (["frequency", "exponent", "octaves", "terrainWidth", "terrainHeight", "vertexCount"].includes(property)) {
          this.terrain?.dispose();
          this.terrain = createTerrain(scene, material, settings);
        }

        if (property === "terrainHeight") {
          heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);
        }

        if (["lowColor", "midColor", "highColor"].includes(property)) {
          heightColorMaterialPlugin.setColors(BABYLON.Color3.FromHexString(settings.lowColor), BABYLON.Color3.FromHexString(settings.midColor), BABYLON.Color3.FromHexString(settings.highColor));
        }

        if (property === "lightDirection") {
          directionalLight.direction = new BABYLON.Vector3(settings.lightDirection.x * 5, -1, settings.lightDirection.y * 5);
        }

        if (property === "lightIntensity") {
          directionalLight.intensity = settings.lightIntensity ?? 0.5;
        }

        localStorage.setItem("babylon-game-settings", JSON.stringify(settings));
      });
    };

    setupGUI();

    // const axes = new AxesViewer(scene, 10);

    // hide/show the Inspector
    window.addEventListener("keydown", (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && (ev.key === "I" || ev.key === "i")) {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });

    engine.runRenderLoop(() => {
      scene.render();
    });
  }
}

new App();

function createCamera(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
  const camera = new BABYLON.ArcRotateCamera(
    "Camera", // name
    0, // alpha
    0, // beta
    10, // radius
    new BABYLON.Vector3(0, 0, 0),
    scene
  );

  // overwrite alpha, beta, radius
  camera.setPosition(new BABYLON.Vector3(0, 0, 20));

  // attach camera to canvas
  camera.attachControl(canvas, true);

  // initial camera beta angle
  camera.beta = Math.PI / 4;

  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = (Math.PI / 2) * 0.9;

  camera.wheelPrecision = 25; // zoom sensitivity
  camera.lowerRadiusLimit = 10; // minimum zoom
  camera.upperRadiusLimit = 50; // maximum zoom

  // remove default camera inputs
  camera.inputs.remove(camera.inputs.attached.pointers);

  const rotationInput = new BABYLON.ArcRotateCameraPointersInput();

  rotationInput.buttons = [1]; // middle mouse button

  camera.inputs.add(rotationInput);

  // add custom control for right mouse button to move camera without changing rotation, zoom or y
  const moveCameraInput = new MoveCameraInput(canvas, scene, {
    bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 },
  });

  camera.inputs.add(moveCameraInput);

  return camera;
}

function createHeightMap(frequency: number, exponent: number, octaves: number, vertexCount: number) {
  const noises = [] as NoiseFunction2D[];

  for (let i = 0; i < octaves; i++) {
    noises.push(createNoise2D(alea("seed" + i)));
  }

  const heightmap = new Float32Array(vertexCount * vertexCount);

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      const nx = x / vertexCount - 0.5;
      const ny = y / vertexCount - 0.5;

      let height = calculateHeight(noises, frequency, nx, ny, octaves);

      // normalize height
      height = height / (1 + 1 / 2 + 1 / 4);

      // apply exponent
      // higher values make the terrain flatter

      heightmap[y * vertexCount + x] = Math.pow(height, exponent);
    }
  }

  return heightmap;
}

function createTerrain(scene: BABYLON.Scene, material: BABYLON.Material, settings: CreateTerrainSettings): BABYLON.Mesh {
  const { frequency, exponent, octaves, terrainWidth, terrainHeight, vertexCount } = settings;

  const heightMap = createHeightMap(frequency, exponent, octaves, vertexCount);

  const terrain = new BABYLON.Mesh("terrain", scene);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      // map x and y to the actual vertex position taking into account the terrain width
      const vertexX = map(x, 0, vertexCount - 1, -terrainWidth / 2, terrainWidth / 2);
      const vertexY = map(y, 0, vertexCount - 1, -terrainWidth / 2, terrainWidth / 2);

      // console.log("x", x, "y", y, "nx", vertexX, "ny", vertexY);

      let height = heightMap[y * vertexCount + x];

      const island = true;

      if (island) {
        // ensure water at the edges
        const nx = map(Math.abs(vertexX), 0, terrainWidth / 2, 0, 1);
        const ny = map(Math.abs(vertexY), 0, terrainWidth / 2, 0, 1);

        // Use a power function to create a more gradual transition
        const easeEdge = (value: number) => Math.pow(value, 3);

        const edgeFactor = easeEdge(Math.max(nx, ny));

        height = lerp(height, 0, edgeFactor);
      }

      // map height to terrainHeight
      height = map(height, 0, 1, 0, terrainHeight);

      // use a step function to make the terrain look more blocky with terraces
      // height = Math.floor(height * 3) / 3;

      positions.push(vertexX, height, vertexY);

      if (x < vertexCount - 1 && y < vertexCount - 1) {
        indices.push(y * vertexCount + x, y * vertexCount + x + 1, (y + 1) * vertexCount + x);

        indices.push((y + 1) * vertexCount + x, y * vertexCount + x + 1, (y + 1) * vertexCount + x + 1);
      }
    }
  }

  BABYLON.VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new BABYLON.VertexData();

  // console.log(positions, indices, normals);

  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;

  vertexData.applyToMesh(terrain);

  // debug
  // debugMesh(terrain, scene);

  // convert to flat shaded mesh
  // terrain.convertToFlatShadedMesh();

  terrain.material = material;

  return terrain;
}

function calculateHeight(noises: NoiseFunction2D[], frequency: number, nx: number, ny: number, octaves = 5) {
  let height = 0;

  for (let i = 0; i < octaves; i++) {
    height += (1 / Math.pow(2, i)) * map(noises[i](Math.pow(2, i) * frequency * nx, Math.pow(2, i) * frequency * ny), -1, 1, 0, 1);
  }

  return height;
}

function debugMesh(mesh: BABYLON.Mesh, scene: BABYLON.Scene) {
  const material = new BABYLON.StandardMaterial("terrainMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  mesh.material = material;

  BABYLON.MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(mesh);

  new BABYLON.MeshDebugPluginMaterial(mesh.material as BABYLON.StandardMaterial, {
    mode: BABYLON.MeshDebugMode.TRIANGLES,
    wireframeTrianglesColor: new BABYLON.Color3(0, 0, 0),
    wireframeThickness: 0.7,
  });
}

function map(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return toMin + (toMax - toMin) * ((value - fromMin) / (fromMax - fromMin));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
