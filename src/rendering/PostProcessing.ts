import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  VignetteEffect,
  SMAAEffect,
  ToneMappingEffect,
  SMAAPreset,
  BlendFunction,
  ToneMappingMode,
} from 'postprocessing';
import * as THREE from 'three';

export class PostProcessing {
  readonly composer: EffectComposer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom for emissive surfaces
    const bloom = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.6,
      luminanceSmoothing: 0.3,
      mipmapBlur: true,
    });

    // Vignette
    const vignette = new VignetteEffect({
      darkness: 0.5,
      offset: 0.3,
    });

    // Tone mapping
    const toneMapping = new ToneMappingEffect({
      mode: ToneMappingMode.AGX,
      blendFunction: BlendFunction.NORMAL,
    });

    // Anti-aliasing
    const smaa = new SMAAEffect({
      preset: SMAAPreset.MEDIUM,
    });

    const effectPass = new EffectPass(camera, bloom, vignette, toneMapping, smaa);
    this.composer.addPass(effectPass);
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
  }
}
