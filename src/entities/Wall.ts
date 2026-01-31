import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { WALL_HEIGHT } from '../game/constants';

export class Wall extends Entity {
  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    material: THREE.Material,
    position: { x: number; y: number; z: number },
    halfExtents: { x: number; y: number; z: number },
    rotation?: number,
    isSensor?: boolean,
    visible: boolean = true,
  ) {
    const geometry = new THREE.BoxGeometry(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2,
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    if (rotation) mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = visible;
    scene.add(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    if (rotation) {
      bodyDesc.setRotation(new RAPIER.Quaternion(
        0,
        Math.sin(rotation / 2),
        0,
        Math.cos(rotation / 2),
      ));
    }

    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    )
      .setRestitution(0.7)
      .setFriction(0.3)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    if (isSensor) {
      colliderDesc.setSensor(true);
    }

    world.createCollider(colliderDesc, body);

    super(mesh, body);
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
