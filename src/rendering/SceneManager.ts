import * as THREE from 'three';

function createStarryBackground(): THREE.CubeTexture {
  const size = 1024;

  function renderFace(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark navy space gradient
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size * 0.7,
    );
    gradient.addColorStop(0, '#030510');
    gradient.addColorStop(0.5, '#020308');
    gradient.addColorStop(1, '#000103');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Nebula glow patches (darker navy tones)
    for (let i = 0; i < 3; i++) {
      const nx = Math.random() * size;
      const ny = Math.random() * size;
      const nr = 100 + Math.random() * 200;
      const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      const hue = Math.random() > 0.5 ? '20, 10, 50' : '10, 5, 35';
      nebGrad.addColorStop(0, `rgba(${hue}, 0.06)`);
      nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, size, size);
    }

    // Stars - varying sizes and brightness
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const starSize = r < 0.9 ? 0.5 + Math.random() * 0.8 : 1.0 + Math.random() * 1.5;
      const brightness = 150 + Math.floor(Math.random() * 105);

      // Slight color variation (white, blue-white, warm white)
      const colorRand = Math.random();
      let sr: number, sg: number, sb: number;
      if (colorRand < 0.3) {
        sr = brightness * 0.8; sg = brightness * 0.85; sb = brightness; // blue-ish
      } else if (colorRand < 0.5) {
        sr = brightness; sg = brightness * 0.9; sb = brightness * 0.75; // warm
      } else {
        sr = brightness; sg = brightness; sb = brightness; // white
      }

      ctx.beginPath();
      ctx.arc(x, y, starSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.floor(sr)}, ${Math.floor(sg)}, ${Math.floor(sb)}, ${0.6 + Math.random() * 0.4})`;
      ctx.fill();

      // Glow for brighter stars
      if (starSize > 1.0) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, starSize * 3);
        glow.addColorStop(0, `rgba(${Math.floor(sr)}, ${Math.floor(sg)}, ${Math.floor(sb)}, 0.3)`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, starSize * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4-spike stars scattered across the face
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const spikeLen = 6 + Math.random() * 14;
      const brightness = 200 + Math.floor(Math.random() * 55);
      const alpha = 0.5 + Math.random() * 0.5;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI * 0.25);

      // Draw 4 spikes (cross shape)
      for (let s = 0; s < 4; s++) {
        const angle = (s * Math.PI) / 2;
        const dx = Math.cos(angle) * spikeLen;
        const dy = Math.sin(angle) * spikeLen;

        const spikeGrad = ctx.createLinearGradient(0, 0, dx, dy);
        spikeGrad.addColorStop(0, `rgba(${brightness}, ${brightness}, ${Math.min(255, brightness + 20)}, ${alpha})`);
        spikeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = spikeGrad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }

      // Bright center dot
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${Math.min(255, brightness + 30)}, ${alpha})`;
      ctx.fill();

      // Center glow
      const cGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, spikeLen * 0.4);
      cGlow.addColorStop(0, `rgba(${brightness}, ${brightness}, ${Math.min(255, brightness + 20)}, 0.15)`);
      cGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cGlow;
      ctx.beginPath();
      ctx.arc(0, 0, spikeLen * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Planets - 1-2 per face
    const planetCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < planetCount; i++) {
      const px = 100 + Math.random() * (size - 200);
      const py = 100 + Math.random() * (size - 200);
      const pr = 8 + Math.random() * 50;
      const typeRand = Math.random();

      ctx.save();

      // Planet base color
      let baseR: number, baseG: number, baseB: number;
      if (typeRand < 0.25) {
        // Gas giant - muted orange/brown
        baseR = 80; baseG = 50; baseB = 30;
      } else if (typeRand < 0.5) {
        // Ice planet - pale blue
        baseR = 40; baseG = 55; baseB = 80;
      } else if (typeRand < 0.75) {
        // Rocky - grey/brown
        baseR = 55; baseG = 50; baseB = 45;
      } else {
        // Purple/magenta
        baseR = 60; baseG = 30; baseB = 70;
      }

      // Planet body with shading gradient (lit from upper-left)
      const planetGrad = ctx.createRadialGradient(
        px - pr * 0.3, py - pr * 0.3, pr * 0.1,
        px, py, pr,
      );
      planetGrad.addColorStop(0, `rgba(${baseR + 40}, ${baseG + 40}, ${baseB + 40}, 0.7)`);
      planetGrad.addColorStop(0.6, `rgba(${baseR}, ${baseG}, ${baseB}, 0.6)`);
      planetGrad.addColorStop(1, `rgba(${Math.floor(baseR * 0.3)}, ${Math.floor(baseG * 0.3)}, ${Math.floor(baseB * 0.3)}, 0.5)`);
      ctx.fillStyle = planetGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric glow
      const atmoGlow = ctx.createRadialGradient(px, py, pr * 0.8, px, py, pr * 1.6);
      atmoGlow.addColorStop(0, `rgba(${baseR + 30}, ${baseG + 30}, ${baseB + 40}, 0.08)`);
      atmoGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = atmoGlow;
      ctx.beginPath();
      ctx.arc(px, py, pr * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Ring for some planets
      if (Math.random() > 0.5) {
        ctx.strokeStyle = `rgba(${baseR + 60}, ${baseG + 50}, ${baseB + 50}, 0.25)`;
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.8, pr * 0.4, Math.random() * 0.5 - 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    return canvas;
  }

  // Generate 6 faces for the cube texture
  const faces = Array.from({ length: 6 }, () => renderFace());
  const cubeTexture = new THREE.CubeTexture(faces);
  cubeTexture.needsUpdate = true;
  return cubeTexture;
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = createStarryBackground();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Position camera above and slightly in front of the table looking down
    this.camera.position.set(0, 7, 14);
    this.camera.lookAt(0, 0, -3);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Using FXAA post-processing instead
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
