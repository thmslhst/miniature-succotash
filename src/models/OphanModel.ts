import { type vec3 } from '../math';
import { PlaneModel } from './PlaneModel';
import type { OrgVariant } from '../OrganicTextureGen';

// OphanModel — Ophanim: the wheel-angels of Ezekiel 1 & 10.
// Three interlocking gyroscopic rings full of eyes, gear-toothed outer rim,
// radial spokes, a tilted inner halo, and a central octahedral nucleus.

const TAU = Math.PI * 2;

// ── Edge geometry helpers ────────────────────────────────────────────────────

function seg(out: number[], ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
  out.push(ax, ay, az, bx, by, bz);
}
function ring(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
    seg(out, (ua[0]*c0+ub[0]*s0)*r, (ua[1]*c0+ub[1]*s0)*r, (ua[2]*c0+ub[2]*s0)*r,
             (ua[0]*c1+ub[0]*s1)*r, (ua[1]*c1+ub[1]*s1)*r, (ua[2]*c1+ub[2]*s1)*r);
  }
}
function spokes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    seg(out, 0, 0, 0, (ua[0]*c+ub[0]*s)*r, (ua[1]*c+ub[1]*s)*r, (ua[2]*c+ub[2]*s)*r);
  }
}
function gearTeeth(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const tipR = r + 0.13, hw = 0.045;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const tip: vec3 = [(ua[0]*c+ub[0]*s)*tipR, (ua[1]*c+ub[1]*s)*tipR, (ua[2]*c+ub[2]*s)*tipR];
    const bL:  vec3 = [(ua[0]*Math.cos(a-hw)+ub[0]*Math.sin(a-hw))*r, (ua[1]*Math.cos(a-hw)+ub[1]*Math.sin(a-hw))*r, (ua[2]*Math.cos(a-hw)+ub[2]*Math.sin(a-hw))*r];
    const bR:  vec3 = [(ua[0]*Math.cos(a+hw)+ub[0]*Math.sin(a+hw))*r, (ua[1]*Math.cos(a+hw)+ub[1]*Math.sin(a+hw))*r, (ua[2]*Math.cos(a+hw)+ub[2]*Math.sin(a+hw))*r];
    seg(out, bL[0], bL[1], bL[2], tip[0], tip[1], tip[2]);
    seg(out, tip[0], tip[1], tip[2], bR[0], bR[1], bR[2]);
  }
}
function diamond(p: vec3, ta: vec3, tb: vec3, s: number, out: number[]): void {
  const v: vec3[] = [
    [p[0]+ta[0]*s, p[1]+ta[1]*s, p[2]+ta[2]*s],
    [p[0]+tb[0]*s, p[1]+tb[1]*s, p[2]+tb[2]*s],
    [p[0]-ta[0]*s, p[1]-ta[1]*s, p[2]-ta[2]*s],
    [p[0]-tb[0]*s, p[1]-tb[1]*s, p[2]-tb[2]*s],
  ];
  for (let i = 0; i < 4; i++) { const a = v[i], b = v[(i+1)%4]; seg(out, a[0], a[1], a[2], b[0], b[1], b[2]); }
}
function eyes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    const p: vec3  = [(ua[0]*c+ub[0]*s)*r, (ua[1]*c+ub[1]*s)*r, (ua[2]*c+ub[2]*s)*r];
    const ta: vec3 = [-ua[0]*s+ub[0]*c,    -ua[1]*s+ub[1]*c,    -ua[2]*s+ub[2]*c   ];
    const tb: vec3 = [ ua[0]*c+ub[0]*s,     ua[1]*c+ub[1]*s,     ua[2]*c+ub[2]*s   ];
    diamond(p, ta, tb, 0.072, out);
  }
}

// ── Face geometry helpers ────────────────────────────────────────────────────

