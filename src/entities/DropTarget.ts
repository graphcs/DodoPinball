import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { DROP_TARGET_WIDTH, DROP_TARGET_HEIGHT, DROP_TARGET_DEPTH } from '../game/constants';
import { Materials } from '../rendering/Materials';

export class DropTarget extends Entity {
  private isDown = false;
  private material: THREE.MeshStandardMaterial;
  private originalY: number;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
  ) {
    const geometry = new THREE.BoxGeometry(
      DROP_TARGET_WIDTH,
      DROP_TARGET_HEIGHT,
      DROP_TARGET_DEPTH,
    );
    const mat = materials.plastic(0xffff00);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, DROP_TARGET_HEIGHT / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, DROP_TARGET_HEIGHT / 2, z);
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      DROP_TARGET_WIDTH / 2,
      DROP_TARGET_HEIGHT / 2,
      DROP_TARGET_DEPTH / 2,
    )
      .setRestitution(0.3)
      .setFriction(0.5)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    super(mesh, body);
    this.material = mat;
    this.originalY = DROP_TARGET_HEIGHT / 2;
  }

  hitTarget() {
    if (this.isDown) return;
    this.isDown = true;
    // Animate down
    this.mesh.position.y = -0.1;
    this.material.opacity = 0.3;
    this.material.transparent = true;

    // Disable collider by moving body underground
    if (this.body) {
      this.body.setTranslation(
        new RAPIER.Vector3(
          this.body.translation().x,
          -5,
          this.body.translation().z,
        ),
        true,
      );
    }
  }

  resetTarget() {
    this.isDown = false;
    this.mesh.position.y = this.originalY;
    this.material.opacity = 1;
    this.material.transparent = false;

    if (this.body) {
      this.body.setTranslation(
        new RAPIER.Vector3(
          this.mesh.position.x,
          this.originalY,
          this.mesh.position.z,
        ),
        true,
      );
    }
  }

  getIsDown(): boolean {
    return this.isDown;
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
