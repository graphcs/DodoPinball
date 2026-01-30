import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import {
  PLUNGER_MAX_PULL,
  PLUNGER_CHARGE_SPEED,
  PLUNGER_LAUNCH_SPEED,
  PLUNGER_WIDTH,
  PLUNGER_HEIGHT,
} from '../game/constants';
import { Materials } from '../rendering/Materials';

export class Plunger extends Entity {
  private charge = 0;
  private isCharging = false;
  private restZ: number;
  private onRelease: ((force: number) => void) | null = null;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
  ) {
    // Plunger visual - a cylinder
    const geometry = new THREE.CylinderGeometry(
      PLUNGER_WIDTH / 2,
      PLUNGER_WIDTH / 2,
      PLUNGER_HEIGHT,
      16,
    );
    const material = materials.rail();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.15, z);
    mesh.castShadow = true;
    scene.add(mesh);

    // Plunger is kinematic - we move it manually
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(x, 0.15, z);
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      PLUNGER_WIDTH / 2,
      PLUNGER_HEIGHT / 2,
      PLUNGER_WIDTH / 2,
    )
      .setRestitution(0.8)
      .setFriction(0.3)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    super(mesh, body);
    this.restZ = z;
  }

  setReleaseCallback(cb: (force: number) => void) {
    this.onRelease = cb;
  }

  startCharge() {
    this.isCharging = true;
    this.charge = 0;
  }

  release() {
    if (!this.isCharging) return;
    this.isCharging = false;
    const power = this.charge / PLUNGER_MAX_PULL; // 0..1
    const speed = power * PLUNGER_LAUNCH_SPEED;
    this.charge = 0;

    if (this.onRelease) {
      this.onRelease(speed);
    }
  }

  update(dt: number) {
    if (this.isCharging) {
      this.charge = Math.min(this.charge + PLUNGER_CHARGE_SPEED * dt, PLUNGER_MAX_PULL);
    }

    // Animate plunger position
    const pullBack = this.isCharging ? this.charge : 0;
    const targetZ = this.restZ + pullBack;

    if (this.body) {
      const pos = this.body.translation();
      this.body.setNextKinematicTranslation(
        new RAPIER.Vector3(pos.x, pos.y, targetZ),
      );
    }

    this.mesh.position.z = targetZ;
  }

  getChargePercent(): number {
    return this.charge / PLUNGER_MAX_PULL;
  }
}
