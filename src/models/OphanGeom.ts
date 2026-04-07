// Pure geometry helpers for OphanModel — no GPU, no classes.
import type { vec3 } from '../math';

export const TAU = Math.PI * 2;

// ── Rotation helpers ─────────────────────────────────────────────────────────

// Rotate the 2D basis (ua, ub) within the plane by θ radians.
// Result: ua' = cos θ·ua + sin θ·ub,  ub' = −sin θ·ua + cos θ·ub
export function rotateBasis(ua: vec3, ub: vec3, θ: number): [vec3, vec3] {
  const c = Math.cos(θ), s = Math.sin(θ);
  return [
    [ua[0]*c + ub[0]*s, ua[1]*c + ub[1]*s, ua[2]*c + ub[2]*s],
    [-ua[0]*s + ub[0]*c, -ua[1]*s + ub[1]*c, -ua[2]*s + ub[2]*c],
  ];
}
export function rotVecY(v: vec3, θ: number): vec3 {
  const c = Math.cos(θ), s = Math.sin(θ);
  return [v[0]*c + v[2]*s, v[1], -v[0]*s + v[2]*c];
}
export function rotVecX(v: vec3, θ: number): vec3 {
  const c = Math.cos(θ), s = Math.sin(θ);
  return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c];
}

// ── Edge geometry helpers ────────────────────────────────────────────────────

export function seg(out: number[], ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
  out.push(ax, ay, az, bx, by, bz);
}
export function ring(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
    seg(out, (ua[0]*c0+ub[0]*s0)*r, (ua[1]*c0+ub[1]*s0)*r, (ua[2]*c0+ub[2]*s0)*r,
             (ua[0]*c1+ub[0]*s1)*r, (ua[1]*c1+ub[1]*s1)*r, (ua[2]*c1+ub[2]*s1)*r);
  }
}
export function spokes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    seg(out, 0, 0, 0, (ua[0]*c+ub[0]*s)*r, (ua[1]*c+ub[1]*s)*r, (ua[2]*c+ub[2]*s)*r);
  }
}
export function gearTeeth(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const tipR = r + 0.13, hw = 0.045;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const tip: vec3 = [(ua[0]*Math.cos(a)+ub[0]*Math.sin(a))*tipR, (ua[1]*Math.cos(a)+ub[1]*Math.sin(a))*tipR, (ua[2]*Math.cos(a)+ub[2]*Math.sin(a))*tipR];
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
export function eyes(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    const p: vec3  = [(ua[0]*c+ub[0]*s)*r, (ua[1]*c+ub[1]*s)*r, (ua[2]*c+ub[2]*s)*r];
    const ta: vec3 = [-ua[0]*s+ub[0]*c, -ua[1]*s+ub[1]*c, -ua[2]*s+ub[2]*c];
    const tb: vec3 = [ ua[0]*c+ub[0]*s,  ua[1]*c+ub[1]*s,  ua[2]*c+ub[2]*s];
    diamond(p, ta, tb, 0.072, out);
  }
}

// ── Face geometry helpers ────────────────────────────────────────────────────

function vtx(out: number[], x: number, y: number, z: number, u: number, v: number): void {
  out.push(x, y, z, u, v);
}
export function ringFaces(r: number, w: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
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
export function spokeFaces(r: number, n: number, ua: vec3, ub: vec3, w: number, out: number[]): void {
  const hw = w * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    const dx = ua[0]*c+ub[0]*s, dy = ua[1]*c+ub[1]*s, dz = ua[2]*c+ub[2]*s;
    const px = -ua[0]*s+ub[0]*c, py = -ua[1]*s+ub[1]*c, pz = -ua[2]*s+ub[2]*c;
    vtx(out,  px*hw,       py*hw,       pz*hw,       0, 0); vtx(out, dx*r+px*hw, dy*r+py*hw, dz*r+pz*hw, 1, 0);
    vtx(out, -px*hw,      -py*hw,      -pz*hw,       0, 1); vtx(out, dx*r+px*hw, dy*r+py*hw, dz*r+pz*hw, 1, 0);
    vtx(out,  dx*r-px*hw,  dy*r-py*hw,  dz*r-pz*hw,  1, 1); vtx(out, -px*hw, -py*hw, -pz*hw, 0, 1);
  }
}
export function gearToothFaces(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const tipR = r + 0.13, hw = 0.045;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const tip = [(ua[0]*Math.cos(a)+ub[0]*Math.sin(a))*tipR, (ua[1]*Math.cos(a)+ub[1]*Math.sin(a))*tipR, (ua[2]*Math.cos(a)+ub[2]*Math.sin(a))*tipR];
    const bL  = [(ua[0]*Math.cos(a-hw)+ub[0]*Math.sin(a-hw))*r,   (ua[1]*Math.cos(a-hw)+ub[1]*Math.sin(a-hw))*r,   (ua[2]*Math.cos(a-hw)+ub[2]*Math.sin(a-hw))*r];
    const bR  = [(ua[0]*Math.cos(a+hw)+ub[0]*Math.sin(a+hw))*r,   (ua[1]*Math.cos(a+hw)+ub[1]*Math.sin(a+hw))*r,   (ua[2]*Math.cos(a+hw)+ub[2]*Math.sin(a+hw))*r];
    vtx(out, bL[0],bL[1],bL[2], 0,0); vtx(out, tip[0],tip[1],tip[2], 0.5,1); vtx(out, bR[0],bR[1],bR[2], 1,0);
  }
}
export function eyeFaces(r: number, n: number, ua: vec3, ub: vec3, out: number[]): void {
  const sz = 0.072;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    const p: vec3  = [(ua[0]*c+ub[0]*s)*r, (ua[1]*c+ub[1]*s)*r, (ua[2]*c+ub[2]*s)*r];
    const ta: vec3 = [-ua[0]*s+ub[0]*c, -ua[1]*s+ub[1]*c, -ua[2]*s+ub[2]*c];
    const tb: vec3 = [ ua[0]*c+ub[0]*s,  ua[1]*c+ub[1]*s,  ua[2]*c+ub[2]*s];
    const T = [p[0]+ta[0]*sz, p[1]+ta[1]*sz, p[2]+ta[2]*sz];
    const R = [p[0]+tb[0]*sz, p[1]+tb[1]*sz, p[2]+tb[2]*sz];
    const B = [p[0]-ta[0]*sz, p[1]-ta[1]*sz, p[2]-ta[2]*sz];
    const L = [p[0]-tb[0]*sz, p[1]-tb[1]*sz, p[2]-tb[2]*sz];
    vtx(out, T[0],T[1],T[2], 0.5,1); vtx(out, R[0],R[1],R[2], 1,0.5); vtx(out, B[0],B[1],B[2], 0.5,0);
    vtx(out, T[0],T[1],T[2], 0.5,1); vtx(out, B[0],B[1],B[2], 0.5,0); vtx(out, L[0],L[1],L[2], 0,0.5);
  }
}
export function octaFaces(verts: vec3[], r: number, out: number[]): void {
  const faces = [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,2,5],[1,5,3],[1,3,4]];
  for (const [ai, bi, ci] of faces) {
    for (const vi of [ai, bi, ci]) {
      const p = verts[vi];
      const u = 0.5 + Math.atan2(p[2], p[0]) / TAU;
      const fv = 0.5 + Math.asin(Math.max(-1, Math.min(1, p[1] / r))) / Math.PI;
      vtx(out, p[0], p[1], p[2], u, fv);
    }
  }
}
