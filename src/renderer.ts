import wireframeWGSL from './shaders/wireframe.wgsl?raw';
import { mat4Multiply } from './math';
import type { Scene } from './scene';
import type { Camera } from './camera';

export class Renderer {
  device!: GPUDevice;
  nodeBindGroupLayout!: GPUBindGroupLayout;

  private context!: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private sharedUniformBuffer!: GPUBuffer;
  private sharedBindGroup!: GPUBindGroup;
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
    this.initPipeline();
  }

  resize(w: number, h: number): void {
    this.initDepth(w, h);
  }

  private initDepth(w: number, h: number): void {
    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      size:  [w, h],
      format: 'depth24plus',
      usage:  GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private initPipeline(): void {
    const bgl0 = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} }],
    });
    this.nodeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} }],
    });
    const layout = this.device.createPipelineLayout({ bindGroupLayouts: [bgl0, this.nodeBindGroupLayout] });
    const mod    = this.device.createShaderModule({ code: wireframeWGSL });

    this.pipeline = this.device.createRenderPipeline({
      layout,
      vertex: {
        module:     mod,
        entryPoint: 'vs',
        buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
      },
      fragment: { module: mod, entryPoint: 'fs', targets: [{ format: this.canvasFormat }] },
      primitive:    { topology: 'line-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });

    this.sharedUniformBuffer = this.device.createBuffer({
      size:  64, // one mat4x4 = 64 bytes (viewProj)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sharedBindGroup = this.device.createBindGroup({
      layout: bgl0,
      entries: [{ binding: 0, resource: { buffer: this.sharedUniformBuffer } }],
    });
  }

  frame(scene: Scene, camera: Camera, _t: number): void {
    const viewProj = mat4Multiply(camera.projMatrix(), camera.viewMatrix());
    this.device.queue.writeBuffer(this.sharedUniformBuffer, 0, viewProj);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view:       this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
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

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.sharedBindGroup);
    for (const node of scene.nodes) node.draw(pass);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
