import * as BABYLON from "@babylonjs/core";

export default class HeightColorMaterialPlugin extends BABYLON.MaterialPluginBase {
  _isEnabled: boolean = false;

  moistureMap: BABYLON.Nullable<BABYLON.BaseTexture> = null;
  colorMap: BABYLON.Nullable<BABYLON.BaseTexture> = null;

  minHeight = 0;
  maxHeight = 1;

  constructor(material: BABYLON.Material) {
    // the second parameter is the name of this plugin.
    // the third one is a priority, which lets you define the order multiple plugins are run. Lower numbers run first.
    // the fourth one is a list of defines used in the shader code.
    super(material, "HeightColor", 100, {
      HeightColor: false,
    });

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

  setHeightRange(minHeight: number, maxHeight: number) {
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
  }

  setMoistureMap(moistureMap: BABYLON.Nullable<BABYLON.BaseTexture>) {
    this.moistureMap = moistureMap;
  }

  setColorMap(colorMap: BABYLON.Nullable<BABYLON.BaseTexture>) {
    this.colorMap = colorMap;
  }

  // Also, you should always associate a define with your plugin because the list of defines (and their values)
  // is what triggers a recompilation of the shader: a shader is recompiled only if a value of a define changes.
  prepareDefines(defines: BABYLON.MaterialDefines, scene: BABYLON.Scene, mesh: BABYLON.AbstractMesh) {
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
      ubo: [
        { name: "minHeight", size: 1, type: "float" },
        { name: "maxHeight", size: 1, type: "float" },
      ],
      fragment: `#ifdef HeightColor
                    uniform float minHeight;
                    uniform float maxHeight;
                #endif`,
    };
  }

  getSamplers(samplers: string[]) {
    samplers.push("moistureMap");
    samplers.push("colorMap");
  }

  // whenever a material is bound to a mesh, we need to update the uniforms.
  // so bind our uniform variable to the actual color we have in the instance.
  bindForSubMesh(uniformBuffer: BABYLON.UniformBuffer, scene: BABYLON.Scene, engine: BABYLON.AbstractEngine, subMesh: BABYLON.SubMesh) {
    if (this._isEnabled) {
      uniformBuffer.updateFloat("minHeight", this.minHeight);
      uniformBuffer.updateFloat("maxHeight", this.maxHeight);
      uniformBuffer.setTexture("moistureMap", this.moistureMap);
      uniformBuffer.setTexture("colorMap", this.colorMap);
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
        CUSTOM_FRAGMENT_DEFINITIONS: `
          uniform sampler2D moistureMap;
          uniform sampler2D colorMap;

          vec4 computeBaseColor() {
            float height = vPositionW.y;

            float normalizedHeight = (height - minHeight) / (maxHeight - minHeight);

            float moisture = texture(moistureMap, vec2(vMainUV1.x, 1.0 - vMainUV1.y)).r;

            return texture(colorMap, vec2(moisture, normalizedHeight));
          }
        `,
        "!baseColor\\=texture2D\\(diffuseSampler,vDiffuseUV\\+uvOffset\\);": `baseColor = computeBaseColor();`,
      };
    }

    // for other shader types we're not doing anything, return null
    return null;
  }
}
