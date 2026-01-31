import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { SLINGSHOT_IMPULSE } from '../game/constants';
import { Materials } from '../rendering/Materials';

export class Slingshot extends Entity {
  private flashTimer = 0;
  private material: THREE.MeshStandardMaterial;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    vertices: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    isLeft: boolean,
  ) {
    // Create triangular shape
    const shape = new THREE.Shape();
    shape.moveTo(vertices[0].x, vertices[0].z);
    shape.lineTo(vertices[1].x, vertices[1].z);
    shape.lineTo(vertices[2].x, vertices[2].z);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: false,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.1, 0);

    const mat = materials.rubber();
    const mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);

    // Physics: create walls for each edge of the triangle
    const center = new THREE.Vector3(
      (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
      0.1,
      (vertices[0].z + vertices[1].z + vertices[2].z) / 3,
    );

    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(center.x, center.y, center.z);
    const body = world.createRigidBody(bodyDesc);

    // Sensor collider for detection
    const sensorDesc = RAPIER.ColliderDesc.cuboid(0.3, 0.15, 0.15)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(sensorDesc, body);

    // Wall colliders for each edge
    for (let i = 0; i < 3; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % 3];
      const midX = (v1.x + v2.x) / 2 - center.x;
      const midZ = (v1.z + v2.z) / 2 - center.z;
      const dx = v2.x - v1.x;
      const dz = v2.z - v1.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const wallDesc = RAPIER.ColliderDesc.cuboid(len / 2, 0.15, 0.03)
        .setTranslation(midX, 0, midZ)
        .setRotation(new RAPIER.Quaternion(
          0,
          Math.sin(angle / 2),
          0,
          Math.cos(angle / 2),
        ))
        .setRestitution(0.8)
        .setFriction(0.1);
      world.createCollider(wallDesc, body);
    }

    super(mesh, body);
    this.material = mat;
  }

  flash() {
    this.flashTimer = 0.15;
  }

  update(dt: number) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const t = Math.max(0, this.flashTimer / 0.15);
      this.material.emissive = new THREE.Color(0xff4400);
      this.material.emissiveIntensity = t * 2;
    } else {
      this.material.emissiveIntensity = 0;
    }
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle; // The sensor collider
    }
    return -1;
  }
}
