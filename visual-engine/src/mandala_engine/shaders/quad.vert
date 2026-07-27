#version 330

// Fullscreen triangle-strip quad. in_pos spans the clip-space square
// [-1, 1] x [-1, 1]; v_uv is the corresponding [0, 1] x [0, 1] coordinate.
in vec2 in_pos;
out vec2 v_uv;

void main() {
    v_uv = in_pos * 0.5 + 0.5;
    gl_Position = vec4(in_pos, 0.0, 1.0);
}
