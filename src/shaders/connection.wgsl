struct Uniforms {
  viewProj : mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> u : Uniforms;

struct VOut {
  @builtin(position) pos   : vec4<f32>,
  @location(0)       alpha : f32,
}

@vertex
fn vs(
  @location(0) pos   : vec3<f32>,
  @location(1) alpha : f32,
) -> VOut {
  var out : VOut;
  out.pos   = u.viewProj * vec4<f32>(pos, 1.0);
  out.alpha = alpha;
  return out;
}

@fragment
fn fs(in : VOut) -> @location(0) vec4<f32> {
  return vec4<f32>(0.75, 0.80, 1.0, in.alpha);
}
