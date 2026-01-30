import RAPIER from '@dimforge/rapier3d-compat';
import { TABLE_GRAVITY, PHYSICS_TIMESTEP } from '../game/constants';

export class PhysicsWorld {
  readonly world: RAPIER.World;
  readonly eventQueue: RAPIER.EventQueue;

  constructor() {
    const gravity = new RAPIER.Vector3(
      TABLE_GRAVITY.x,
      TABLE_GRAVITY.y,
      TABLE_GRAVITY.z,
    );
    this.world = new RAPIER.World(gravity);
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  step() {
    this.world.timestep = PHYSICS_TIMESTEP;
    this.world.step(this.eventQueue);
  }

  dispose() {
    this.world.free();
    this.eventQueue.free();
  }
}
