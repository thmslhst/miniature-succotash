import type { Node } from './node';

export const CONNECTION_RADIUS = 4.5;

export class Connection {
  readonly a: Node;
  readonly b: Node;

  constructor(a: Node, b: Node) {
    this.a = a;
    this.b = b;
  }

  dist(): number {
    const pa = this.a.physics.pos;
    const pb = this.b.physics.pos;
    const dx = pa[0] - pb[0];
    const dy = pa[1] - pb[1];
    const dz = pa[2] - pb[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  alpha(entropy: number): number {
    const d = this.dist();
    if (d >= CONNECTION_RADIUS) return 0;
    const t = 1 - d / CONNECTION_RADIUS;
    // Low entropy: soft quadratic falloff; high entropy: washed-out linear
    return (1 - entropy) * 0.4 * t * t + entropy * 0.15 * t;
  }

  // Writes 8 floats into buf at offset: [x0,y0,z0,alpha, x1,y1,z1,alpha]
  writeGeometry(buf: Float32Array, offset: number, entropy: number): void {
    const pa = this.a.physics.pos;
    const pb = this.b.physics.pos;
    const a  = this.alpha(entropy);
    buf[offset]     = pa[0]; buf[offset + 1] = pa[1]; buf[offset + 2] = pa[2]; buf[offset + 3] = a;
    buf[offset + 4] = pb[0]; buf[offset + 5] = pb[1]; buf[offset + 6] = pb[2]; buf[offset + 7] = a;
  }
}
