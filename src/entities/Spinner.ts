import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { Materials } from '../rendering/Materials';

export class Spinner extends Entity {
  private spinAngle = 0;
  private spinVelocity = 0;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
  ) {
    // Spinning gate visual
    const geometry = new THREE.BoxGeometry(0.5, 0.3, 0.02);
    const mat = materials.rail();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, 0.2, z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Sensor collider to detect ball passage
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, 0.2, z);
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.25, 0.15, 0.05)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    super(mesh, body);
  }

  spin() {
    this.spinVelocity = 15; // rad/s
  }

  update(dt: number) {
    if (this.spinVelocity > 0.1) {
      this.spinAngle += this.spinVelocity * dt;
      this.spinVelocity *= 0.95; // damping
      this.mesh.rotation.z = this.spinAngle;
    }
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
