precision highp float;

in vec3 position;
uniform mat4 worldViewProjection;

out vec3 vPosition;

void main() {
  vPosition = position;

  gl_Position = worldViewProjection * vec4(position, 1.0);
}
