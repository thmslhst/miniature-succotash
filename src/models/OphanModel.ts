import { type vec3 } from '../math';
import { PlaneModel } from './PlaneModel';

// OphanModel — Ophanim: the wheel-angels of Ezekiel 1 & 10.
// Three interlocking gyroscopic rings full of eyes, gear-toothed outer rim,
// radial spokes, a tilted inner halo, and a central octahedral nucleus.
// Rotates like clockwork. Full of eyes.

const TAU = Math.PI * 2;

function seg(out: number[], ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
  out.push(ax, ay, az, bx, by, bz);
}

// n-gon ring in the plane spanned by orthogonal unit axes ua and ub
function ring(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
    seg(out,
      (ua[0]*c0 + ub[0]*s0)*r, (ua[1]*c0 + ub[1]*s0)*r, (ua[2]*c0 + ub[2]*s0)*r,
      (ua[0]*c1 + ub[0]*s1)*r, (ua[1]*c1 + ub[1]*s1)*r, (ua[2]*c1 + ub[2]*s1)*r,
    );
  }
}

// Radial spokes from origin to ring rim
function spokes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    seg(out, 0, 0, 0, (ua[0]*c + ub[0]*s)*r, (ua[1]*c + ub[1]*s)*r, (ua[2]*c + ub[2]*s)*r);
  }
}

// Gear teeth: small triangular protrusions at n positions on a ring
function gearTeeth(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const tipR = r + 0.13, hw = 0.045;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const [cL, sL] = [Math.cos(a - hw), Math.sin(a - hw)];
    const [cR, sR] = [Math.cos(a + hw), Math.sin(a + hw)];
    const tip: vec3  = [(ua[0]*c  + ub[0]*s )*tipR, (ua[1]*c  + ub[1]*s )*tipR, (ua[2]*c  + ub[2]*s )*tipR];
    const bL: vec3   = [(ua[0]*cL + ub[0]*sL)*r,    (ua[1]*cL + ub[1]*sL)*r,    (ua[2]*cL + ub[2]*sL)*r   ];
    const bR: vec3   = [(ua[0]*cR + ub[0]*sR)*r,    (ua[1]*cR + ub[1]*sR)*r,    (ua[2]*cR + ub[2]*sR)*r   ];
    seg(out, bL[0], bL[1], bL[2], tip[0], tip[1], tip[2]);
    seg(out, tip[0], tip[1], tip[2], bR[0], bR[1], bR[2]);
  }
}

// Diamond (rhombus) eye at point p, half-axes ta (tangent) and tb (radial), half-size s
function diamond(p: vec3, ta: vec3, tb: vec3, s: number, out: number[]): void {
  const v: vec3[] = [
    [p[0]+ta[0]*s, p[1]+ta[1]*s, p[2]+ta[2]*s],
    [p[0]+tb[0]*s, p[1]+tb[1]*s, p[2]+tb[2]*s],
    [p[0]-ta[0]*s, p[1]-ta[1]*s, p[2]-ta[2]*s],
    [p[0]-tb[0]*s, p[1]-tb[1]*s, p[2]-tb[2]*s],
  ];
  for (let i = 0; i < 4; i++) {
    const a = v[i], b = v[(i + 1) % 4];
    seg(out, a[0], a[1], a[2], b[0], b[1], b[2]);
  }
}

// Eye-diamonds distributed evenly along a ring
function eyes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const p: vec3  = [(ua[0]*c + ub[0]*s)*r, (ua[1]*c + ub[1]*s)*r, (ua[2]*c + ub[2]*s)*r];
    const ta: vec3 = [-ua[0]*s + ub[0]*c,    -ua[1]*s + ub[1]*c,    -ua[2]*s + ub[2]*c   ]; // tangent
    const tb: vec3 = [ ua[0]*c + ub[0]*s,     ua[1]*c + ub[1]*s,     ua[2]*c + ub[2]*s   ]; // radial
    diamond(p, ta, tb, 0.072, out);
  }
}

export class OphanModel extends PlaneModel {
  buildEdges(): Float32Array {
    const out: number[] = [];

    // Axis pairs for three orthogonal planes
    const X: vec3 = [1, 0, 0], Y: vec3 = [0, 1, 0], Z: vec3 = [0, 0, 1];
    const S = Math.SQRT1_2; // 1/√2 for 45° tilt
    const diag: vec3 = [0, S, S]; // tilted axis in YZ at 45°

    // ── Outer wheel: XZ plane, r=1.0 ─────────────────────────────────
    ring      (1.00, 24, X, Z, out); //  24 segments — primary wheel
    gearTeeth (1.00, 18, X, Z, out); //  36 segments — 18 teeth × 2 lines
    spokes    (1.00,  8, X, Z, out); //   8 segments — radial arms
    eyes      (1.00,  8, X, Z, out); //  32 segments — 8 eyes × 4 edges

    // ── Second wheel: XY plane, r=0.86 ───────────────────────────────
    ring      (0.86, 20, X, Y, out); //  20 segments
    spokes    (0.86,  8, X, Y, out); //   8 segments
    eyes      (0.86,  8, X, Y, out); //  32 segments

    // ── Third wheel: YZ plane, r=0.70 ────────────────────────────────
    ring      (0.70, 18, Y, Z, out); //  18 segments
    eyes      (0.70,  6, Y, Z, out); //  24 segments

    // ── Inner halo: tilted 45° ring, r=0.52 ──────────────────────────
    ring      (0.52, 14, X, diag, out); //  14 segments — wheel-within-wheel
    eyes      (0.52,  7, X, diag, out); //  28 segments

    // ── Central nucleus: octahedron ───────────────────────────────────
    // 6 vertices at ±r on each axis, 12 edges connecting non-opposite pairs
    const nr = 0.19;
    const v: vec3[] = [
      [ nr,  0,  0], [-nr,  0,  0],  // ±X
      [  0, nr,  0], [  0, -nr,  0], // ±Y
      [  0,  0, nr], [  0,  0, -nr], // ±Z
    ];
    const edges = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
    for (const [a, b] of edges) {
      seg(out, v[a][0], v[a][1], v[a][2], v[b][0], v[b][1], v[b][2]);
    }

    return new Float32Array(out);
  }
}
