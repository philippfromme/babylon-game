import * as BABYLON from "@babylonjs/core";

import RTSCameraInput from "./RTSCameraInput";

export interface RTS_CAMERA_SETTINGS {
  alpha?: number;
  beta?: number;
  radius?: number;
  target?: BABYLON.Vector3;
  position?: BABYLON.Vector3;
}

export const DEFAULT_RTS_CAMERA_SETTINGS: Required<RTS_CAMERA_SETTINGS> = {
  alpha: 0,
  beta: Math.PI / 4,
  radius: 25,
  target: new BABYLON.Vector3(0, 0, 5),
  position: new BABYLON.Vector3(0, 50, -50),
};

export function createRTSCamera(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
  const camera = new BABYLON.ArcRotateCamera(
    "RTSCamera",
    DEFAULT_RTS_CAMERA_SETTINGS.alpha,
    DEFAULT_RTS_CAMERA_SETTINGS.beta,
    DEFAULT_RTS_CAMERA_SETTINGS.radius,
    DEFAULT_RTS_CAMERA_SETTINGS.target.clone(),
    scene
  );

  camera.setPosition(DEFAULT_RTS_CAMERA_SETTINGS.position);

  camera.attachControl(canvas, true);

  camera.lowerBetaLimit = 0.1;
  camera.upperBetaLimit = (Math.PI / 2) * 0.9;

  camera.wheelPrecision = 25; // zoom sensitivity
  camera.lowerRadiusLimit = 10; // minimum zoom
  camera.upperRadiusLimit = 100; // maximum zoom

  // remove default camera inputs
  camera.inputs.remove(camera.inputs.attached.pointers);

  const rotationInput = new BABYLON.ArcRotateCameraPointersInput();

  rotationInput.buttons = [1]; // middle mouse button

  camera.inputs.add(rotationInput);

  const rtsCameraInput = new RTSCameraInput(canvas, scene, {
    bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 },
  });

  rtsCameraInput.setBounds({ minX: -25, maxX: 25, minZ: -25, maxZ: 25 });

  camera.inputs.add(rtsCameraInput);

  return camera;
}
