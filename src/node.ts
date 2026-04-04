import { translationMatrix, type vec3, type mat4 } from './math';
import type { PlaneModel } from './models/PlaneModel';

type vec4 = [number, number, number, number];

// 16 floats (world mat4) + 4 floats (color vec4) = 80 bytes
const UNIFORM_BYTES = 80;

export class Node {
  readonly position: vec3;
  readonly color: vec4;
  readonly model: PlaneModel;

  private device!: GPUDevice;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;

  constructor(model: PlaneModel, position: vec3, color: vec4) {
    this.model    = model;
    this.position = position;
    this.color    = color;
  }

  init(device: GPUDevice, layout: GPUBindGroupLayout): void {
    this.device = device;
    this.uniformBuffer = device.createBuffer({
      size:  UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });
  }

  worldMatrix(): mat4 {
    return translationMatrix(this.position[0], this.position[1], this.position[2]);
  }

  draw(passEncoder: GPURenderPassEncoder): void {
    const data = new Float32Array(20);
    data.set(this.worldMatrix(), 0);
    data.set(this.color, 16);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, data);
    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.setVertexBuffer(0, this.model.edgeBuffer);
    passEncoder.draw(this.model.edgeCount * 2);
  }
}
