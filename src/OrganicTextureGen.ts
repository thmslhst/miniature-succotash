// OrganicTextureGen — CPU-side procedural organic textures → GPUTexture
// Three variants: cellular (voronoi cell walls), veins (domain-warped fbm),
// membrane (voronoi-modulated fbm, biological tissue).

export type OrgVariant = 'cellular' | 'veins' | 'membrane';

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function smooth(t: number): number { return t * t * t * (t * (6 * t - 15) + 10); }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

export class OrganicTextureGen {
  private perm: Uint8Array;

  constructor(seed: number) {
    let s = (seed ^ 0xDEADBEEF) >>> 0;
    const rand = (): number => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {       // Fisher-Yates shuffle
      const j = Math.floor(rand() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private h(ix: number, iy: number): number {
    return this.perm[(this.perm[((ix % 256) + 256) % 256] ^ ((iy % 256 + 256) % 256)) & 255] / 255;
  }

  private valueNoise(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const ux = smooth(xf), uy = smooth(yf);
    return lerp(
      lerp(this.h(xi, yi),     this.h(xi + 1, yi),     ux),
      lerp(this.h(xi, yi + 1), this.h(xi + 1, yi + 1), ux),
      uy,
    );
  }

  private fbm(x: number, y: number, oct: number): number {
    let v = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      v += this.valueNoise(x * f, y * f) * a;
      n += a; a *= 0.5; f *= 2.1;
    }
    return v / n;
  }

  private voronoi(x: number, y: number): [number, number] {
    const xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const cx = xi + dx, cy = yi + dy;
        const fx = cx + this.h(((cx % 256) + 256) % 256, ((cy % 256) + 256) % 256);
        const fy = cy + this.h(((cy + 113) % 256 + 256) % 256, ((cx % 256) + 256) % 256);
        const d = Math.sqrt((x - fx) ** 2 + (y - fy) ** 2);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
      }
    }
    return [d1, d2];
  }

  private samplePixel(u: number, v: number, variant: OrgVariant): [number, number, number] {
    const sc = 5.0;

    if (variant === 'cellular') {
      const [d1, d2] = this.voronoi(u * sc, v * sc);
      // Bright narrow cell walls on dark interior
      const edge = clamp01(1 - (d2 - d1) * 9);
      const glow = clamp01(1 - d1 * 2.8) * 0.18;
      const t = clamp01(Math.pow(edge, 2.2) * 0.9 + glow);
      return [
        Math.floor(lerp(3,  120, Math.pow(t, 1.3))),
        Math.floor(lerp(5,  235, Math.pow(t, 0.75))),
        Math.floor(lerp(18, 205, Math.pow(t, 0.85))),
      ];
    }

    if (variant === 'veins') {
      // Domain-warped FBM: fibrous, stretched vein channels
      const wx = this.fbm(u * sc + 0.3, v * sc + 0.7, 4) * 2.2;
      const wy = this.fbm(u * sc + 5.1, v * sc + 1.9, 4) * 2.2;
      const f  = this.fbm(u * sc + wx, v * sc + wy, 7);
      const t  = clamp01(Math.pow(f, 0.65));
      return [
        Math.floor(lerp(5,  245, Math.pow(t, 1.7))),
        Math.floor(lerp(2,  145, Math.pow(t, 2.3))),
        Math.floor(lerp(1,  25,  Math.pow(t, 3.1))),
      ];
    }

    // membrane: voronoi distorts fbm → biological tissue / ectoplasm
    const [d1] = this.voronoi(u * sc * 1.5, v * sc * 1.5);
    const warp = d1 * 1.4;
    const f = this.fbm(u * sc + warp, v * sc + warp * 0.55, 7);
    const t = clamp01(f * (1 - d1 * 0.65) + d1 * 0.08);
    return [
      Math.floor(lerp(2,  55,  Math.pow(t, 1.6))),
      Math.floor(lerp(7,  215, Math.pow(t, 0.72))),
      Math.floor(lerp(18, 250, Math.pow(t, 0.60))),
    ];
  }

  render(size: number, variant: OrgVariant): Uint8Array<ArrayBuffer> {
    const data = new Uint8Array(new ArrayBuffer(size * size * 4));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [r, g, b] = this.samplePixel(x / size, y / size, variant);
        const i = (y * size + x) * 4;
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
    return data;
  }

  static generate(
    device: GPUDevice, size: number, seed: number, variant: OrgVariant = 'membrane',
  ): GPUTexture {
    const pixels = new OrganicTextureGen(seed).render(size, variant);
    const tex = device.createTexture({
      size: [size, size], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: tex }, pixels, { bytesPerRow: size * 4 }, [size, size],
    );
    return tex;
  }
}
