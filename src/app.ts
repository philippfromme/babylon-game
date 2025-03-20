import * as BABYLON from "@babylonjs/core";

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";

import { MathUtils } from "three";

import { createDummyTexture } from "./materials/dummyTexture";
import { COLOR_MAPS, createRawTextureFromColorMap } from "./materials/fromColorMap";
import { createRawTextureFromNoise2DData } from "./materials/fromNoise";

import { createRTSCamera, DEFAULT_RTS_CAMERA_SETTINGS } from "./cameras/RTSCamera";
import RTSCameraInput from "./cameras/RTSCameraInput";

import { createFPSCamera } from "./cameras/FPSCamera";
import FPSCameraInput from "./cameras/FPSCameraInput";

import HeightColorMaterialPlugin from "./materials/HeightColorMaterialPlugin";

import { createNoise2DData } from "./utils/noise";

import { GUI } from "./lil-gui/XYController";

let gui: GUI | null = null;

interface CreateTerrainSettings {
  scale: number;
  exponent: number;
  octaves: number;
  lacunarity?: number;
  persistence?: number;
  terrainWidth: number;
  terrainHeight: number;
  vertexCount: number;
  lightDirection: {
    x: number;
    y: number;
  };
  lightIntensity?: number;
  ambientLightIntensity?: number;
  waterLevel?: number;
}

const defaultSettings: CreateTerrainSettings = {
  scale: 1.5,
  exponent: 3,
  octaves: 10,
  lacunarity: 2,
  persistence: 0.5,
  terrainWidth: 50,
  terrainHeight: 10,
  vertexCount: 200,
  lightDirection: { x: 0.5, y: 0.5 },
  lightIntensity: 0.7,
  ambientLightIntensity: 0.5,
  waterLevel: 0.7,
};

const settings: CreateTerrainSettings = { ...defaultSettings };

