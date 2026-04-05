import wireframeWGSL  from './shaders/wireframe.wgsl?raw';
import connectionWGSL from './shaders/connection.wgsl?raw';
import { mat4Multiply } from './math';
import type { Scene }  from './scene';
import type { Camera } from './camera';

// 12 nodes → max 66 connections (12*11/2); each = 2 vertices × 4 floats
const MAX_CONNECTIONS = 66;

export class Renderer {
  device!: GPUDevice;
  nodeBindGroupLayout!: GPUBindGroupLayout;

  private context!: GPUCanvasContext;
  private wirePipeline!: GPURenderPipeline;
  private connPipeline!: GPURenderPipeline;
  private sharedUniformBuffer!: GPUBuffer;
  private sharedBindGroup!: GPUBindGroup;
  private connVertexBuffer!: GPUBuffer;
  private connScratch = new Float32Array(MAX_CONNECTIONS * 8);
  private depthTexture!: GPUTexture;
  private canvasFormat!: GPUTextureFormat;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No GPU adapter found');
    this.device = await adapter.requestDevice();

    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.canvasFormat, alphaMode: 'opaque' });

    this.initDepth(canvas.width, canvas.height);
    this.initPipelines();
  }

  resize(w: number, h: number): void {
    this.initDepth(w, h);
  }

  private initDepth(w: number, h: number): void {
    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      size:   [w, h],
      format: 'depth24plus',
      usage:  GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private initPipelines(): void {
    const bgl0 = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} }],
    });
    this.nodeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} }],
    });

    // Wireframe pipeline (nodes)
    const wireMod = this.device.createShaderModule({ code: wireframeWGSL });
    this.wirePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0, this.nodeBindGroupLayout] }),
      vertex: {
        module: wireMod, entryPoint: 'vs',
        buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
      },
      fragment: { module: wireMod, entryPoint: 'fs', targets: [{ format: this.canvasFormat }] },
      primitive:    { topology: 'line-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });

    // Connection pipeline — per-vertex alpha, no depth write (draw through)
    const connMod = this.device.createShaderModule({ code: connectionWGSL });
    this.connPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
      vertex: {
        module: connMod, entryPoint: 'vs',
        buffers: [{
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0,  format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32'   },
          ],
        }],
      },
      fragment: {
        module: connMod, entryPoint: 'fs',
        targets: [{
          format: this.canvasFormat,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one',       dstFactor: 'zero',                operation: 'add' },
          },
        }],
      },
      primitive:    { topology: 'line-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    });

    // Shared view/proj uniform
    this.sharedUniformBuffer = this.device.createBuffer({
      size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sharedBindGroup = this.device.createBindGroup({
      layout: bgl0,
      entries: [{ binding: 0, resource: { buffer: this.sharedUniformBuffer } }],
    });

    // Dynamic connection vertex buffer
    this.connVertexBuffer = this.device.createBuffer({
      size:  MAX_CONNECTIONS * 8 * 4, // floats × 4 bytes
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  frame(scene: Scene, camera: Camera, _t: number): void {
    const viewProj = mat4Multiply(camera.projMatrix(), camera.viewMatrix());
    this.device.queue.writeBuffer(this.sharedUniformBuffer, 0, viewProj);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view:       this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.14, g: 0.14, b: 0.14, a: 1 },
        loadOp:     'clear',
        storeOp:    'store',
      }],
      depthStencilAttachment: {
        view:            this.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp:     'clear',
        depthStoreOp:    'store',
      },
    });

    // Draw connections first (no depth write, always-through)
    const connCount = scene.buildConnGeometry(this.connScratch);
    if (connCount > 0) {
      this.device.queue.writeBuffer(this.connVertexBuffer, 0, this.connScratch.subarray(0, connCount * 8));
      pass.setPipeline(this.connPipeline);
      pass.setBindGroup(0, this.sharedBindGroup);
      pass.setVertexBuffer(0, this.connVertexBuffer);
      pass.draw(connCount * 2);
    }

    // Draw node wireframes
    pass.setPipeline(this.wirePipeline);
    pass.setBindGroup(0, this.sharedBindGroup);
    for (const node of scene.nodes) node.draw(pass);

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
