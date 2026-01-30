import * as THREE from 'three';

/**
 * Creates a procedural HDR-like environment map for metallic reflections.
 * No external HDR file needed.
 */
export class Environment {
  readonly envMap: THREE.CubeTexture;

  constructor(renderer: THREE.WebGLRenderer) {
    this.envMap = this.createProceduralEnvMap(renderer);
  }

  private createProceduralEnvMap(renderer: THREE.WebGLRenderer): THREE.CubeTexture {
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);

    // Create a temporary scene with gradient lights for the env map
    const envScene = new THREE.Scene();

    // Gradient background sphere
    const gradientGeo = new THREE.SphereGeometry(50, 32, 32);
    const gradientMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          // Warm top, cool bottom, bright spots
          float y = dir.y * 0.5 + 0.5;
          vec3 top = vec3(0.8, 0.7, 0.6);
          vec3 bottom = vec3(0.1, 0.1, 0.2);
          vec3 color = mix(bottom, top, y);
          // Add some bright spots for reflections
          float spot1 = pow(max(dot(dir, normalize(vec3(1.0, 1.0, 0.5))), 0.0), 32.0);
          float spot2 = pow(max(dot(dir, normalize(vec3(-0.5, 0.8, -1.0))), 0.0), 16.0);
          color += vec3(1.0, 0.95, 0.8) * spot1 * 2.0;
          color += vec3(0.6, 0.7, 1.0) * spot2 * 1.5;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const gradientMesh = new THREE.Mesh(gradientGeo, gradientMat);
    envScene.add(gradientMesh);

    cubeCamera.update(renderer, envScene);

    gradientGeo.dispose();
    gradientMat.dispose();

    return cubeRenderTarget.texture;
  }

  applyToScene(scene: THREE.Scene) {
    scene.environment = this.envMap;
  }
}
