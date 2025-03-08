import * as BABYLON from "@babylonjs/core";

import "@babylonjs/core/Debug/debugLayer";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import "@babylonjs/inspector";

import { createNoise2D, NoiseFunction2D } from "simplex-noise";

import MoveCameraInput from "./MoveCameraInput";

import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

import GUI from "lil-gui";

const gui = new GUI();

const settings = {
  frequency: 3,
  amplitude: 2,
  verticalHeight: 5,
  exponent: 3,
  layers: 5,
  terrainWidth: 50,
  vertexCount: 200,
  lowColor: "#0000ff",
  midColor: "#808080",
  highColor: "#ffffff",
};

const folder = gui.addFolder("Terrain Settings");

folder.add(settings, "frequency", 1, 10).step(1);
folder.add(settings, "amplitude", 1, 10).step(1);
folder.add(settings, "verticalHeight", 1, 10).step(1);
folder.add(settings, "exponent", 1, 10).step(1);
folder.add(settings, "layers", 1, 10).step(1);
folder.add(settings, "terrainWidth", 10, 100).step(10);
folder.add(settings, "vertexCount", 10, 500).step(10);

const colorsFolder = folder.addFolder("Colors");

colorsFolder.addColor(settings, "lowColor");
colorsFolder.addColor(settings, "midColor");
colorsFolder.addColor(settings, "highColor");

gui.onFinishChange((event) => {
  const { property } = event;

  console.log("event", event);
});

class App {
  terrain: BABYLON.Mesh | null = null;

  constructor() {
    this.init();
  }

  async init() {
    var canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);

    var engine = new BABYLON.Engine(canvas, true, {
      useHighPrecisionFloats: true,
    });

    var scene = await createScene(canvas, engine);

    scene.clearColor = BABYLON.Color3.Black().toColor4(1);

    this.terrain = createTerrain(scene);

    // const axes = new AxesViewer(scene, 10);

    const light = new BABYLON.DirectionalLight(
      "DirectionalLight",
      new BABYLON.Vector3(-1, -1, -1),
      scene
    );

    light.position = new BABYLON.Vector3(0, 10, 0);

    light.intensity = 0.1;

    // hide/show the Inspector
    window.addEventListener("keydown", (ev) => {
      // Shift+Ctrl+Alt+I
      if (
        ev.shiftKey &&
        ev.ctrlKey &&
        ev.altKey &&
        (ev.key === "I" || ev.key === "i")
      ) {
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

async function createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
  var scene = new BABYLON.Scene(engine);

  // create camera
  var camera = createCamera(canvas, scene);

  var light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );

  light.intensity = 0.7;

  return scene;
}

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

function createTerrain(scene: BABYLON.Scene) {
  const vertexCount = 200; // number of vertices per side
  const terrainWidth = 50; // width of the terrain in x and z
  const verticalHeight = 5; // height of the terrain in y

  const noise2D = createNoise2D();

  const heightmap = new Float32Array(vertexCount * vertexCount);

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      const nx = x / vertexCount - 0.5;
      const ny = y / vertexCount - 0.5;

      const frequency = 3;
      const amplitude = 2;

      let height = calculateHeight(amplitude, noise2D, frequency, nx, ny);

      // normalize height
      height = height / (amplitude + amplitude / 2 + amplitude / 4);

      // apply exponent
      const exponent = 3; // higher values make the terrain flatter

      heightmap[y * vertexCount + x] = Math.pow(height, exponent);
    }
  }

  const terrain = new BABYLON.Mesh("terrain", scene);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let y = 0; y < vertexCount; y++) {
    for (let x = 0; x < vertexCount; x++) {
      // map x and y to the actual vertex position taking into account the terrain width
      const vertexX = map(
        x,
        0,
        vertexCount - 1,
        -terrainWidth / 2,
        terrainWidth / 2
      );
      const vertexY = map(
        y,
        0,
        vertexCount - 1,
        -terrainWidth / 2,
        terrainWidth / 2
      );

      // console.log("x", x, "y", y, "nx", vertexX, "ny", vertexY);

      let height = heightmap[y * vertexCount + x];

      // map height to terrainHeight
      height = map(height, 0, 1, 0, verticalHeight);

      // use a step function to make the terrain look more blocky with terraces
      // height = Math.floor(height * 3) / 3;

      positions.push(vertexX, height, vertexY);

      if (x < vertexCount - 1 && y < vertexCount - 1) {
        indices.push(
          y * vertexCount + x,
          y * vertexCount + x + 1,
          (y + 1) * vertexCount + x
        );

        indices.push(
          (y + 1) * vertexCount + x,
          y * vertexCount + x + 1,
          (y + 1) * vertexCount + x + 1
        );
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
  terrain.convertToFlatShadedMesh();

  // add material
  // const material = new BABYLON.StandardMaterial("terrainMaterial", scene);
  // material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  // material.specularColor = new BABYLON.Color3(0, 0, 0);

  // terrain.material = material;

  // create shader material
  const shaderMaterial = new BABYLON.ShaderMaterial(
    "shaderMaterial",
    scene,
    {
      vertex: "custom",
      fragment: "custom",
    },
    {
      attributes: ["position", "normal"],
      uniforms: [
        "world",
        "worldView",
        "worldViewProjection",
        "view",
        "projection",
      ],
    }
  );

  BABYLON.Effect.ShadersStore["customVertexShader"] = vertexShader;

  BABYLON.Effect.ShadersStore["customFragmentShader"] = fragmentShader;

  shaderMaterial.setFloat("minHeight", 0);
  shaderMaterial.setFloat("maxHeight", verticalHeight);

  const lowColor = BABYLON.Color3.Blue();
  const midColor = BABYLON.Color3.Gray();
  const highColor = BABYLON.Color3.White();

  shaderMaterial.setVector3(
    "lowColor",
    new BABYLON.Vector3(lowColor.r, lowColor.g, lowColor.b)
  );
  shaderMaterial.setVector3(
    "midColor",
    new BABYLON.Vector3(midColor.r, midColor.g, midColor.b)
  );
  shaderMaterial.setVector3(
    "highColor",
    new BABYLON.Vector3(highColor.r, highColor.g, highColor.b)
  );

  terrain.material = shaderMaterial;

  return terrain;
}

function calculateHeight(
  amplitude: number,
  noise2D: NoiseFunction2D,
  frequency: number,
  nx: number,
  ny: number,
  layers = 5
) {
  let height = 0;

  for (let i = 0; i < layers; i++) {
    height +=
      (amplitude / Math.pow(2, i)) *
      map(
        noise2D(
          Math.pow(2, i) * frequency * nx,
          Math.pow(2, i) * frequency * ny
        ),
        -1,
        1,
        0,
        1
      );
  }

  return height;
}

function debugMesh(mesh: BABYLON.Mesh, scene: BABYLON.Scene) {
  const material = new BABYLON.StandardMaterial("terrainMaterial", scene);
  material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  mesh.material = material;

  BABYLON.MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(mesh);

  new BABYLON.MeshDebugPluginMaterial(
    mesh.material as BABYLON.StandardMaterial,
    {
      mode: BABYLON.MeshDebugMode.TRIANGLES,
      wireframeTrianglesColor: new BABYLON.Color3(0, 0, 0),
      wireframeThickness: 0.7,
    }
  );
}

function map(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  return toMin + (toMax - toMin) * ((value - fromMin) / (fromMax - fromMin));
}
