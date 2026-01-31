import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { BALL_RADIUS, BALL_MASS, BALL_RESTITUTION, BALL_FRICTION, BALL_LINEAR_DAMPING, BALL_ANGULAR_DAMPING } from '../game/constants';
import { createBallBody } from '../physics/PhysicsBody';
import { Materials } from '../rendering/Materials';

export class Ball extends Entity {
  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    position: { x: number; y: number; z: number },
  ) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3a8a9a,
      metalness: 0.6,
      roughness: 0.25,
      envMapIntensity: 1.0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = createBallBody(world, BALL_RADIUS, {
      position,
      mass: BALL_MASS,
      restitution: BALL_RESTITUTION,
      friction: BALL_FRICTION,
      linearDamping: BALL_LINEAR_DAMPING,
      angularDamping: BALL_ANGULAR_DAMPING,
      ccdEnabled: true,
    });

    super(mesh, body);
  }

  reset(position: { x: number; y: number; z: number }) {
    if (this.body) {
      this.body.setTranslation(
        new RAPIER.Vector3(position.x, position.y, position.z),
        true,
      );
      this.body.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
      this.body.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
    }
  }

  getSpeed(): number {
    if (!this.body) return 0;
    const v = this.body.linvel();
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  applyImpulse(impulse: { x: number; y: number; z: number }) {
    if (this.body) {
      this.body.applyImpulse(new RAPIER.Vector3(impulse.x, impulse.y, impulse.z), true);
    }
  }

  getColliderHandle(): number {
    if (this.body) {
      // Get the first collider attached to this body
      const collider = this.body.collider(0);
      return collider.handle;
    }
    return -1;
  }
}
