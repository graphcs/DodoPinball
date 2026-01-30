import * as THREE from 'three';

export class Materials {
  private envMap: THREE.CubeTexture | null = null;

  setEnvMap(envMap: THREE.CubeTexture) {
    this.envMap = envMap;
  }

  chrome(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 1.0,
      roughness: 0.05,
      envMap: this.envMap,
      envMapIntensity: 1.5,
    });
  }

  plastic(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.0,
      roughness: 0.4,
      envMap: this.envMap,
      envMapIntensity: 0.3,
    });
  }

  wood(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.0,
      roughness: 0.8,
    });
  }

  playfield(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      metalness: 0.0,
      roughness: 0.3,
      envMap: this.envMap,
      envMapIntensity: 0.2,
    });
  }

  emissive(color: number, intensity: number = 2): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      metalness: 0.3,
      roughness: 0.4,
    });
  }

  rubber(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.0,
      roughness: 0.9,
    });
  }

  rail(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.8,
      roughness: 0.2,
      envMap: this.envMap,
      envMapIntensity: 1.0,
    });
  }

  ramp(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.7,
      envMap: this.envMap,
      envMapIntensity: 0.5,
    });
  }
}