function vtx(out: number[], x: number, y: number, z: number, u: number, v: number): void {
  out.push(x, y, z, u, v);
}
function ringFaces(r: number, w: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const ri = r - w * 0.5, ro = r + w * 0.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
    const u0 = i / n, u1 = (i + 1) / n;
    const i0 = [(ua[0]*c0+ub[0]*s0)*ri, (ua[1]*c0+ub[1]*s0)*ri, (ua[2]*c0+ub[2]*s0)*ri] as const;
    const o0 = [(ua[0]*c0+ub[0]*s0)*ro, (ua[1]*c0+ub[1]*s0)*ro, (ua[2]*c0+ub[2]*s0)*ro] as const;
    const i1 = [(ua[0]*c1+ub[0]*s1)*ri, (ua[1]*c1+ub[1]*s1)*ri, (ua[2]*c1+ub[2]*s1)*ri] as const;
    const o1 = [(ua[0]*c1+ub[0]*s1)*ro, (ua[1]*c1+ub[1]*s1)*ro, (ua[2]*c1+ub[2]*s1)*ro] as const;
    vtx(out, i0[0], i0[1], i0[2], u0, 0); vtx(out, o0[0], o0[1], o0[2], u0, 1); vtx(out, o1[0], o1[1], o1[2], u1, 1);
    vtx(out, i0[0], i0[1], i0[2], u0, 0); vtx(out, o1[0], o1[1], o1[2], u1, 1); vtx(out, i1[0], i1[1], i1[2], u1, 0);
  }
}
function octaFaces(r: number, out: number[]): void {
  const v: vec3[] = [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
  const faces = [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,2,5],[1,5,3],[1,3,4]];
  for (const [ai, bi, ci] of faces) {
    for (const vi of [ai, bi, ci]) {
      const p = v[vi];
      const u = 0.5 + Math.atan2(p[2], p[0]) / TAU;
      const fv = 0.5 + Math.asin(Math.max(-1, Math.min(1, p[1] / r))) / Math.PI;
      vtx(out, p[0], p[1], p[2], u, fv);
    }
  }
}

// ── Model class ──────────────────────────────────────────────────────────────

export class OphanModel extends PlaneModel {
  protected faceTextureVariant(): OrgVariant { return 'cellular'; }
  protected faceTextureSeed():    number      { return 0xB4B1A6E; }

  buildEdges(): Float32Array {
    const out: number[] = [];
    const X: vec3 = [1,0,0], Y: vec3 = [0,1,0], Z: vec3 = [0,0,1];
    const S = Math.SQRT1_2;
    const diag: vec3 = [0, S, S];

    ring      (1.00, 24, X, Z, out);
    gearTeeth (1.00, 18, X, Z, out);
    spokes    (1.00,  8, X, Z, out);
    eyes      (1.00,  8, X, Z, out);
    ring      (0.86, 20, X, Y, out);
    spokes    (0.86,  8, X, Y, out);
    eyes      (0.86,  8, X, Y, out);
    ring      (0.70, 18, Y, Z, out);
    eyes      (0.70,  6, Y, Z, out);
    ring      (0.52, 14, X, diag, out);
    eyes      (0.52,  7, X, diag, out);

    const nr = 0.19;
    const nv: vec3[] = [[nr,0,0],[-nr,0,0],[0,nr,0],[0,-nr,0],[0,0,nr],[0,0,-nr]];
    for (const [a, b] of [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]]) {
      seg(out, nv[a][0], nv[a][1], nv[a][2], nv[b][0], nv[b][1], nv[b][2]);
    }
    return new Float32Array(out);
  }

  buildFaces(): Float32Array {
    const out: number[] = [];
    const X: vec3 = [1,0,0], Y: vec3 = [0,1,0], Z: vec3 = [0,0,1];
    const S = Math.SQRT1_2;
    const diag: vec3 = [0, S, S];

    // Filled annular bands for each ring (width tuned to look substantial)
    ringFaces(1.00, 0.10, 24, X, Z, out);
    ringFaces(0.86, 0.09, 20, X, Y, out);
    ringFaces(0.70, 0.08, 18, Y, Z, out);
    ringFaces(0.52, 0.07, 14, X, diag, out);

    // Central octahedral nucleus, slightly smaller to sit inside edge lines
    octaFaces(0.18, out);

    return new Float32Array(out);
  }
}
