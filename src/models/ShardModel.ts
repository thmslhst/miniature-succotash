import { type vec3, rotateX, rotateY } from '../math';
import { PlaneModel } from './PlaneModel';

// Five intersecting rectangular planes forming a crystal shard.
// One vertical center plane, two rotated ±40° around Y, two rotated ±70° around X.

const W = 0.4, H = 0.8;

function baseCorners(): vec3[] {
  return [
    [-W / 2, -H / 2, 0],
    [ W / 2, -H / 2, 0],
    [ W / 2,  H / 2, 0],
    [-W / 2,  H / 2, 0],
  ];
}

function pushPlane(verts: vec3[], out: number[]): void {
  for (let i = 0; i < 4; i++) {
    const a = verts[i], b = verts[(i + 1) % 4];
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

export class ShardModel extends PlaneModel {
  buildEdges(): Float32Array {
    const out: number[] = [];
    const r40 = Math.PI * 40 / 180;
    const r70 = Math.PI * 70 / 180;

    // Center XY plane
    pushPlane(baseCorners(), out);

    // ±40° around Y
    pushPlane(baseCorners().map(v => rotateY(v, r40)), out);
    pushPlane(baseCorners().map(v => rotateY(v, -r40)), out);

    // ±70° around X, offset slightly upward
    pushPlane(baseCorners().map(v => { const r = rotateX(v, r70);  return [r[0], r[1] + 0.1, r[2]] as vec3; }), out);
    pushPlane(baseCorners().map(v => { const r = rotateX(v, -r70); return [r[0], r[1] + 0.1, r[2]] as vec3; }), out);

    return new Float32Array(out);
  }
}
