import * as BABYLON from "@babylonjs/core";

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

interface RTSCameraInputOptions {
  dragSpeed?: number;
  edgeScrollEnabled?: boolean;
  edgeScrollSpeed?: number;
  edgeScrollThreshold?: number;
  bounds?: Bounds;
}

const DEFAULT_OPTIONS: Required<RTSCameraInputOptions> = {
  dragSpeed: 0.05,
  edgeScrollEnabled: false,
  edgeScrollSpeed: 0.7,
  edgeScrollThreshold: 20,
  bounds: { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity },
};

export default class MoveCameraInput implements BABYLON.ICameraInput<BABYLON.ArcRotateCamera> {
  camera: BABYLON.Nullable<BABYLON.ArcRotateCamera>;
  private _canvas: HTMLCanvasElement;
  private _scene: BABYLON.Scene;
  private _isDragging: boolean = false;
  private _previousPosition: { x: number; y: number } | null = null;
  private _dragSpeed: number;
  private _edgeScrollEnabled: boolean;
  private _edgeScrollSpeed: number;
  private _edgeThreshold: number;
  private _cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private _edgeScrollInterval: BABYLON.Nullable<number> = null;
  private _bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(canvas: HTMLCanvasElement, scene: BABYLON.Scene, options: RTSCameraInputOptions = {}) {
    this.camera = null;
    this._scene = scene;
    this._canvas = canvas;

    const {
      dragSpeed = DEFAULT_OPTIONS.dragSpeed,
      edgeScrollEnabled = DEFAULT_OPTIONS.edgeScrollEnabled,
      edgeScrollSpeed = DEFAULT_OPTIONS.edgeScrollSpeed,
      edgeScrollThreshold = DEFAULT_OPTIONS.edgeScrollThreshold,
      bounds = DEFAULT_OPTIONS.bounds,
    } = options;

    this._dragSpeed = dragSpeed;
    this._edgeScrollEnabled = edgeScrollEnabled;
    this._edgeScrollSpeed = edgeScrollSpeed;
    this._edgeThreshold = edgeScrollThreshold;
    this._bounds = bounds;
  }

  getClassName() {
    return "RTSCameraInput";
  }

  getSimpleName() {
    return "RTSCameraInput";
  }

  attachControl(noPreventDefault?: boolean): void {
    this._scene.onPointerObservable.add((pointerInfo) => {
      if (!this.camera) return;

      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          this._onPointerDown(pointerInfo);
          break;
        case BABYLON.PointerEventTypes.POINTERMOVE:
          this._onPointerMove(pointerInfo);
          break;
        case BABYLON.PointerEventTypes.POINTERUP:
          this._onPointerUp(pointerInfo);
          break;
      }
    });

    this._canvas.addEventListener("mousemove", (event) => {
      this._cursorPosition.x = event.clientX;
      this._cursorPosition.y = event.clientY;
    });

    this._startEdgeScrolling();
  }

  detachControl(): void {
    if (this._edgeScrollInterval !== null) {
      clearInterval(this._edgeScrollInterval);

      this._edgeScrollInterval = null;
    }

    this._canvas.removeEventListener("mousemove", () => {});
  }

  checkInputs(): void {}

  setBounds(bounds: Bounds): void {
    this._bounds = bounds;

    if (this.camera) {
      if (!this._isInBounds(this.camera.target)) {
        this.camera.target = new BABYLON.Vector3(
          Math.min(Math.max(this.camera.target.x, this._bounds.minX), this._bounds.maxX),
          this.camera.target.y,
          Math.min(Math.max(this.camera.target.z, this._bounds.minZ), this._bounds.maxZ)
        );
      }
    }
  }

  setDragSpeed(speed: number): void {
    this._dragSpeed = speed;
  }

  setEdgeScrollSpeed(speed: number): void {
    this._edgeScrollSpeed = speed;
  }

  setEdgeThreshold(threshold: number): void {
    this._edgeThreshold = threshold;
  }

  private _isInBounds(position: BABYLON.Vector3): boolean {
    return position.x >= this._bounds.minX && position.x <= this._bounds.maxX && position.z >= this._bounds.minZ && position.z <= this._bounds.maxZ;
  }

  private _onPointerDown(pointerInfo: BABYLON.PointerInfo): void {
    if (pointerInfo.event.button === 2) {
      pointerInfo.event.preventDefault();

      this._isDragging = true;

      this._previousPosition = {
        x: pointerInfo.event.clientX,
        y: pointerInfo.event.clientY,
      };
    }
  }

  private _onPointerMove(pointerInfo: BABYLON.PointerInfo): void {
    if (!this._isDragging || !this._previousPosition || !this.camera) return;

    const dx = pointerInfo.event.clientX - this._previousPosition.x;
    const dy = pointerInfo.event.clientY - this._previousPosition.y;

    const forward = this.camera.getTarget().subtract(this.camera.position).normalize();

    const right = BABYLON.Vector3.Cross(forward, this.camera.upVector);

    let movement = right.scale(-dx * this._dragSpeed).add(forward.scale(-dy * this._dragSpeed));

    movement = movement.scale(-1);

    movement.y = 0;

    if (this._isInBounds(this.camera.target.add(movement))) {
      this.camera.position.addInPlace(movement);
      this.camera.target.addInPlace(movement);
    }

    this._previousPosition = {
      x: pointerInfo.event.clientX,
      y: pointerInfo.event.clientY,
    };
  }

  private _onPointerUp(pointerInfo: BABYLON.PointerInfo): void {
    if (pointerInfo.event.button === 2) {
      this._isDragging = false;

      this._previousPosition = null;
    }
  }

  private _startEdgeScrolling(): void {
    if (!this.camera) return;

    this._edgeScrollInterval = window.setInterval(() => {
      if (!this._edgeScrollEnabled) return;

      const { x, y } = this._cursorPosition;

      const canvasRect = this._canvas.getBoundingClientRect();

      const dx = x < canvasRect.left + this._edgeThreshold ? this._edgeScrollSpeed : x > canvasRect.right - this._edgeThreshold ? -this._edgeScrollSpeed : 0;

      const dz = y < canvasRect.top + this._edgeThreshold ? this._edgeScrollSpeed : y > canvasRect.bottom - this._edgeThreshold ? -this._edgeScrollSpeed : 0;

      if (dx !== 0 || dz !== 0) {
        const forward = this.camera!.getTarget().subtract(this.camera!.position).normalize();
        const right = BABYLON.Vector3.Cross(forward, this.camera!.upVector);

        const movement = right.scale(dx).add(forward.scale(dz));
        movement.y = 0;

        if (this._isInBounds(this.camera!.target.add(movement))) {
          this.camera!.position.addInPlace(movement);
          this.camera!.target.addInPlace(movement);
        }
      }
    }, 16); // run at ~60 FPS (16ms interval)
  }
}
