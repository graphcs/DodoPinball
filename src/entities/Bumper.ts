import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from './Entity';
import { BUMPER_RADIUS, BUMPER_HEIGHT } from '../game/constants';
import { createCylinderBody } from '../physics/PhysicsBody';
import { Materials } from '../rendering/Materials';

export class Bumper extends Entity {
  private light: THREE.PointLight | null = null;
  private flashTimer = 0;
  private ringMesh: THREE.Mesh;
  private capMesh: THREE.Mesh;
  private baseMaterial: THREE.MeshStandardMaterial;
  private emissiveMaterial: THREE.MeshStandardMaterial;

  constructor(
    world: RAPIER.World,
    scene: THREE.Scene,
    materials: Materials,
    x: number,
    z: number,
    color: number = 0xff4400,
  ) {
    // Bumper ring
    const ringGeo = new THREE.CylinderGeometry(
      BUMPER_RADIUS,
      BUMPER_RADIUS,
      BUMPER_HEIGHT,
      24,
    );
    const baseMat = materials.plastic(color);
    const ringMesh = new THREE.Mesh(ringGeo, baseMat);
    ringMesh.position.set(x, BUMPER_HEIGHT / 2, z);
    ringMesh.castShadow = true;
    scene.add(ringMesh);

    // Cap on top
    const capGeo = new THREE.CylinderGeometry(
      BUMPER_RADIUS * 0.8,
      BUMPER_RADIUS * 0.8,
      0.05,
      24,
    );
    const emissiveMat = materials.emissive(color, 0);
    const capMesh = new THREE.Mesh(capGeo, emissiveMat);
    capMesh.position.set(x, BUMPER_HEIGHT + 0.025, z);
    scene.add(capMesh);

    // Physics body
    const body = createCylinderBody(world, BUMPER_RADIUS, BUMPER_HEIGHT / 2, {
      position: { x, y: BUMPER_HEIGHT / 2, z },
      restitution: 1.2,
      friction: 0.1,
    });

    // Create a group to hold both meshes
    const group = new THREE.Group();
    scene.remove(ringMesh);
    scene.remove(capMesh);
    group.add(ringMesh);
    group.add(capMesh);
    ringMesh.position.set(0, BUMPER_HEIGHT / 2, 0);
    capMesh.position.set(0, BUMPER_HEIGHT + 0.025, 0);
    group.position.set(x, 0, z);
    scene.add(group);

    super(group, body);

    this.ringMesh = ringMesh;
    this.capMesh = capMesh;
    this.baseMaterial = baseMat;
    this.emissiveMaterial = emissiveMat;
  }

  setLight(light: THREE.PointLight) {
    this.light = light;
  }

  flash() {
    this.flashTimer = 0.3; // seconds
    this.emissiveMaterial.emissiveIntensity = 3;
    if (this.light) {
      this.light.intensity = 15;
    }
  }

  update(dt: number) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const t = Math.max(0, this.flashTimer / 0.3);
      this.emissiveMaterial.emissiveIntensity = t * 3;
      if (this.light) {
        this.light.intensity = t * 15;
      }
      // Scale pulse
      const scale = 1 + t * 0.15;
      this.ringMesh.scale.set(scale, 1, scale);
    }
    // Bumpers are static, no need to sync position from physics
  }

  getColliderHandle(): number {
    if (this.body) {
      return this.body.collider(0).handle;
    }
    return -1;
  }
}
