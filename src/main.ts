import { Renderer } from './renderer';
import { Camera } from './camera';
import { Scene } from './scene';
import { Node } from './node';
import { ShardModel } from './models/ShardModel';
import { LatticeModel } from './models/LatticeModel';
import { MandalaMdl } from './models/MandalaMdl';
import type { vec3 } from './math';

type vec4 = [number, number, number, number];

const NODE_COUNT   = 12;
const SCENE_RADIUS = 5.0;

const COLORS: vec4[] = [
  [0.50, 0.85, 1.00, 1.0], // ShardModel   — cool blue
  [0.40, 1.00, 0.55, 1.0], // LatticeModel — green
  [1.00, 0.65, 0.30, 1.0], // MandalaMdl   — warm amber
];

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

  const models = [new ShardModel(), new LatticeModel(), new MandalaMdl()];
  for (const m of models) m.init(renderer.device);

  const positions = fibonacciSphere(NODE_COUNT, SCENE_RADIUS);
  const nodes = positions.map((pos, i) => {
    const node = new Node(models[i % 3], pos, COLORS[i % 3], i * 1.7);
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
    renderer.frame(scene, camera, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch(console.error);
