struct Uniforms {
  viewProj : mat4x4<f32>,
}

struct ConnUniforms {
  color : vec4<f32>,
}

@group(0) @binding(0) var<uniform> u : Uniforms;
@group(1) @binding(0) var<uniform> c : ConnUniforms;

@vertex
fn vs(@location(0) pos: vec3<f32>) -> @builtin(position) vec4<f32> {
  return u.viewProj * vec4<f32>(pos, 1.0);
}

@fragment
fn fs() -> @location(0) vec4<f32> {
  return c.color;
}
