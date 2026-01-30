import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export abstract class Entity {
  mesh: THREE.Object3D;
  body: RAPIER.RigidBody | null;

  constructor(mesh: THREE.Object3D, body: RAPIER.RigidBody | null = null) {
    this.mesh = mesh;
    this.body = body;
  }

  update(_dt: number) {
    if (this.body) {
      const pos = this.body.translation();
      this.mesh.position.set(pos.x, pos.y, pos.z);
      const rot = this.body.rotation();
      this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
  }

  dispose(scene: THREE.Scene, world: RAPIER.World) {
    scene.remove(this.mesh);
    if (this.body) {
      world.removeRigidBody(this.body);
    }
  }
}
