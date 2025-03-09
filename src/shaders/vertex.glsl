precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 worldViewProjection;
uniform mat4 world;

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vPosition = (world * vec4(position, 1.0)).xyz; // transform position to world space
  vNormal = normalize(mat3(world) * normal);    // transform normal to world space

  gl_Position = worldViewProjection * vec4(position, 1.0); // transform position to clip space
}