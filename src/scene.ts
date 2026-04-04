import type { Node } from './node';

export class Scene {
  readonly nodes: Node[];

  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }

  // Phase 2: physics + entropy tick
  tick(_dt: number, _t: number): void {}
}
