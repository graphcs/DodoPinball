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
    model?: THREE.Group,
  ) {
    const group = new THREE.Group();
    let ringMesh: THREE.Mesh;
    let capMesh: THREE.Mesh;
    let baseMat: THREE.MeshStandardMaterial;
    let emissiveMat: THREE.MeshStandardMaterial;

    if (model) {
      console.log('Loading bumper model at', x, z);
      const clone = model.clone();
      // Compute bounding box and scale to fit bumper size
      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('Bumper model native size:', size.x, size.y, size.z);
      const maxDim = Math.max(size.x, size.y, size.z);
      const uniformScale = (BUMPER_RADIUS * 3.375) / (maxDim || 1);
      clone.scale.setScalar(uniformScale);

      // Recompute after scaling
      const scaledBox = new THREE.Box3().setFromObject(clone);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);

      clone.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

      let meshCount = 0;
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshCount++;
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat) {
              mat.side = THREE.DoubleSide;
              mat.transparent = false;
              mat.opacity = 1.0;
              mat.visible = true;
            }
          });
        }
      });
      console.log('Bumper model mesh count:', meshCount);

      group.add(clone);

      // Create fallback materials for flash effects
      baseMat = materials.plastic(color);
      emissiveMat = materials.emissive(color, 0);

      // Use invisible meshes for flash tracking
      const dummyGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.01, 4);
      ringMesh = new THREE.Mesh(dummyGeo, baseMat);
      ringMesh.visible = false;
      capMesh = new THREE.Mesh(dummyGeo, emissiveMat);
      capMesh.visible = false;
      group.add(ringMesh);
      group.add(capMesh);
    } else {
      // Fallback procedural geometry
      const ringGeo = new THREE.CylinderGeometry(
        BUMPER_RADIUS,
        BUMPER_RADIUS,
        BUMPER_HEIGHT,
        24,
      );
      baseMat = materials.plastic(color);
      ringMesh = new THREE.Mesh(ringGeo, baseMat);
      ringMesh.position.set(0, BUMPER_HEIGHT / 2, 0);
      ringMesh.castShadow = true;
      group.add(ringMesh);

      const capGeo = new THREE.CylinderGeometry(
        BUMPER_RADIUS * 0.8,
        BUMPER_RADIUS * 0.8,
        0.05,
        24,
      );
      emissiveMat = materials.emissive(color, 0);
      capMesh = new THREE.Mesh(capGeo, emissiveMat);
      capMesh.position.set(0, BUMPER_HEIGHT + 0.025, 0);
      group.add(capMesh);
    }

    // Physics body
    const body = createCylinderBody(world, BUMPER_RADIUS, BUMPER_HEIGHT / 2, {
      position: { x, y: BUMPER_HEIGHT / 2, z },
      restitution: 0.3,
      friction: 0.1,
    });

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
