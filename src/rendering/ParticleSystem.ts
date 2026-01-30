import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles = 200;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  emitSparks(position: THREE.Vector3, count: number = 8, color?: THREE.Color) {
    if (color) {
      this.material.color.copy(color);
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      this.particles.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 3,
        ),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.5 + Math.random() * 0.3,
        size: 0.03 + Math.random() * 0.04,
      });
    }
  }

  update(dt: number) {
    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    const sizes = this.geometry.attributes.size as THREE.BufferAttribute;

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 5 * dt; // gravity
      p.position.addScaledVector(p.velocity, dt);
    }

    // Write to buffers
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        positions.setXYZ(i, p.position.x, p.position.y, p.position.z);
        sizes.setX(i, p.size * (p.life / p.maxLife));
      } else {
        positions.setXYZ(i, 0, -100, 0); // Off-screen
        sizes.setX(i, 0);
      }
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    this.geometry.setDrawRange(0, this.particles.length);
  }
}
