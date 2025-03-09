import * as BABYLON from "@babylonjs/core";

export default class HeightColorMaterialPlugin extends BABYLON.MaterialPluginBase {
  _isEnabled: boolean = false;
  private _varColorName: string;

  static lowColor = new BABYLON.Color3(0.0, 0.0, 1.0);

  constructor(material: BABYLON.Material) {
    // the second parameter is the name of this plugin.
    // the third one is a priority, which lets you define the order multiple plugins are run. Lower numbers run first.
    // the fourth one is a list of defines used in the shader code.
    super(material, "HeightColor", 100, {
      HeightColor: false,
    });

    this._varColorName =
      material instanceof BABYLON.PBRBaseMaterial ? "finalColor" : "color";

    this._enable(true);
  }

  get isEnabled() {
    return this._isEnabled;
  }

  set isEnabled(enabled) {
    if (this._isEnabled === enabled) {
      return;
    }
    this._isEnabled = enabled;
    this.markAllDefinesAsDirty();
    this._enable(this._isEnabled);
  }

  // Also, you should always associate a define with your plugin because the list of defines (and their values)
  // is what triggers a recompilation of the shader: a shader is recompiled only if a value of a define changes.
  prepareDefines(
    defines: BABYLON.MaterialDefines,
    scene: BABYLON.Scene,
    mesh: BABYLON.AbstractMesh
  ) {
    defines["HeightColor"] = this._isEnabled;
  }

  // here we can define any uniforms to be passed to the shader code.
  getUniforms(shaderLanguage?: BABYLON.ShaderLanguage): {
    ubo?: Array<{
      name: string;
      size?: number;
      type?: string;
      arraySize?: number;
    }>;
    vertex?: string;
    fragment?: string;
  } {
    return {
      ubo: [{ name: "lowColor", size: 3, type: "vec3" }],
      fragment: `#ifdef HeightColor
                    uniform vec3 lowColor;
                #endif`,
    };
  }

  // whenever a material is bound to a mesh, we need to update the uniforms.
  // so bind our uniform variable to the actual color we have in the instance.
  bindForSubMesh(
    uniformBuffer: BABYLON.UniformBuffer,
    scene: BABYLON.Scene,
    engine: BABYLON.AbstractEngine,
    subMesh: BABYLON.SubMesh
  ) {
    if (this._isEnabled) {
      console.log("Binding lowColor");
      uniformBuffer.updateColor3(
        "lowColor",
        HeightColorMaterialPlugin.lowColor
      );
    }
  }

  getClassName() {
    return "HeightColorMaterialPlugin";
  }

  isCompatible(shaderLanguage: BABYLON.ShaderLanguage): boolean {
    switch (shaderLanguage) {
      case BABYLON.ShaderLanguage.GLSL:
      case BABYLON.ShaderLanguage.WGSL:
        return true;
      default:
        return false;
    }
  }

  getCustomCode(
    shaderType: string,
    shaderLanguage?: BABYLON.ShaderLanguage
  ): BABYLON.Nullable<{
    [pointName: string]: string;
  }> {
    if (shaderType === "fragment") {
      return {
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
                #ifdef HeightColor
                    ${this._varColorName}.rgb *= lowColor;
                #endif
            `,

        "!diffuseBase\\+=info\\.diffuse\\*shadow;": `
                diffuseBase += info.diffuse*shadow;
            `,
      };
    }

    // for other shader types we're not doing anything, return null
    return null;
  }
}
