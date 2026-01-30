import { PHYSICS_TIMESTEP } from './constants';

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private physicsStep: () => void,
    private render: (alpha: number) => void,
  ) {}

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (now: number) => {
    if (!this.running) return;

    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp to prevent spiral of death
    if (dt > 0.1) dt = 0.1;

    this.accumulator += dt;

    while (this.accumulator >= PHYSICS_TIMESTEP) {
      this.physicsStep();
      this.accumulator -= PHYSICS_TIMESTEP;
    }

    const alpha = this.accumulator / PHYSICS_TIMESTEP;
    this.render(alpha);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
