import { PlaneModel } from './PlaneModel';
import { OrganicTextureGen, type OrgVariant } from '../OrganicTextureGen';
import type { vec3 } from '../math';
import {
  rotateBasis, rotVecY, rotVecX,
  seg, ring, spokes, gearTeeth, eyes,
  ringFaces, spokeFaces, gearToothFaces, eyeFaces, octaFaces,
} from './OphanGeom';

// OphanModel — Ophanim: the wheel-angels of Ezekiel 1 & 10.
// Four concentric gyroscopic rings counter-rotate like a complex clock.
// The central octahedral nucleus tumbles on its own axis.

const RING_SPEEDS = [0.00040, -0.00025, 0.00015, -0.00010] as const;
const NUCLEUS_SPEED = 0.000070;
const NUCLEUS_R = 0.19;
const NUCLEUS_EDGES = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]] as const;

export class OphanModel extends PlaneModel {
  private scratchEdges: Float32Array | null = null;
  private scratchFaces: Float32Array | null = null;

  protected faceTextureVariant(): OrgVariant { return 'cellular'; }
  protected faceTextureSeed():    number      { return 0xB4B1A6E; }

  override init(device: GPUDevice): void {
    const data = this.buildEdges();
    this.edgeCount = data.length / 6;
    this.scratchEdges = new Float32Array(data.length);
    this.edgeBuffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.edgeBuffer.getMappedRange()).set(data);
    this.edgeBuffer.unmap();
  }

  override initFaces(device: GPUDevice, bgl: GPUBindGroupLayout): void {
    const faces = this.buildFaces();
    if (!faces || faces.length === 0) return;
    this.faceCount = faces.length / 15;
    this.scratchFaces = new Float32Array(faces.length);
    this.faceBuffer = device.createBuffer({
      size: faces.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.faceBuffer.getMappedRange()).set(faces);
    this.faceBuffer.unmap();
    const tex     = OrganicTextureGen.generate(device, 256, this.faceTextureSeed(), this.faceTextureVariant());
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat' });
    this.faceBindGroup = device.createBindGroup({
      layout: bgl,
      entries: [{ binding: 0, resource: sampler }, { binding: 1, resource: tex.createView() }],
    });
  }

  // Called once per frame (once per model instance, not per node).
  tick(device: GPUDevice, t: number): void {
    if (this.scratchEdges) {
      const tmp: number[] = [];
      this.fillEdges(t, tmp);
      for (let i = 0; i < tmp.length; i++) this.scratchEdges[i] = tmp[i];
      device.queue.writeBuffer(this.edgeBuffer, 0, this.scratchEdges);
    }
    if (this.scratchFaces && this.faceBuffer) {
      const tmp: number[] = [];
      this.fillFaces(t, tmp);
      for (let i = 0; i < tmp.length; i++) this.scratchFaces[i] = tmp[i];
      device.queue.writeBuffer(this.faceBuffer, 0, this.scratchFaces);
    }
  }

  // ── Internal geometry ──────────────────────────────────────────────────────

  private ringBases(t: number): [[vec3,vec3],[vec3,vec3],[vec3,vec3],[vec3,vec3]] {
    const X: vec3 = [1,0,0], Y: vec3 = [0,1,0], Z: vec3 = [0,0,1];
    const S = Math.SQRT1_2, D: vec3 = [0, S, S];
    return [
      rotateBasis(X, Z, t * RING_SPEEDS[0]),
      rotateBasis(X, Y, t * RING_SPEEDS[1]),
      rotateBasis(Y, Z, t * RING_SPEEDS[2]),
      rotateBasis(X, D, t * RING_SPEEDS[3]),
    ];
  }

  private nucleusVerts(t: number): vec3[] {
    const θ = t * NUCLEUS_SPEED, r = NUCLEUS_R;
    const base: vec3[] = [[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]];
    return base.map(v => rotVecY(rotVecX(v, θ * 0.4), θ));
  }

  buildEdges(): Float32Array {
    const tmp: number[] = [];
    this.fillEdges(0, tmp);
    return new Float32Array(tmp);
  }

  private fillEdges(t: number, out: number[]): void {
    const [[ua0,ub0],[ua1,ub1],[ua2,ub2],[ua3,ub3]] = this.ringBases(t);
    ring(1.00, 24, ua0, ub0, out); gearTeeth(1.00, 18, ua0, ub0, out);
    spokes(1.00, 8, ua0, ub0, out); eyes(1.00, 8, ua0, ub0, out);
    ring(0.86, 20, ua1, ub1, out); spokes(0.86, 8, ua1, ub1, out); eyes(0.86, 8, ua1, ub1, out);
    ring(0.70, 18, ua2, ub2, out); eyes(0.70, 6, ua2, ub2, out);
    ring(0.52, 14, ua3, ub3, out); eyes(0.52, 7, ua3, ub3, out);
    const nv = this.nucleusVerts(t);
    for (const [a, b] of NUCLEUS_EDGES) seg(out, nv[a][0], nv[a][1], nv[a][2], nv[b][0], nv[b][1], nv[b][2]);
  }

  buildFaces(): Float32Array {
    const tmp: number[] = [];
    this.fillFaces(0, tmp);
    return new Float32Array(tmp);
  }

  private fillFaces(t: number, out: number[]): void {
    const [[ua0,ub0],[ua1,ub1],[ua2,ub2],[ua3,ub3]] = this.ringBases(t);
    ringFaces(1.00, 0.10, 24, ua0, ub0, out);
    ringFaces(0.86, 0.09, 20, ua1, ub1, out);
    ringFaces(0.70, 0.08, 18, ua2, ub2, out);
    ringFaces(0.52, 0.07, 14, ua3, ub3, out);
    gearToothFaces(1.00, 18, ua0, ub0, out);
    spokeFaces(1.00, 8, ua0, ub0, 0.06, out);
    spokeFaces(0.86, 8, ua1, ub1, 0.05, out);
    eyeFaces(1.00, 8, ua0, ub0, out);
    eyeFaces(0.86, 8, ua1, ub1, out);
    eyeFaces(0.70, 6, ua2, ub2, out);
    eyeFaces(0.52, 7, ua3, ub3, out);
    octaFaces(this.nucleusVerts(t), NUCLEUS_R, out);
  }
}
