import * as BABYLON from "@babylonjs/core";

import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

interface MoveCameraInputOptions {
  dragSpeed?: number;
  edgeScrollEnabled?: boolean;
  edgeScrollSpeed?: number;
  edgeScrollThreshold?: number;
  bounds?: Bounds;
}

const DEFAULT_OPTIONS: Required<MoveCameraInputOptions> = {
  dragSpeed: 0.05,
  edgeScrollEnabled: false,
  edgeScrollSpeed: 0.7,
  edgeScrollThreshold: 20,
  bounds: { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity },
};

export default class MoveCameraInput
  implements BABYLON.ICameraInput<BABYLON.ArcRotateCamera>
{
  camera: BABYLON.Nullable<BABYLON.ArcRotateCamera>;
  private _scene: BABYLON.Scene;
  private _isDragging: boolean = false;
  private _previousPosition: { x: number; y: number } | null = null;
  private _canvas: HTMLCanvasElement;
  private _dragSpeed: number;
  private _edgeScrollEnabled: boolean;
  private _edgeScrollSpeed: number;
  private _edgeThreshold: number;
  private _cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private _edgeScrollInterval: BABYLON.Nullable<number> = null;
  private _bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  // private _axesViewer?: AxesViewer;

  constructor(
    canvas: HTMLCanvasElement,
    scene: BABYLON.Scene,
    options: MoveCameraInputOptions = {}
  ) {
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
    return "MoveCameraInput";
  }

  getSimpleName() {
    return "moveCamera";
  }

  attachControl(noPreventDefault?: boolean): void {
    // Attach pointer events for dragging
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

    // track mouse position for edge scrolling
    this._canvas.addEventListener("mousemove", (event) => {
      this._cursorPosition.x = event.clientX;
      this._cursorPosition.y = event.clientY;
    });

    // start edge scrolling logic
    this._startEdgeScrolling();

    // for debugging show axes at camera target
    // if (this.camera) {
    //   this._axesViewer = new AxesViewer(this._scene, 3);
    //   this._axesViewer.update(
    //     this.camera.target,
    //     BABYLON.Vector3.Right(),
    //     BABYLON.Vector3.Up(),
    //     BABYLON.Vector3.Forward()
    //   );
    // }
  }

  detachControl(): void {
    // clean up event listeners and intervals
    if (this._edgeScrollInterval !== null) {
      clearInterval(this._edgeScrollInterval);
      this._edgeScrollInterval = null;
    }
    this._canvas.removeEventListener("mousemove", () => {});
  }

  checkInputs(): void {
    // not needed for this implementation
  }

  private _onPointerDown(pointerInfo: BABYLON.PointerInfo): void {
    if (pointerInfo.event.button === 2) {
      // prevent default right-click behavior
      pointerInfo.event.preventDefault();

      // right mouse button
      this._isDragging = true;
      this._previousPosition = {
        x: pointerInfo.event.clientX,
        y: pointerInfo.event.clientY,
      };
    }
  }

  setEdgeScrollSpeed(speed: number): void {
    this._edgeScrollSpeed = speed;
  }

  setDragSpeed(speed: number): void {
    this._dragSpeed = speed;
  }

  setEdgeThreshold(threshold: number): void {
    this._edgeThreshold = threshold;
  }

  private _onPointerMove(pointerInfo: BABYLON.PointerInfo): void {
    if (!this._isDragging || !this._previousPosition || !this.camera) return;

    const dx = pointerInfo.event.clientX - this._previousPosition.x;
    const dy = pointerInfo.event.clientY - this._previousPosition.y;

    // calculate movement in world space
    const forward = this.camera
      .getTarget()
      .subtract(this.camera.position)
      .normalize();

    const right = BABYLON.Vector3.Cross(forward, this.camera.upVector);

    let movement = right
      .scale(-dx * this._dragSpeed)
      .add(forward.scale(-dy * this._dragSpeed));

    // opposite direction
    movement = movement.scale(-1);

    movement.y = 0; // keep movement in X-Z plane

    // update camera position
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
      // right mouse button
      this._isDragging = false;
      this._previousPosition = null;
    }
  }

  private _startEdgeScrolling(): void {
    if (!this.camera) return;

    this._edgeScrollInterval = window.setInterval(() => {
      if (!this._edgeScrollEnabled) return;
      // console.log(this.camera?.position, this.camera?.target);

      // this._axesViewer?.update(
      //   this.camera!.target,
      //   BABYLON.Vector3.Right(),
      //   BABYLON.Vector3.Up(),
      //   BABYLON.Vector3.Forward()
      // );

      const { x, y } = this._cursorPosition;

      const canvasRect = this._canvas.getBoundingClientRect();

      const dx =
        x < canvasRect.left + this._edgeThreshold
          ? this._edgeScrollSpeed
          : x > canvasRect.right - this._edgeThreshold
          ? -this._edgeScrollSpeed
          : 0;

      const dz =
        y < canvasRect.top + this._edgeThreshold
          ? this._edgeScrollSpeed
          : y > canvasRect.bottom - this._edgeThreshold
          ? -this._edgeScrollSpeed
          : 0;

      if (dx !== 0 || dz !== 0) {
        const forward = this.camera!.getTarget()
          .subtract(this.camera!.position)
          .normalize();
        const right = BABYLON.Vector3.Cross(forward, this.camera!.upVector);

        const movement = right.scale(dx).add(forward.scale(dz));
        movement.y = 0; // keep movement in X-Z plane

        // update camera position and target for panning effect
        if (this._isInBounds(this.camera!.target.add(movement))) {
          this.camera!.position.addInPlace(movement);
          this.camera!.target.addInPlace(movement);
        }
      }
    }, 16); // run at ~60 FPS (16ms interval)
  }

  private _isInBounds(position: BABYLON.Vector3): boolean {
    return (
      position.x >= this._bounds.minX &&
      position.x <= this._bounds.maxX &&
      position.z >= this._bounds.minZ &&
      position.z <= this._bounds.maxZ
    );
  }
}
