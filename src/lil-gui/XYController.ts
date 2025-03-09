import { Controller, GUI as _GUI } from "lil-gui";

function injectStyles(cssContent: string) {
  const injected = document.createElement("style");
  injected.innerHTML = cssContent;
  const before = document.querySelector("head link[rel=stylesheet], head style");
  if (before) {
    document.head.insertBefore(injected, before);
  } else {
    document.head.appendChild(injected);
  }
}

class XYController extends Controller {
  static $id = "XY";
  static $style = `.lil-gui .controller.XY .area {
    overflow: hidden;
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: var(--widget-color);
    border-radius: var(--widget-border-radius);
  }
  
  .lil-gui .controller.XY .handle { 
    position: absolute;
    width: 10%;
    height: 10%;
    margin-left: -5%;
    margin-top: -5%;
    background: var(--text-color);
    cursor: pointer;
  }
  
  .lil-gui .controller.XY .axis { 
    position: absolute;
    background: var(--focus-color);
  }
  
  .lil-gui .controller.XY .axis.x { 
    top: 50%;
    width: 100%;
    height: 1px;
  }
  
  .lil-gui .controller.XY .axis.y { 
    left: 50%;
    height: 100%;
    width: 1px;
  }`;

  private area!: HTMLDivElement;
  private handle!: HTMLDivElement;
  private _initialValue: { x: number; y: number };
  private _toDisable: HTMLElement[] = [];
  private _isPrimitive: boolean;
  _listenPrevValue: { x: number; y: number } = { x: 0, y: 0 }; // Initialize with a default value

  constructor(parent: GUI, object: any, property: string, ...args: any[]) {
    super(parent, object, property, "custom");

    this.domElement.classList.add(XYController.$id);

    injectStyles(XYController.$style);
    this.createElements();
    this.addInteractivity();
    this.$constructor(...args);

    this._initialValue = this.save();

    this._prepareFormElements();

    this._isPrimitive = this.$copy === undefined;

    this.updateDisplay();
    this._listenPrevValue = { ...this.$value }; // Initialize with a copy of the initial value
    this._listenCallback();

    return this;
  }

  get $value(): { x: number; y: number } {
    return this.getValue();
  }

  set $value(value: { x: number; y: number }) {
    this.setValue(value);
  }

  $constructor(...args: any[]) {}

  $updateDisplay() {
    this.handle.style.left = map(this.$value.x, -1, 1, 0, 1) * 100 + "%";
    this.handle.style.top = (1 - map(this.$value.y, -1, 1, 0, 1)) * 100 + "%";
  }

  $copy(to: { x: number; y: number }, from: { x: number; y: number }) {
    to.x = from.x;
    to.y = from.y;
  }

  $compare(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    return a.x === b.x && a.y === b.y;
  }

  $onChange() {
    this._callOnChange();
    this.updateDisplay();
  }

  $onFinishChange() {
    this._callOnFinishChange();
  }

  private _prepareFormElements() {
    const SELECTORS = ["*[tabindex]", "input", "label", "select", "textarea", "button", "fieldset", "legend", "datalist", "output", "option", "optgroup"];

    const elements = this.$widget.querySelectorAll(SELECTORS.join(","));

    Array.from(elements).forEach((el) => {
      this._toDisable.push(el as HTMLElement);

      if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby")) {
        el.setAttribute("aria-labelledby", this.$name.id);
      }
    });
  }

  _listenCallback() {
    requestAnimationFrame(() => this._listenCallback());

    if (!this.$compare(this._listenPrevValue, this.$value)) {
      this.updateDisplay();
      this._listenPrevValue = { ...this.$value }; // Update previous value with a copy
    }
  }

  disable(disabled: boolean): this {
    super.disable(disabled);
    this._toDisable.forEach((el) => el.toggleAttribute("disabled", disabled));
    return this;
  }

  updateDisplay(): this {
    this.$updateDisplay();
    return this;
  }

  save(): { x: number; y: number } {
    return { ...this.$value };
  }

  load(saved: { x: number; y: number }): this {
    this.$value = { ...saved };
    this.$onChange();
    this.$onFinishChange();
    return this;
  }

  reset(): this {
    return this.load(this._initialValue);
  }

  private createElements() {
    this.area = document.createElement("div");
    this.area.className = "area";

    this.handle = document.createElement("div");
    this.handle.className = "handle";

    const axisX = document.createElement("div");
    axisX.className = "axis x";

    const axisY = document.createElement("div");
    axisY.className = "axis y";

    this.area.appendChild(axisX);
    this.area.appendChild(axisY);
    this.area.appendChild(this.handle);

    this.$widget.appendChild(this.area);
  }

  private addInteractivity() {
    const onMouseMove = (event: MouseEvent) => {
      const rect = this.area.getBoundingClientRect();

      const x = this.normalize(event.clientX, rect.left, rect.right);
      const y = this.normalize(event.clientY, rect.bottom, rect.top);

      console.log(x, y);

      this.$value = { x, y };
      this.$onChange();
    };

    const onMouseUp = () => {
      this.$onFinishChange();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    this.handle.addEventListener("mousedown", () => {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  private normalize(value: number, min: number, max: number): number {
    const t = (value - min) / (max - min);

    return map(Math.min(Math.max(0, t), 1), 0, 1, -1, 1);
  }
}

export class GUI extends _GUI {
  addFolder(title: string): GUI {
    const folder = new GUI({ parent: this, title });
    if (this.root._closeFolders) folder.close();
    return folder;
  }

  addXY(object: any, property: string, ...args: any[]) {
    return new XYController(this, object, property, ...args);
  }
}

function map(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return toMin + (toMax - toMin) * ((value - fromMin) / (fromMax - fromMin));
}
