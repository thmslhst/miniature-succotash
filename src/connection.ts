import type { Node } from './node';

export const CONNECTION_RADIUS = 8.0;

// 12 line segments per connection → 24 vertices (line-list) × 4 floats (xyz + alpha)
const SEGMENTS = 12;
export const VERTS_PER_CONN  = SEGMENTS * 2;
export const FLOATS_PER_CONN = VERTS_PER_CONN * 4;

export class Connection {
  readonly a: Node;
  readonly b: Node;
  readonly seed: number;

  constructor(a: Node, b: Node) {
    this.a    = a;
    this.b    = b;
    this.seed = a.physics.seed * 3.141 + b.physics.seed * 1.618;
  }

  dist(): number {
    const pa = this.a.physics.pos;
    const pb = this.b.physics.pos;
    const dx = pa[0] - pb[0], dy = pa[1] - pb[1], dz = pa[2] - pb[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  alpha(entropy: number): number {
    const d = this.dist();
    if (d >= CONNECTION_RADIUS) return 0;
    const t = 1 - d / CONNECTION_RADIUS;
    return (1 - entropy) * 0.92 * t * t + entropy * 0.60 * t;
  }

  // Writes FLOATS_PER_CONN floats into buf starting at offset.
  // t = elapsed time in ms.
  writeGeometry(buf: Float32Array, offset: number, entropy: number, t: number): void {
    const pa = this.a.physics.pos;
    const pb = this.b.physics.pos;
    const baseAlpha = this.alpha(entropy);

    const dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2];
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    const ndx = dx/len, ndy = dy/len, ndz = dz/len;

    // Per-connection perpendicular axis for the bending plane (seeded, stable)
    const s = this.seed;
    let ax = Math.sin(s * 3.7), ay = Math.cos(s * 2.1), az = Math.sin(s * 1.4 + 1.0);
    let px = ndy*az - ndz*ay, py = ndz*ax - ndx*az, pz = ndx*ay - ndy*ax;
    let plen = Math.sqrt(px*px + py*py + pz*pz);
    if (plen < 0.01) { // near-parallel fallback
      ax = Math.cos(s * 5.1); ay = Math.sin(s * 0.9 + 2.0); az = Math.cos(s * 3.3);
      px = ndy*az - ndz*ay; py = ndz*ax - ndx*az; pz = ndx*ay - ndy*ax;
      plen = Math.sqrt(px*px + py*py + pz*pz) || 1;
    }
    px /= plen; py /= plen; pz /= plen;

    // Second perpendicular: gives 2-axis bending so curves can spiral slightly
    let qx = ndy*pz - ndz*py, qy = ndz*px - ndx*pz, qz = ndx*py - ndy*px;
    const qlen = Math.sqrt(qx*qx + qy*qy + qz*qz) || 1;
    qx /= qlen; qy /= qlen; qz /= qlen;

    // Animated control points — organic slow drift
    const bendAmp = len * 0.28 * (1 + entropy * 0.7);
    const freq     = 0.0007; // rad/ms — very slow
    const phase1   = t * freq + s;
    const phase2   = t * freq * 1.13 + s * 1.7 + 1.2;

    const o1p = Math.sin(phase1) * bendAmp;
    const o1q = Math.cos(phase1 * 0.8 + s * 2.3) * bendAmp * 0.4;
    const o2p = Math.cos(phase2) * bendAmp;
    const o2q = Math.sin(phase2 * 0.9 + s * 1.1) * bendAmp * 0.4;

    // Cubic Bézier control points
    const p0x = pa[0], p0y = pa[1], p0z = pa[2];
    const p1x = pa[0] + dx*0.33 + px*o1p + qx*o1q;
    const p1y = pa[1] + dy*0.33 + py*o1p + qy*o1q;
    const p1z = pa[2] + dz*0.33 + pz*o1p + qz*o1q;
    const p2x = pa[0] + dx*0.67 + px*o2p + qx*o2q;
    const p2y = pa[1] + dy*0.67 + py*o2p + qy*o2q;
    const p2z = pa[2] + dz*0.67 + pz*o2p + qz*o2q;
    const p3x = pb[0], p3y = pb[1], p3z = pb[2];

    // Neural pulse: two traveling waves (forward + faint reverse) for a living, firing feel
    const pulseSpeed = 0.0025; // rad/ms
    const pulseFreq  = 4.5;

    const computeAlpha = (u: number): number => {
      const w1 = Math.max(0, Math.sin(u * Math.PI * pulseFreq - t * pulseSpeed + s));
      const w2 = Math.max(0, Math.sin(u * Math.PI * pulseFreq * 0.6 + t * pulseSpeed * 0.7 + s * 1.4)) * 0.4;
      return baseAlpha * (0.15 + 0.85 * (w1 * 0.7 + w2));
    };

    // Walk the curve keeping previous sample to form line-list segments
    let prevAlpha = computeAlpha(0);
    let prevX = p0x, prevY = p0y, prevZ = p0z;

    for (let i = 1; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const mu = 1 - u;
      const a = mu*mu*mu, b = 3*mu*mu*u, c = 3*mu*u*u, d = u*u*u;
      const x = a*p0x + b*p1x + c*p2x + d*p3x;
      const y = a*p0y + b*p1y + c*p2y + d*p3y;
      const z = a*p0z + b*p1z + c*p2z + d*p3z;
      const alpha = computeAlpha(u);

      const o = offset + (i - 1) * 8;
      buf[o+0] = prevX;  buf[o+1] = prevY;  buf[o+2] = prevZ;  buf[o+3] = prevAlpha;
      buf[o+4] = x;      buf[o+5] = y;      buf[o+6] = z;      buf[o+7] = alpha;

      prevX = x; prevY = y; prevZ = z; prevAlpha = alpha;
    }
  }
}
