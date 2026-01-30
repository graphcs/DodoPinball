import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { Materials } from '../rendering/Materials';

export class Ramp extends Entity {
  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    height: number = 0.4,
  ) {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    // Ramp surface
    const rampGeo = new THREE.BoxGeometry(0.5, 0.03, length);
    const rampMat = materials.ramp();
    const mesh = new THREE.Mesh(rampGeo, rampMat);

    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    mesh.position.set(midX, height / 2, midZ);
    mesh.rotation.y = angle;

    // Tilt ramp slightly upward
    const tiltAngle = Math.atan2(height, length);
    mesh.rotation.x = -tiltAngle;

    mesh.castShadow = true;
    scene.add(mesh);

    // Side rails
    const railGeo = new THREE.BoxGeometry(0.03, 0.15, length);
    const railMat = materials.rail();

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(midX - 0.25, height / 2 + 0.05, midZ);
    leftRail.rotation.y = angle;
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(midX + 0.25, height / 2 + 0.05, midZ);
    rightRail.rotation.y = angle;
    scene.add(rightRail);

    // Physics: ramp surface as tilted box
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(midX, height / 2, midZ)
      .setRotation(new RAPIER.Quaternion(
        0,
        Math.sin(angle / 2),
        0,
        Math.cos(angle / 2),
      ));
    const body = world.createRigidBody(bodyDesc);

    const surfaceDesc = RAPIER.ColliderDesc.cuboid(0.25, 0.015, length / 2)
      .setRestitution(0.2)
      .setFriction(0.3);
    world.createCollider(surfaceDesc, body);

    // Sensor at top of ramp to detect completion
    const sensorDesc = RAPIER.ColliderDesc.cuboid(0.25, 0.1, 0.15)
      .setTranslation(0, 0.1, -length / 2 + 0.15)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(sensorDesc, body);

    // Side wall colliders
    const wallDesc1 = RAPIER.ColliderDesc.cuboid(0.015, 0.1, length / 2)
      .setTranslation(-0.25, 0.05, 0)
      .setRestitution(0.3);
    world.createCollider(wallDesc1, body);

    const wallDesc2 = RAPIER.ColliderDesc.cuboid(0.015, 0.1, length / 2)
      .setTranslation(0.25, 0.05, 0)
      .setRestitution(0.3);
    world.createCollider(wallDesc2, body);

    super(mesh, body);
  }

  getColliderHandle(): number {
    if (this.body) {
      // Return the sensor collider (index 1, after the surface collider)
      return this.body.collider(1).handle;
    }
    return -1;
  }
}
