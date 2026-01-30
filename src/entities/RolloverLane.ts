import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { Materials } from '../rendering/Materials';

export class RolloverLane extends Entity {
  private isActive = false;
  private material: THREE.MeshStandardMaterial;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
  ) {
    // Arrow/lane indicator on the playfield
    const shape = new THREE.Shape();
    shape.moveTo(-0.08, -0.2);
    shape.lineTo(0.08, -0.2);
    shape.lineTo(0.08, 0.1);
    shape.lineTo(0.15, 0.1);
    shape.lineTo(0, 0.25);
    shape.lineTo(-0.15, 0.1);
    shape.lineTo(-0.08, 0.1);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.01,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);

    const mat = materials.emissive(0x00ff88, 0);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, 0.01, z);
    scene.add(mesh);

    // Sensor
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, 0.1, z);
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.2)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    super(mesh, body);
    this.material = mat;
  }

  activate() {
    this.isActive = true;
    this.material.emissiveIntensity = 2;
  }

  deactivate() {
    this.isActive = false;
    this.material.emissiveIntensity = 0;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
