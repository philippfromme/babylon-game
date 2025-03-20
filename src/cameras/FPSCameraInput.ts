import * as BABYLON from "@babylonjs/core";

interface FPSCameraInputOptions {
  applyGravity?: boolean;
  checkCollisions?: boolean;
  speed?: number;
  lockPointer?: boolean;
}

const DEFAULT_OPTIONS: Required<FPSCameraInputOptions> = {
  applyGravity: true,
  checkCollisions: true,
  speed: 1,
  lockPointer: true,
};

export default class RTSCameraInput implements BABYLON.ICameraInput<BABYLON.UniversalCamera> {
  camera: BABYLON.Nullable<BABYLON.UniversalCamera>;
  private _canvas: HTMLCanvasElement;
  private _scene: BABYLON.Scene;

  constructor(canvas: HTMLCanvasElement, scene: BABYLON.Scene, options: FPSCameraInputOptions = {}) {
    this.camera = null;
    this._scene = scene;
    this._canvas = canvas;

    options = { ...DEFAULT_OPTIONS, ...options };
  }

  getClassName(): string {
    return "FPSCameraInput";
  }

  getSimpleName(): string {
    return "FPSCameraInput";
  }

  attachControl(noPreventDefault?: boolean): void {}

  detachControl(): void {}

  lockPointer() {
    this._canvas.addEventListener("mousemove", () => {
      if (!document.pointerLockElement) {
        this._canvas.requestPointerLock();
      }
    });
  }
}
