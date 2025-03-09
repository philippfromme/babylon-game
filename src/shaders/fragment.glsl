precision highp float;

uniform float minHeight;
uniform float maxHeight;
uniform vec3 lowColor;
uniform vec3 midColor;
uniform vec3 highColor;

uniform vec3 lightDirection; // Direction of the light source (normalized)
varying vec3 vPosition;      // Position of the vertex in world space
varying vec3 vNormal;        // Normal of the vertex in world space

void main() {

  // determine color based on height
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

  // calculate diffuse lighting
  vec3 normal = normalize(vNormal);       // Ensure normal is normalized
  vec3 lightDir = normalize(lightDirection); // Ensure light direction is normalized
  float diffuseIntensity = max(dot(normal, lightDir), 0.0); // Lambertian reflectance

  // combine terrain color with lighting
  vec3 finalColor = terrainColor * diffuseIntensity;

  gl_FragColor = vec4(finalColor, 1.0);
}