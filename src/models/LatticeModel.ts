import { type vec3 } from '../math';
import { PlaneModel } from './PlaneModel';

// 1×1×1 cube, each face subdivided into a 3×3 grid of smaller planes.
// Renders as a cage with internal structure — 24 edges per face × 6 faces = 144 edges.

const SIZE = 1.0;
const DIVS = 3;
const STEP = SIZE / DIVS;
const H = SIZE / 2; // half-extent

function addFace(origin: vec3, uAxis: vec3, vAxis: vec3, out: number[]): void {
  function pt(u: number, v: number): vec3 {
    return [
      origin[0] + uAxis[0] * u + vAxis[0] * v,
      origin[1] + uAxis[1] * u + vAxis[1] * v,
      origin[2] + uAxis[2] * u + vAxis[2] * v,
    ];
  }
  function push(a: vec3, b: vec3): void {
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  // horizontal lines (fixed v, vary u)
  for (let vi = 0; vi <= DIVS; vi++) {
    for (let ui = 0; ui < DIVS; ui++) {
      push(pt(ui * STEP, vi * STEP), pt((ui + 1) * STEP, vi * STEP));
    }
  }
  // vertical lines (fixed u, vary v)
  for (let ui = 0; ui <= DIVS; ui++) {
    for (let vi = 0; vi < DIVS; vi++) {
      push(pt(ui * STEP, vi * STEP), pt(ui * STEP, (vi + 1) * STEP));
    }
  }
}

export class LatticeModel extends PlaneModel {
  buildEdges(): Float32Array {
    const out: number[] = [];
    // Each face: origin at a corner, uAxis and vAxis spanning the face
    addFace([-H, -H,  H], [1, 0,  0], [0, 1, 0], out); // +Z
    addFace([ H, -H, -H], [-1, 0, 0], [0, 1, 0], out); // -Z
    addFace([ H, -H, -H], [0, 0,  1], [0, 1, 0], out); // +X
    addFace([-H, -H,  H], [0, 0, -1], [0, 1, 0], out); // -X (wait, needs -X face)
    addFace([-H,  H,  H], [1, 0,  0], [0, 0,-1], out); // +Y
    addFace([-H, -H, -H], [1, 0,  0], [0, 0, 1], out); // -Y
    return new Float32Array(out);
  }
}
