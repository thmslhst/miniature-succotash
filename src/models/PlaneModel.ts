// Abstract base for all node geometry models.
// Subclasses implement buildEdges() in local space; init() uploads once to GPU.
export abstract class PlaneModel {
  edgeBuffer!: GPUBuffer;
  edgeCount!: number; // number of line segments

  abstract buildEdges(): Float32Array;

  init(device: GPUDevice): void {
    const data = this.buildEdges();
    this.edgeCount = data.length / 6; // 6 floats per segment (2 × vec3)
    this.edgeBuffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(this.edgeBuffer.getMappedRange()).set(data);
    this.edgeBuffer.unmap();
  }
}
