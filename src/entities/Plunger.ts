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
  private meshBaseZ: number = 0;
  private onRelease: ((force: number) => void) | null = null;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
    model?: THREE.Group,
  ) {
    let mesh: THREE.Object3D;

    if (model) {
      // Use the imported FBX model
      const plungerGroup = model.clone();
      plungerGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => {
            if (mat) {
              mat.side = THREE.DoubleSide;
              mat.visible = true;
            }
          });
        }
      });

      // Scale to fit plunger size
      const box = new THREE.Box3().setFromObject(plungerGroup);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = PLUNGER_HEIGHT / (maxDim || 1);
      plungerGroup.scale.setScalar(scale);

      // Recompute after scaling
      const scaledBox = new THREE.Box3().setFromObject(plungerGroup);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);

      plungerGroup.position.set(
        x - scaledCenter.x,
        -scaledBox.min.y,
        z - scaledCenter.z,
      );

      scene.add(plungerGroup);
      mesh = plungerGroup;
    } else {
      // Fallback: a cylinder
      const geometry = new THREE.CylinderGeometry(
        PLUNGER_WIDTH / 2,
        PLUNGER_WIDTH / 2,
        PLUNGER_HEIGHT,
        16,
      );
      const material = materials.rail();
      const fallbackMesh = new THREE.Mesh(geometry, material);
      fallbackMesh.position.set(x, 0, z);
      fallbackMesh.castShadow = true;
      scene.add(fallbackMesh);
      mesh = fallbackMesh;
    }

    // Plunger is kinematic - we move it manually
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(x, 0, z);
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
    this.meshBaseZ = mesh.position.z;
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

    this.mesh.position.z = this.meshBaseZ + pullBack;
  }

  getChargePercent(): number {
    return this.charge / PLUNGER_MAX_PULL;
  }
}
