import * as BABYLON from "@babylonjs/core";

import FPSCameraInput from "./FPSCameraInput";

export interface FPS_CAMERA_SETTINGS {
  position?: BABYLON.Vector3;
}

export const DEFAULT_FPS_CAMERA_OPTIONS: Required<FPS_CAMERA_SETTINGS> = {
  position: new BABYLON.Vector3(0, 10, 0),
};

export function createFPSCamera(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
  const camera = new BABYLON.UniversalCamera("FPSCamera", DEFAULT_FPS_CAMERA_OPTIONS.position, scene);

  camera.attachControl(canvas, true);

  const fpsCameraInput = new FPSCameraInput(canvas, scene);

  camera.inputs.add(fpsCameraInput);

  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysRight.push(68);
  camera.keysLeft.push(65);
  camera.keysUpward.push(32);
  camera.minZ = 0.1;

  return camera;
}
