import { Renderer } from './renderer';
import { Camera } from './camera';
import { Scene } from './scene';
import { Node } from './node';
import { OphanModel } from './models/OphanModel';
import { OrganicTextureGen } from './OrganicTextureGen';
import type { vec3 } from './math';

type vec4 = [number, number, number, number];

const NODE_COUNT   = 12;
const SCENE_RADIUS = 5.0;

const COLOR: vec4 = [0.06, 0.06, 0.06, 1.0];

function fibonacciSphere(n: number, r: number): vec3[] {
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  return Array.from({ length: n }, (_, i) => {
    const y   = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th  = phi * i;
    return [rad * Math.cos(th) * r, y * r, rad * Math.sin(th) * r] as vec3;
  });
}

async function main(): Promise<void> {
  if (!navigator.gpu) {
    document.body.innerHTML = '<p style="color:#f66;font-family:monospace;padding:2rem">WebGPU not supported in this browser.</p>';
    return;
  }

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const renderer = new Renderer();
  await renderer.init(canvas);

  const model = new OphanModel();
  model.init(renderer.device);
  model.initFaces(renderer.device, renderer.texBindGroupLayout);

  // ── Debug: 2D canvas overlay showing the generated texture ──────────────
  const dbgCanvas = document.createElement('canvas');
  dbgCanvas.width = dbgCanvas.height = 256;
  Object.assign(dbgCanvas.style, {
    position: 'fixed', bottom: '12px', right: '12px',
    width: '180px', height: '180px',
    border: '1px solid rgba(255,255,255,0.3)',
    pointerEvents: 'none',
    fontFamily: 'monospace',
  });
  document.body.appendChild(dbgCanvas);
  const ctx2d = dbgCanvas.getContext('2d')!;
  const pixels = new OrganicTextureGen(0xB4B1A6E).render(256, 'cellular');
  ctx2d.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer), 256, 256), 0, 0);
  ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
  ctx2d.fillRect(0, 0, 256, 20);
  ctx2d.fillStyle = 'rgba(255,255,255,0.85)';
  ctx2d.font = '11px monospace';
  ctx2d.fillText('texture 1/1 · cellular · 256²', 6, 14);
  // ─────────────────────────────────────────────────────────────────────────

  const positions = fibonacciSphere(NODE_COUNT, SCENE_RADIUS);
  const nodes = positions.map((pos, i) => {
    const node = new Node(model, pos, COLOR, i * 1.7);
    node.init(renderer.device, renderer.nodeBindGroupLayout);
    return node;
  });

  const scene  = new Scene(nodes);
  const camera = new Camera(canvas.width / canvas.height);

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.setAspect(canvas.width / canvas.height);
    renderer.resize(canvas.width, canvas.height);
  });

  let prev = performance.now();
  function loop(now: number): void {
    const dt = now - prev;
    prev = now;
    camera.tick(dt);
    scene.tick(dt, now);
    model.tick(renderer.device, now);
    renderer.frame(scene, camera, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch(console.error);
