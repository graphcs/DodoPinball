import * as THREE from 'three';

export class Lighting {
  readonly lights: THREE.Light[] = [];

  constructor(scene: THREE.Scene) {
    // Main overhead spotlight
    const mainLight = new THREE.SpotLight(0xffffff, 80);
    mainLight.position.set(0, 15, 0);
    mainLight.angle = Math.PI / 4;
    mainLight.penumbra = 0.5;
    mainLight.decay = 1.5;
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 30;
    mainLight.target.position.set(0, 0, -2);
    scene.add(mainLight);
    scene.add(mainLight.target);
    this.lights.push(mainLight);

    // Ambient fill
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambient);
    this.lights.push(ambient);

    // Rim light from below for drama
    const rimLight = new THREE.DirectionalLight(0x2244ff, 0.3);
    rimLight.position.set(0, -5, -10);
    scene.add(rimLight);
    this.lights.push(rimLight);

    // Warm fill from front
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.4);
    fillLight.position.set(0, 8, 10);
    scene.add(fillLight);
    this.lights.push(fillLight);
  }

  createBumperLight(position: THREE.Vector3): THREE.PointLight {
    const light = new THREE.PointLight(0xff4400, 0, 3);
    light.position.copy(position);
    light.position.y += 0.5;
    this.lights.push(light);
    return light;
  }
}
