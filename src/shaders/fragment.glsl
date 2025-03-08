precision highp float;

uniform float minHeight;
uniform float maxHeight;
uniform vec3 lowColor;
uniform vec3 midColor;
uniform vec3 highColor;

varying vec3 vPosition;

void main() {
  float height = vPosition.y;
  float normalizedHeight = (height - minHeight) / (maxHeight - minHeight);

  normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);

  vec3 terrainColor;

  if (normalizedHeight < 0.33) {
    terrainColor = mix(lowColor, midColor, normalizedHeight * 3.0);
  } else if (normalizedHeight < 0.66) {
    terrainColor = mix(midColor, highColor, (normalizedHeight - 0.33) * 3.0);
  } else {
    terrainColor = highColor;
  }

  gl_FragColor = vec4(terrainColor, 1.0);
}

