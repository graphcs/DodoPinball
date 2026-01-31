import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_REST_ANGLE,
  FLIPPER_MAX_ANGLE,
  FLIPPER_SPEED,
  FLIPPER_Y,
} from '../game/constants';
import { Materials } from '../rendering/Materials';

export class Flipper extends Entity {
  private isLeft: boolean;
  private currentAngle: number;
  private targetAngle: number;
  private pivotX: number;
  private pivotZ: number;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    pivotX: number,
    pivotZ: number,
    isLeft: boolean,
    model?: THREE.Group,
  ) {
    let mesh: THREE.Object3D;

    if (model) {
      // Use the imported FBX model
      const clone = model.clone();

      // Compute bounding box to determine model's native size
      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Use uniform scale based on flipper length to preserve aspect ratio
      // Mirror the right flipper on the X axis so the two face each other
      const uniformScale = FLIPPER_LENGTH / (size.x || 1);
      clone.scale.set(
        uniformScale * (isLeft ? 1 : -1),
        uniformScale,
        uniformScale,
      );

      // Recompute bounding box after scaling
      const scaledBox = new THREE.Box3().setFromObject(clone);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);

      // Position so the pivot end is at the origin:
      // - Left flipper: min.x at origin, extends in +X
      // - Right flipper: max.x at origin, extends in -X (mirrored)
      if (isLeft) {
        clone.position.x = -scaledBox.min.x;
      } else {
        clone.position.x = -scaledBox.max.x;
      }
      // Center vertically
      clone.position.y = -scaledCenter.y + FLIPPER_HEIGHT / 2;
      // Center along Z
      clone.position.z = -scaledCenter.z;

      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
        }
      });

      // Wrap in a group so the pivot is at group origin
      const group = new THREE.Group();
      group.add(clone);
      group.position.set(pivotX, FLIPPER_Y, pivotZ);
      scene.add(group);
      mesh = group;
    } else {
      // Fallback: create flipper mesh - tapered shape
      const dir = isLeft ? 1 : -1;
      const shape = new THREE.Shape();
      const hw = FLIPPER_WIDTH / 2;
      const tipW = FLIPPER_WIDTH / 4;

      shape.moveTo(0, -hw);
      shape.lineTo(dir * FLIPPER_LENGTH, -tipW);
      shape.lineTo(dir * FLIPPER_LENGTH, tipW);
      shape.lineTo(0, hw);
      shape.closePath();

      const extrudeSettings = {
        depth: FLIPPER_HEIGHT,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, FLIPPER_HEIGHT / 2, 0);

      const material = materials.plastic(0xff2200);
      const meshObj = new THREE.Mesh(geometry, material);
      meshObj.castShadow = true;
      meshObj.position.set(pivotX, FLIPPER_Y, pivotZ);
      scene.add(meshObj);
      mesh = meshObj;
    }

    // Create kinematic body
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(pivotX, FLIPPER_Y, pivotZ);
    const body = world.createRigidBody(bodyDesc);

    // Collider: approximate as box, offset so pivot is at the end
    const dir = isLeft ? 1 : -1;
    const hx = FLIPPER_LENGTH / 2;
    const hy = FLIPPER_HEIGHT / 2;
    const hz = FLIPPER_WIDTH / 2;
    const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(dir * hx, 0, 0) // Left: +X offset, Right: -X offset
      .setRestitution(isLeft ? 0.08 : 0.2)
      .setFriction(0.5)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(colliderDesc, body);

    super(mesh, body);

    this.isLeft = isLeft;
    this.pivotX = pivotX;
    this.pivotZ = pivotZ;

    // For left flipper, rest is negative angle; for right, positive (mirrored)
    if (isLeft) {
      this.currentAngle = FLIPPER_REST_ANGLE;
      this.targetAngle = FLIPPER_REST_ANGLE;
    } else {
      this.currentAngle = -FLIPPER_REST_ANGLE;
      this.targetAngle = -FLIPPER_REST_ANGLE;
    }

    this.applyRotation();
  }

  setActive(active: boolean) {
    if (this.isLeft) {
      this.targetAngle = active ? FLIPPER_MAX_ANGLE : FLIPPER_REST_ANGLE;
    } else {
      this.targetAngle = active ? -FLIPPER_MAX_ANGLE : -FLIPPER_REST_ANGLE;
    }
  }

  update(dt: number) {
    // Move current angle toward target
    const diff = this.targetAngle - this.currentAngle;
    if (Math.abs(diff) > 0.001) {
      const step = Math.sign(diff) * FLIPPER_SPEED * dt;
      if (Math.abs(step) > Math.abs(diff)) {
        this.currentAngle = this.targetAngle;
      } else {
        this.currentAngle += step;
      }
    }

    this.applyRotation();
  }

  private applyRotation() {
    if (!this.body) return;

    // Create quaternion for Y-axis rotation
    const quat = new THREE.Quaternion();
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.currentAngle);

    this.body.setNextKinematicRotation(
      new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w),
    );

    // Sync mesh
    this.mesh.rotation.y = this.currentAngle;
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
