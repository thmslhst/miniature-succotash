import { type vec3, rotateY } from '../math';
import { PlaneModel } from './PlaneModel';

// Eight planes arranged radially around Y axis + one horizontal equatorial plane.
// Each radial plane rotated (i/8)*2π around Y — produces a mandala / wheel silhouette.

const PW = 0.6, PH = 0.3; // radial plane dimensions
const N  = 8;              // radial plane count
const EW = 0.8;            // equatorial plane size

function pushRect(hw: number, hh: number, xform: (v: vec3) => vec3, out: number[]): void {
  const base: vec3[] = [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0]];
  const verts: vec3[] = base.map(xform);
  for (let i = 0; i < 4; i++) {
    const a = verts[i], b = verts[(i + 1) % 4];
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

export class MandalaMdl extends PlaneModel {
  buildEdges(): Float32Array {
    const out: number[] = [];

    // Radial planes
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      pushRect(PW / 2, PH / 2, v => rotateY(v, angle), out);
    }

    // Horizontal equatorial plane in XZ
    const e: vec3[] = [
      [-EW / 2, 0, -EW / 2],
      [ EW / 2, 0, -EW / 2],
      [ EW / 2, 0,  EW / 2],
      [-EW / 2, 0,  EW / 2],
    ];
    for (let i = 0; i < 4; i++) {
      const a = e[i], b = e[(i + 1) % 4];
      out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }

    return new Float32Array(out);
  }
}