if (localStorage.getItem("babylon-game-settings")) {
  let newSettings;

  try {
    newSettings = JSON.parse(localStorage.getItem("babylon-game-settings")!);

    newSettings = { ...defaultSettings, ...newSettings };
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
  settings.scale = newSettings.scale;
  settings.exponent = newSettings.exponent;
  settings.octaves = newSettings.octaves;
  settings.lacunarity = newSettings.lacunarity;
  settings.persistence = newSettings.persistence;
  settings.terrainWidth = newSettings.terrainWidth;
  settings.terrainHeight = newSettings.terrainHeight;
  settings.vertexCount = newSettings.vertexCount;
  settings.lightDirection = { ...newSettings.lightDirection };
  settings.lightIntensity = newSettings.lightIntensity;
  settings.ambientLightIntensity = newSettings.ambientLightIntensity;
  settings.waterLevel = newSettings.waterLevel;
}

class App {
  terrain: BABYLON.Mesh | null = null;
  water: BABYLON.Mesh | null = null;

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

    if (localStorage.getItem("babylon-show-inspector") === "true") {
      scene.debugLayer.show();
    }

    window.addEventListener("keydown", (event) => {
      // Shift+Ctrl+Alt+I
      if (event.shiftKey && event.ctrlKey && event.altKey && (event.key === "I" || event.key === "i")) {
        if (scene.debugLayer.isVisible()) {
          localStorage.setItem("babylon-show-inspector", "false");
        } else {
          localStorage.setItem("babylon-show-inspector", "true");
        }
      }
    });

    const rtsCamera = createRTSCamera(canvas, scene);

    const rtsCameraInput = rtsCamera.inputs.attached["RTSCameraInput"] as RTSCameraInput;

    const fpsCamera = createFPSCamera(canvas, scene);

    const fpsCameraInput = fpsCamera.inputs.attached["FPSCameraInput"] as FPSCameraInput;

    // const defaultPipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [rtsCamera]);

    // enable fxaa
    // defaultPipeline.fxaaEnabled = true;

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

    material.diffuseTexture = createDummyTexture(scene, 256, 256, new BABYLON.Color4(1, 0, 1, 1));

    // TODO: add specular map to make only the water shiny
    material.specularColor = new BABYLON.Color3(0, 0, 0);

    const sampler2DSize = 256;

    const moisetureMapData = createNoise2DData(sampler2DSize, sampler2DSize, {
      seed: 0,
      scale: 0.5,
      octaves: 2,
      persistence: 0.2,
      lacunarity: 3,
      offsetX: 0,
      offsetY: 0,
      exponent: 1.5,
      fudgeFactor: 1,
    });

    const moistureMap = createRawTextureFromNoise2DData(moisetureMapData, sampler2DSize, sampler2DSize, scene, "Moisture map");

    const colorMap = createRawTextureFromColorMap(COLOR_MAPS.MOISTURE, sampler2DSize, sampler2DSize, scene, "Color map");

    const heightColorMaterialPlugin = new HeightColorMaterialPlugin(material);

    heightColorMaterialPlugin.isEnabled = true;

    heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);
    heightColorMaterialPlugin.setMoistureMap(moistureMap);
    heightColorMaterialPlugin.setColorMap(colorMap);

    this.terrain = createTerrain(scene, material, settings);

    rtsCameraInput.setBounds({ minX: -settings.terrainWidth / 2, maxX: settings.terrainWidth / 2, minZ: -settings.terrainWidth / 2, maxZ: settings.terrainWidth / 2 });

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);

    shadowGenerator.usePoissonSampling = true;
    shadowGenerator.usePercentageCloserFiltering = true;

    shadowGenerator.addShadowCaster(this.terrain, true);
    shadowGenerator.getShadowMap()?.renderList?.push(this.terrain);

    const createWater = () => {
      // create water
      const waterMaterial = new BABYLON.StandardMaterial("waterMaterial", scene);

      waterMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.6);
      waterMaterial.alpha = 0.95;

      // make it shiny
      waterMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      waterMaterial.specularPower = 64;

      const water = BABYLON.MeshBuilder.CreateGround("water", { width: settings.terrainWidth, height: settings.terrainWidth }, scene);

      water.position.y = settings.waterLevel ?? 1;

      water.material = waterMaterial;

      return water;
    };

    this.water = createWater();

    // create simple red sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

    const sphereMaterial = new BABYLON.StandardMaterial("sphereMaterial", scene);

    sphereMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);

    sphere.material = sphereMaterial;

    sphere.isPickable = false;

    function mousemovef() {
      var pickResult = scene.pick(scene.pointerX, scene.pointerY);

      if (pickResult.hit) {
        if (pickResult.pickedMesh?.name === "water" || scene.activeCamera === fpsCamera) {
          sphere.isVisible = false;
        } else {
          sphere.isVisible = true;

          sphere.position = pickResult.pickedPoint!;
        }
      }
    }

    scene.onPointerMove = function () {
      mousemovef();
    };

    scene.onPointerDown = function () {
      if (sphere.isVisible) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY);

        if (pickResult.hit) {
          fpsCamera.position = pickResult.pickedPoint!.add(new BABYLON.Vector3(0, 1, 0));

          rtsCamera.detachControl();

          fpsCameraInput.attachControl();

          scene.activeCamera = fpsCamera;

          fpsCameraInput.lockPointer();
        }
      }
    };

    const reset = () => {
      const newSettings = { ...defaultSettings };

      updateSettings(newSettings);

      localStorage.setItem("babylon-game-settings", JSON.stringify(settings));

      setupGUI();

      heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);
      heightColorMaterialPlugin.setMoistureMap(moistureMap);
      heightColorMaterialPlugin.setColorMap(colorMap);

      this.terrain?.dispose();

      this.terrain = createTerrain(scene, material, settings);

      rtsCameraInput.setBounds({ minX: -settings.terrainWidth / 2, maxX: settings.terrainWidth / 2, minZ: -settings.terrainWidth / 2, maxZ: settings.terrainWidth / 2 });

      shadowGenerator.addShadowCaster(this.terrain, true);
      shadowGenerator.getShadowMap()?.renderList?.push(this.terrain);

      this.water?.dispose();

      this.water = createWater();

      // set camera to default settings
      rtsCamera.alpha = DEFAULT_RTS_CAMERA_SETTINGS.alpha;
      rtsCamera.beta = DEFAULT_RTS_CAMERA_SETTINGS.beta;
      rtsCamera.radius = DEFAULT_RTS_CAMERA_SETTINGS.radius;
      rtsCamera.setTarget(DEFAULT_RTS_CAMERA_SETTINGS.target.clone());
      rtsCamera.setPosition(DEFAULT_RTS_CAMERA_SETTINGS.position.clone());
    };

    const setupGUI = () => {
      gui?.destroy();

      gui = new GUI();

      const folder = gui.addFolder("Terrain Settings");

      folder.add(settings, "scale", 0.1, 10).step(0.1);
      folder.add(settings, "exponent", 1, 10).step(1);
      folder.add(settings, "octaves", 1, 10).step(1);
      folder.add(settings, "lacunarity", 1, 10).step(1);
      folder.add(settings, "persistence", 0.1, 1).step(0.1);
      folder.add(settings, "terrainWidth", 10, 100).step(10);
      folder.add(settings, "terrainHeight", 1, 20).step(1);
      folder.add(settings, "vertexCount", 10, 1000).step(10);

      const waterFolder = gui.addFolder("Water");

      waterFolder.add(settings, "waterLevel", 0, settings.terrainHeight).step(0.1);

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

        if (["scale", "exponent", "octaves", "lacunarity", "persistence", "terrainWidth", "terrainHeight", "vertexCount"].includes(property)) {
          this.terrain?.dispose();
          this.terrain = createTerrain(scene, material, settings);

          this.water?.dispose();
          this.water = createWater();
        }

        if (property === "terrainHeight") {
          heightColorMaterialPlugin.setHeightRange(0, settings.terrainHeight);
        }

        if (property === "waterLevel") {
          this.water?.dispose();
          this.water = createWater();
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

function nextPowerOfTwo(value: number, max = 2048): number {
  value = Math.min(max, value);

  let result = 2;

  while (result < value) {
    result *= 2;
  }

  return Math.min(max, result);
}

function createTerrain(scene: BABYLON.Scene, material: BABYLON.StandardMaterial, settings: CreateTerrainSettings): BABYLON.Mesh {
  const { scale, exponent, octaves, lacunarity, persistence, terrainWidth, terrainHeight, vertexCount } = settings;

  const heightMapWidth = nextPowerOfTwo(vertexCount),
    heightMapHeight = nextPowerOfTwo(vertexCount);

  const config = {
    seed: 0,
    scale: scale,
    octaves,
    lacunarity,
    persistence,
    offsetX: 0,
    offsetY: 0,
    exponent,
    fudgeFactor: 1,
  };

  const heightMap = createNoise2DData(heightMapWidth, heightMapHeight, config);

  const terrain = new BABYLON.Mesh("terrain", scene);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      const vertexX = MathUtils.mapLinear(x, 0, vertexCount - 1, -terrainWidth / 2, terrainWidth / 2);
      const vertexY = MathUtils.mapLinear(y, 0, vertexCount - 1, -terrainWidth / 2, terrainWidth / 2);

      // get index in height map considering heightMapWidth, heightMapHeight (which is the same for now) and vertexCount
      const index = Math.floor(MathUtils.mapLinear(y, 0, vertexCount - 1, 0, heightMapHeight - 1)) * heightMapWidth + Math.floor(MathUtils.mapLinear(x, 0, vertexCount - 1, 0, heightMapWidth - 1));

      let height = heightMap[index];

      const island = true;

      if (island) {
        // ensure water at the edges
        const nx = MathUtils.mapLinear(Math.abs(vertexX), 0, terrainWidth / 2, 0, 1);
        const ny = MathUtils.mapLinear(Math.abs(vertexY), 0, terrainWidth / 2, 0, 1);

        // Use a power function to create a more gradual transition
        const easeEdge = (value: number) => Math.pow(value, 3);

        const edgeFactor = easeEdge(Math.max(nx, ny));

        height = MathUtils.lerp(height, 0, edgeFactor);
      }

      // map height to terrainHeight
      height = MathUtils.mapLinear(height, 0, 1, 0, terrainHeight);

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

  // calculate UVs considering that this is a square terrain
  const uvs: number[] = [];

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      uvs.push(x / (vertexCount - 1), y / (vertexCount - 1));
    }
  }

  const vertexData = new BABYLON.VertexData();

  // console.log(positions, indices, normals);

  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;

  vertexData.applyToMesh(terrain);

  // convert to flat shaded mesh
  terrain.convertToFlatShadedMesh();

  terrain.material = material;

  const diffuseTexture = createRawTextureFromNoise2DData(heightMap, heightMapWidth, heightMapHeight, scene, "Height map");

  if (material.diffuseTexture) {
    material.diffuseTexture.dispose();
  }

  material.diffuseTexture = diffuseTexture;

  terrain.receiveShadows = true;

  return terrain;
}
