import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SceneManager } from './rendering/SceneManager';
import { Lighting } from './rendering/Lighting';
import { Environment } from './rendering/Environment';
import { Materials } from './rendering/Materials';
import { PostProcessing } from './rendering/PostProcessing';
import { ParticleSystem } from './rendering/ParticleSystem';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { CollisionHandler, ColliderTag } from './physics/CollisionHandler';
import { GameLoop } from './game/GameLoop';
import { GameState } from './game/GameState';
import { GameEvents } from './game/GameEvents';
import { PHYSICS_TIMESTEP, BUMPER_IMPULSE, SLINGSHOT_IMPULSE, ARCH_IMPULSE, BALL_RADIUS, TABLE_LENGTH } from './game/constants';
import { InputManager } from './input/InputManager';
import { AudioManager } from './audio/AudioManager';
import { HUD } from './ui/HUD';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { LoadingScreen } from './ui/LoadingScreen';
import { buildTable, TableEntities } from './table/TableBuilder';
import { TableLayout } from './table/TableLayout';

async function main() {
  // Show loading screen immediately
  const loadingScreen = new LoadingScreen();
  loadingScreen.show();
  let loadProgress = 0;
  const totalLoadSteps = 13;
  const updateLoadProgress = () => {
    loadProgress++;
    loadingScreen.updateProgress((loadProgress / totalLoadSteps) * 100);
  };

  // Initialize Rapier WASM
  await RAPIER.init();
  updateLoadProgress();

  // ---- Rendering ----
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const sceneManager = new SceneManager(canvas);
  const lighting = new Lighting(sceneManager.scene);
  const environment = new Environment(sceneManager.renderer);
  environment.applyToScene(sceneManager.scene);

  const materials = new Materials();
  materials.setEnvMap(environment.envMap);

  const particleSystem = new ParticleSystem(sceneManager.scene);

  // Post-processing
  const postProcessing = new PostProcessing(
    sceneManager.renderer,
    sceneManager.scene,
    sceneManager.camera,
  );

  // Handle resize for post-processing
  window.addEventListener('resize', () => {
    postProcessing.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Physics ----
  const physicsWorld = new PhysicsWorld();

  // ---- Game State ----
  const events = new GameEvents();
  const state = new GameState(events);
  const collisionHandler = new CollisionHandler(events, state);

  // ---- Load Models ----
  const fbxLoader = new FBXLoader();
  let flipperModel: THREE.Group | undefined;
  let launchPathModel: THREE.Group | undefined;
  let playfieldModel: THREE.Group | undefined;
  let buildingsModel: THREE.Group | undefined;
  const bumperModels: (THREE.Group | undefined)[] = [undefined, undefined, undefined];
  try {
    flipperModel = await fbxLoader.loadAsync('/assets/models/Flipper.fbx');
  } catch (e) {
    console.warn('Failed to load flipper model, using fallback geometry:', e);
  }
  updateLoadProgress();
  try {
    launchPathModel = await fbxLoader.loadAsync('/assets/models/Launch path.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load launch path model:', e);
  }
  updateLoadProgress();
  try {
    playfieldModel = await fbxLoader.loadAsync('/assets/models/Play field base.fbx?v=r4_' + Date.now());
  } catch (e) {
    console.warn('Failed to load playfield model:', e);
  }
  updateLoadProgress();
  try {
    buildingsModel = await fbxLoader.loadAsync('/assets/models/Buildings.fbx?v=reload_' + Date.now());
  } catch (e) {
    console.warn('Failed to load buildings model:', e);
  }
  updateLoadProgress();
  const bumperFiles = ['200 bumper.fbx', '400 bumper.fbx', '600 bumper.fbx'];
  for (let i = 0; i < bumperFiles.length; i++) {
    try {
      bumperModels[i] = await fbxLoader.loadAsync('/assets/models/' + bumperFiles[i] + '?v=r2_' + Date.now());
    } catch (e) {
      console.warn('Failed to load bumper model ' + bumperFiles[i] + ':', e);
    }
  }
  updateLoadProgress();
  let triangleBomperLeftModel: THREE.Group | undefined;
  let triangleBomperRightModel: THREE.Group | undefined;
  try {
    triangleBomperLeftModel = await fbxLoader.loadAsync('/assets/models/Triangle bomper left.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load triangle bomper left model:', e);
  }
  try {
    triangleBomperRightModel = await fbxLoader.loadAsync('/assets/models/Triangle bomper right.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load triangle bomper right model:', e);
  }
  updateLoadProgress();
  let dodoAstronautModel: THREE.Group | undefined;
  try {
    // Use a separate loader with resource path pointing to images folder
    const dodoLoader = new FBXLoader();
    dodoLoader.setResourcePath('/assets/images/');
    dodoAstronautModel = await dodoLoader.loadAsync('/assets/models/Dodo astronaut.fbx?v=r3_' + Date.now());
  } catch (e) {
    console.warn('Failed to load Dodo astronaut model:', e);
  }
  updateLoadProgress();
  let rocketModel: THREE.Group | undefined;
  try {
    rocketModel = await fbxLoader.loadAsync('/assets/models/Rocket.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Rocket model:', e);
  }
  updateLoadProgress();
  let slideModel: THREE.Group | undefined;
  try {
    slideModel = await fbxLoader.loadAsync('/assets/models/Slide.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Slide model:', e);
  }
  updateLoadProgress();
  let slidePillarsModel: THREE.Group | undefined;
  try {
    slidePillarsModel = await fbxLoader.loadAsync('/assets/models/Slide pillars.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Slide pillars model:', e);
  }
  updateLoadProgress();
  let archLeftModel: THREE.Group | undefined;
  let archRightModel: THREE.Group | undefined;
  try {
    archLeftModel = await fbxLoader.loadAsync('/assets/models/Arch left.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Arch left model:', e);
  }
  try {
    archRightModel = await fbxLoader.loadAsync('/assets/models/Arch right.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Arch right model:', e);
  }
  updateLoadProgress();
  let plungerModel: THREE.Group | undefined;
  try {
    plungerModel = await fbxLoader.loadAsync('/assets/models/Plunger.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Plunger model:', e);
  }
  updateLoadProgress();

  // ---- Build Table ----
  const table = buildTable(
    physicsWorld.world,
    sceneManager.scene,
    materials,
    lighting,
    collisionHandler,
    flipperModel,
    launchPathModel,
    playfieldModel,
    buildingsModel,
    bumperModels,
    triangleBomperLeftModel,
    triangleBomperRightModel,
    plungerModel,
  );

  // ---- Dodo Astronaut ----
  let dodoAstronaut: THREE.Group | undefined;
  let dodoBaseY = 0;
  if (dodoAstronautModel) {
    dodoAstronaut = dodoAstronautModel.clone();

    // Convert FBX materials to MeshStandardMaterial for correct brightness
    dodoAstronaut.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const convertMat = (mat: THREE.Material): THREE.Material => {
          const oldMat = mat as any;

          // Check if original material has transparency
          const hasTransparency = oldMat.opacity < 1.0 || oldMat.transparent || oldMat.alphaMap;

          console.log('Dodo material:', mat.name, 'opacity:', oldMat.opacity, 'transparent:', oldMat.transparent, 'color:', oldMat.color?.getHexString());

          const newMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: oldMat.map || null,
            normalMap: oldMat.normalMap || null,
            alphaMap: oldMat.alphaMap || null,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.6,
            transparent: hasTransparency,
            opacity: oldMat.opacity !== undefined ? oldMat.opacity : 1.0,
            depthWrite: !hasTransparency, // Disable depth write for transparent materials
          });
          if (oldMat.map) {
            oldMat.map.colorSpace = THREE.SRGBColorSpace;
          }
          // If no texture map, use original color
          if (!oldMat.map && oldMat.color) {
            newMat.color = oldMat.color.clone();
            newMat.metalness = 0.5;
            newMat.roughness = 0.3;
          }
          return newMat;
        };

        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(convertMat);
        } else {
          mesh.material = convertMat(mesh.material);
        }
      }
    });

    // Scale and position
    const box = new THREE.Box3().setFromObject(dodoAstronaut);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Scale to a reasonable size (~2.25 units tall)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.25 / (maxDim || 1);
    dodoAstronaut.scale.setScalar(scale);

    // Recompute after scaling
    const scaledBox = new THREE.Box3().setFromObject(dodoAstronaut);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    // Position at center-back of the table
    const HL = TABLE_LENGTH / 2;
    dodoBaseY = -scaledBox.min.y + 0.5;
    dodoAstronaut.position.set(
      -scaledCenter.x + 0.5,
      dodoBaseY,
      -scaledCenter.z - 2.5,
    );
    sceneManager.scene.add(dodoAstronaut);
  }

  // ---- Rocket ----
  let rocketGroup: THREE.Group | undefined;
  let rocketCenterX = 0;
  let rocketCenterZ = -2.5;
  const rocketOrbitRadius = 4.0;
  const rocketOrbitSpeed = 0.4;
  const rocketBaseY = 4;
  if (rocketModel) {
    const rocket = rocketModel.clone();
    rocket.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.visible = true;
            // Lighten red/dark pink materials
            const stdMat = mat as any;
            if (stdMat.color) {
              const c = stdMat.color;
              if (c.r > 0.3 && c.g < 0.3 && c.b < 0.4) {
                c.lerp(new THREE.Color(1, 0.7, 0.7), 0.55);
              }
            }
          }
        });
      }
    });

    // Scale and position
    const rBox = new THREE.Box3().setFromObject(rocket);
    const rSize = new THREE.Vector3();
    rBox.getSize(rSize);
    const rCenter = new THREE.Vector3();
    rBox.getCenter(rCenter);

    // Scale to ~2.376 units tall
    const maxDim = Math.max(rSize.x, rSize.y, rSize.z);
    const rScale = 2.6136 / (maxDim || 1);
    rocket.scale.setScalar(rScale);

    // Recompute after scaling
    const scaledRBox = new THREE.Box3().setFromObject(rocket);
    const scaledRCenter = new THREE.Vector3();
    scaledRBox.getCenter(scaledRCenter);

    // Center the model at the group origin
    rocket.position.set(-scaledRCenter.x + 0.06, -scaledRCenter.y + 1.2, -scaledRCenter.z);

    // Wrap in a group for orbit animation
    rocketGroup = new THREE.Group();
    rocketGroup.add(rocket);

    // Lay the rocket on its side so it flies horizontally
    rocket.rotation.x = Math.PI / 2;
    rocket.rotation.z = 0;

    // Rocket half-length for flame offset (stored for animation loop)
    const rocketHalfLen = scaledRBox.getSize(new THREE.Vector3()).y / 2;

    // Create flame meshes as scene-level objects (positioned each frame)
    const flameGroup = new THREE.Group();

    const outerFlameGeo = new THREE.ConeGeometry(0.15, rocketHalfLen * 0.8, 8);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff4400, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
    flameGroup.add(outerFlame);

    const innerFlameGeo = new THREE.ConeGeometry(0.08, rocketHalfLen * 0.55, 8);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    flameGroup.add(innerFlame);

    const coreFlameGeo = new THREE.ConeGeometry(0.05, rocketHalfLen * 0.35, 8);
    const coreFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const coreFlame = new THREE.Mesh(coreFlameGeo, coreFlameMat);
    flameGroup.add(coreFlame);

    // Add animated tip extensions for each flame
    const outerTipGeo = new THREE.ConeGeometry(0.08, rocketHalfLen * 0.4, 8);
    const outerTip = new THREE.Mesh(outerTipGeo, outerFlameMat.clone());
    (outerTip.material as THREE.MeshBasicMaterial).opacity = 0.6;
    outerTip.position.y = -(rocketHalfLen * 0.8) / 2 - rocketHalfLen * 0.15;
    outerFlame.add(outerTip);

    const innerTipGeo = new THREE.ConeGeometry(0.04, rocketHalfLen * 0.3, 8);
    const innerTip = new THREE.Mesh(innerTipGeo, innerFlameMat.clone());
    (innerTip.material as THREE.MeshBasicMaterial).opacity = 0.7;
    innerTip.position.y = -(rocketHalfLen * 0.55) / 2 - rocketHalfLen * 0.1;
    innerFlame.add(innerTip);

    const coreTipGeo = new THREE.ConeGeometry(0.02, rocketHalfLen * 0.2, 8);
    const coreTip = new THREE.Mesh(coreTipGeo, coreFlameMat.clone());
    (coreTip.material as THREE.MeshBasicMaterial).opacity = 0.8;
    coreTip.position.y = -(rocketHalfLen * 0.35) / 2 - rocketHalfLen * 0.08;
    coreFlame.add(coreTip);

    // Store tips for animation
    (rocketGroup as any)._flameTips = [outerTip, innerTip, coreTip];

    // Rotate cones: tip along -Z, then flip 180 on Z
    outerFlame.rotation.set(Math.PI / 2, 0, Math.PI);
    innerFlame.rotation.set(Math.PI / 2, 0, Math.PI);
    innerFlame.position.z = 0.15;
    coreFlame.rotation.set(Math.PI / 2, 0, Math.PI);
    coreFlame.position.z = 0.3;

    sceneManager.scene.add(flameGroup);

    // Store for animation
    (rocketGroup as any)._flameGroup = flameGroup;
    (rocketGroup as any)._rocketHalfLen = rocketHalfLen;

    // Position high above the playfield
    rocketGroup.position.set(rocketCenterX + rocketOrbitRadius, rocketBaseY, rocketCenterZ);
    sceneManager.scene.add(rocketGroup);
  }

  // ---- Slide (with trimesh collider for ball to run on) ----
  if (slideModel) {
    const slide = slideModel.clone();
    slide.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.visible = true;
          }
        });
      }
    });

    const sBox = new THREE.Box3().setFromObject(slide);
    const sSize = new THREE.Vector3();
    sBox.getSize(sSize);
    const sCenter = new THREE.Vector3();
    sBox.getCenter(sCenter);

    const maxDim = Math.max(sSize.x, sSize.y, sSize.z);
    const sScale = (TABLE_LENGTH * 0.7) / (maxDim || 1);
    slide.scale.setScalar(sScale * 0.98 * 0.98 * 0.96 * 0.96 * 0.7 * 0.9 * 0.9 * 0.9);

    const scaledSBox = new THREE.Box3().setFromObject(slide);
    const scaledSCenter = new THREE.Vector3();
    scaledSBox.getCenter(scaledSCenter);

    // Position on the table and tilt the back end up
    slide.position.set(
      -scaledSCenter.x + 0.55,
      -scaledSBox.min.y,
      -scaledSCenter.z + 0.2,
    );
    slide.rotation.x = 0;
    sceneManager.scene.add(slide);

    // Add trimesh collider so ball can run on the slide
    slide.updateMatrixWorld(true);

    const sVertices: number[] = [];
    const sIndices: number[] = [];
    let sVertexOffset = 0;

    slide.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        sVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          sIndices.push(geo.index.array[i] + sVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          sIndices.push(i + sVertexOffset);
        }
      }

      sVertexOffset += posAttr.count;
    });

    if (sVertices.length > 0 && sIndices.length > 0) {
      const vertices = new Float32Array(sVertices);
      const indices = new Uint32Array(sIndices);

      const sBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const sBody = physicsWorld.world.createRigidBody(sBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.3)
        .setFriction(0.5);
      physicsWorld.world.createCollider(trimeshDesc, sBody);
    }
  }

  // ---- Slide Pillars ----
  if (slidePillarsModel) {
    const pillars = slidePillarsModel.clone();
    pillars.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.visible = true;
          }
        });
      }
    });

    const pBox = new THREE.Box3().setFromObject(pillars);
    const pSize = new THREE.Vector3();
    pBox.getSize(pSize);
    const pCenter = new THREE.Vector3();
    pBox.getCenter(pCenter);

    const maxDim = Math.max(pSize.x, pSize.y, pSize.z);
    const pScale = TABLE_LENGTH / (maxDim || 1);
    pillars.scale.setScalar(pScale);

    const scaledPBox = new THREE.Box3().setFromObject(pillars);
    const scaledPCenter = new THREE.Vector3();
    scaledPBox.getCenter(scaledPCenter);

    pillars.position.set(
      -scaledPCenter.x + 1.5,
      -scaledPBox.min.y,
      -scaledPCenter.z,
    );
    sceneManager.scene.add(pillars);
  }

  // ---- Archs (Left and Right) ----
  const archLights: THREE.PointLight[] = [];
  const archModels = [
    { model: archLeftModel, x: -2.0, z: -1.2, side: 'left' },
    { model: archRightModel, x: 1.2, z: 1.8, side: 'right' },
  ];

  archModels.forEach(({ model, x, z, side }, index) => {
    if (!model) return;

    const arch = model.clone();
    arch.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.visible = true;
          }
        });
      }
    });

    const aBox = new THREE.Box3().setFromObject(arch);
    const aSize = new THREE.Vector3();
    aBox.getSize(aSize);
    const aCenter = new THREE.Vector3();
    aBox.getCenter(aCenter);

    const maxDim = Math.max(aSize.x, aSize.y, aSize.z);
    const aScale = (TABLE_LENGTH * 0.2) / (maxDim || 1);
    arch.scale.setScalar(aScale * 0.85);

    const scaledABox = new THREE.Box3().setFromObject(arch);
    const scaledACenter = new THREE.Vector3();
    scaledABox.getCenter(scaledACenter);

    arch.position.set(
      x - scaledACenter.x,
      -scaledABox.min.y,
      -scaledACenter.z + z,
    );
    sceneManager.scene.add(arch);

    // Add hit light
    const archLight = new THREE.PointLight(0xe78299, 0, 4);
    archLight.position.set(x, 1.0, z);
    sceneManager.scene.add(archLight);
    archLights.push(archLight);

    // Add trimesh collider
    arch.updateMatrixWorld(true);

    const aVertices: number[] = [];
    const aIndices: number[] = [];
    let aVertexOffset = 0;

    arch.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        aVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          aIndices.push(geo.index.array[i] + aVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          aIndices.push(i + aVertexOffset);
        }
      }

      aVertexOffset += posAttr.count;
    });

    if (aVertices.length > 0 && aIndices.length > 0) {
      const vertices = new Float32Array(aVertices);
      const indices = new Uint32Array(aIndices);

      const aBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const aBody = physicsWorld.world.createRigidBody(aBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.8)
        .setFriction(0.1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const aCollider = physicsWorld.world.createCollider(trimeshDesc, aBody);
      collisionHandler.registerCollider(aCollider.handle, ColliderTag.Arch, index);
    }
  });

  // Store arch lights for event handling
  (sceneManager.scene as any)._archLights = archLights;

  // ---- Decorative Planets near playfield ----
  const planetConfigs: { pos: number[]; radius: number; color: number; emissive: number; ring?: { color: number; tilt: number } }[] = [
    { pos: [-6, 4, -8], radius: 1.8, color: 0x4a3020, emissive: 0x1a0800 },   // brown gas giant
    { pos: [7, 6, -12], radius: 2.5, color: 0x2a3850, emissive: 0x080c18 },    // blue ice planet
    { pos: [-15, 1, -10], radius: 1.2, color: 0x502060, emissive: 0x100810 },    // purple
    { pos: [5, 3, 5], radius: 0.8, color: 0x604838, emissive: 0x181008 },       // small rocky
    { pos: [-4, 10, -20], radius: 3.5, color: 0x3a4555, emissive: 0x0a0c12, ring: { color: 0x6a7a90, tilt: 0.3 } },   // large distant
  ];
  planetConfigs.forEach((cfg) => {
    const geo = new THREE.SphereGeometry(cfg.radius, 32, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      roughness: 0.8,
      metalness: 0.1,
    });
    const planet = new THREE.Mesh(geo, mat);
    planet.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    sceneManager.scene.add(planet);

    // Atmospheric glow
    const glowGeo = new THREE.SphereGeometry(cfg.radius * 1.15, 32, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    planet.add(glow);

    // Small thin ring
    if (cfg.ring) {
      const ringGeo = new THREE.RingGeometry(cfg.radius * 1.3, cfg.radius * 1.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.ring.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + cfg.ring.tilt;
      planet.add(ringMesh);
    }
  });

  // ---- Input ----
  const input = new InputManager();
  input.setupTouch(canvas);

  // ---- Audio ----
  const audio = new AudioManager();

  // ---- UI ----
  const hud = new HUD(state, events);
  hud.hide();

  // Camera shake state
  let shakeIntensity = 0;
  const shakeDecay = 8;

  // ---- Wire up input ----
  input.onInput((action, pressed) => {
    switch (action) {
      case 'leftFlipper':
        table.leftFlipper.setActive(pressed);
        if (pressed) { audio.playFlipperUp(); audio.playBumperHit(); }
        else audio.playFlipperDown();
        break;
      case 'rightFlipper':
        table.rightFlipper.setActive(pressed);
        if (pressed) { audio.playFlipperUp(); audio.playBumperHit(); }
        else audio.playFlipperDown();
        break;
      case 'plunger':
        if (pressed) {
          if (!state.isPlaying) return;
          if (!state.isBallInPlay) {
            // Reset ball to launch lane
            table.ball.reset(TableLayout.ballStart);
          }
          table.plunger.startCharge();
          audio.playPowerUp();
        } else {
          table.plunger.release();
          audio.stopPowerUp();
          audio.playBassyHit();
          audio.playPlungerRelease();
          if (!state.isBallInPlay && state.isPlaying) {
            state.launchBall();
          }
        }
        break;
      case 'start':
        // Handled by start screen
        break;
    }
  });

  // ---- Wire up game events to audio/visuals ----
  events.on('bumperHit', (e) => {
    audio.playBumperHit();
    const idx = (e.data?.index as number) ?? 0;
    if (table.bumpers[idx]) {
      table.bumpers[idx].flash();

      // Apply impulse away from bumper
      if (table.ball.body) {
        const ballPos = table.ball.body.translation();
        const bumperPos = table.bumpers[idx].mesh.position;
        const dx = ballPos.x - bumperPos.x;
        const dz = ballPos.z - bumperPos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        table.ball.applyImpulse({
          x: (dx / len) * BUMPER_IMPULSE,
          y: 0,
          z: (dz / len) * BUMPER_IMPULSE,
        });
      }

      // Sparks
      const bPos = table.bumpers[idx].mesh.position;
      particleSystem.emitSparks(
        new THREE.Vector3(bPos.x, 0.3, bPos.z),
        12,
        new THREE.Color(0xff6600),
      );

      // Camera shake
      shakeIntensity = 0.05;
    }
  });

  events.on('triangleBomperHit', () => {
    audio.playBumperHit();

    // Apply strong bounce impulse away from triangle bomper
    if (table.ball.body) {
      const ballPos = table.ball.body.translation();
      // Push toward center X and down toward flippers
      const pushX = ballPos.x > 0 ? -1 : 1;
      const TRIANGLE_BOUNCE = 1.2;
      // Override velocity to ensure the ball escapes
      const vel = table.ball.body.linvel();
      const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (speed < 1.0) {
        // Ball is slow, set velocity directly to ensure escape
        table.ball.body.setLinvel(
          new RAPIER.Vector3(pushX * TRIANGLE_BOUNCE, 0.1, TRIANGLE_BOUNCE * 0.5),
          true,
        );
      } else {
        table.ball.applyImpulse({
          x: pushX * TRIANGLE_BOUNCE * 0.5,
          y: 0,
          z: TRIANGLE_BOUNCE * 0.3,
        });
      }
    }

    // Flash the triangle bomper lights
    const lights = (sceneManager.scene as any)._triangleBomperLights as THREE.PointLight[] | undefined;
    if (lights) {
      lights.forEach((light) => {
        light.intensity = 15;
      });
      setTimeout(() => {
        lights.forEach((light) => {
          light.intensity = 0;
        });
      }, 200);
    }

    shakeIntensity = 0.03;
  });

  events.on('rocketHit', () => {
    audio.playBumperHit();

    // Apply bounce impulse away from rocket
    if (table.ball.body) {
      const ballPos = table.ball.body.translation();
      // Rocket is at x:-1.5, z:-3.0 — push ball away from it
      const rocketX = -0.8;
      const rocketZ = -2.5;
      const dx = ballPos.x - rocketX;
      const dz = ballPos.z - rocketZ;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const ROCKET_BOUNCE = 1.5;
      table.ball.applyImpulse({
        x: (dx / len) * ROCKET_BOUNCE,
        y: 0,
        z: (dz / len) * ROCKET_BOUNCE,
      });
    }

    shakeIntensity = 0.04;
  });

  events.on('archHit', (e) => {
    audio.playBumperHit();

    // Flash the arch light
    const idx = (e.data?.index as number) ?? 0;
    const archLight = archLights[idx];
    if (archLight) {
      archLight.intensity = 3;
      const fadeArch = () => {
        archLight.intensity *= 0.85;
        if (archLight.intensity > 0.05) {
          requestAnimationFrame(fadeArch);
        } else {
          archLight.intensity = 0;
        }
      };
      requestAnimationFrame(fadeArch);
    }

    // Apply bounce impulse away from the arch center toward the table center
    if (table.ball.body) {
      const ballPos = table.ball.body.translation();
      const vel = table.ball.body.linvel();
      const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const pushX = ballPos.x > 0 ? -1 : 1;

      if (speed < 0.5) {
        // Ball is stuck - push it away firmly toward center and down
        table.ball.body.setLinvel(
          new RAPIER.Vector3(pushX * ARCH_IMPULSE, 0.1, ARCH_IMPULSE * 0.8),
          true,
        );
      } else {
        table.ball.applyImpulse({
          x: pushX * ARCH_IMPULSE * 0.6,
          y: 0,
          z: ARCH_IMPULSE * 0.6,
        });
      }
    }

    shakeIntensity = 0.03;
  });

  events.on('slingshotHit', (e) => {
    audio.playSlingshotHit();
    const idx = (e.data?.index as number) ?? 0;
    if (table.slingshots[idx]) {
      table.slingshots[idx].flash();

      // Apply impulse
      if (table.ball.body) {
        const ballPos = table.ball.body.translation();
        const slingPos = table.slingshots[idx].mesh.position;
        const dx = ballPos.x - slingPos.x;
        const dz = ballPos.z - slingPos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        table.ball.applyImpulse({
          x: (dx / len) * SLINGSHOT_IMPULSE,
          y: 0.3,
          z: (dz / len) * SLINGSHOT_IMPULSE,
        });
      }
    }
  });

  events.on('dropTargetHit', (e) => {
    audio.playDropTargetHit();
    const idx = (e.data?.index as number) ?? 0;
    if (table.dropTargets[idx] && !table.dropTargets[idx].getIsDown()) {
      table.dropTargets[idx].hitTarget();
    }
  });

  events.on('dropTargetBankComplete', () => {
    audio.playBankComplete();
    // Reset all drop targets
    setTimeout(() => {
      table.dropTargets.forEach((dt) => dt.resetTarget());
    }, 1000);
    shakeIntensity = 0.08;
  });

  events.on('spinnerSpin', () => {
    audio.playSpinnerSpin();
    table.spinner.spin();
  });

  events.on('rolloverLane', (e) => {
    audio.playRollover();
    const idx = (e.data?.index as number) ?? 0;
    if (table.rolloverLanes[idx]) {
      table.rolloverLanes[idx].activate();
    }
  });

  events.on('rolloverComplete', () => {
    audio.playBankComplete();
    table.rolloverLanes.forEach((rl) => rl.deactivate());
  });

  events.on('rampComplete', () => {
    audio.playRampComplete();
    shakeIntensity = 0.03;
  });

  events.on('ballDrain', () => {
    audio.playDrain();
    if (state.ballsRemaining > 0) {
      // Move ball back to launch lane after a delay
      setTimeout(() => {
        table.ball.reset(TableLayout.ballStart);
      }, 1000);
    }
  });

  events.on('extraBall', () => {
    audio.playExtraBall();
    shakeIntensity = 0.06;
  });

  events.on('gameOver', (e) => {
    audio.playGameOver();
    hud.hide();
    const score = (e.data?.score as number) ?? 0;
    const highScore = (e.data?.highScore as number) ?? 0;
    setTimeout(() => {
      gameOverScreen.show(score, highScore);
    }, 1500);
  });

  // ---- Game Loop ----
  const preLaunchCameraPos = new THREE.Vector3(0, 7, 14);
  const preLaunchLookAt = new THREE.Vector3(0, 0, -3);
  // Follow camera: more top-down, offset behind/above ball
  const followCameraOffset = new THREE.Vector3(0, 14, 5);
  const followLookAtOffset = new THREE.Vector3(0, 0, -2);
  const currentCameraPos = sceneManager.camera.position.clone();
  const currentLookAt = preLaunchLookAt.clone();
  const baseCameraPos = sceneManager.camera.position.clone();
  const lerpSpeed = 0.015;

  const gameLoop = new GameLoop(
    // Physics step
    () => {
      if (!state.isPlaying) return;

      table.leftFlipper.update(PHYSICS_TIMESTEP);
      table.rightFlipper.update(PHYSICS_TIMESTEP);
      table.plunger.update(PHYSICS_TIMESTEP);

      physicsWorld.step();
      collisionHandler.processEvents(physicsWorld.eventQueue, physicsWorld.world);

      // Check if ball fell off table or is stuck
      if (table.ball.body) {
        const pos = table.ball.body.translation();
        if (pos.y < -5) {
          // Ball fell through - drain it
          if (state.isBallInPlay) {
            state.drainBall();
          }
        }

        // Clamp ball speed to prevent it flying off the playfield
        const vel = table.ball.body.linvel();
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        const MAX_BALL_SPEED = 15;
        if (speed > MAX_BALL_SPEED) {
          const scale = MAX_BALL_SPEED / speed;
          table.ball.body.setLinvel(
            new RAPIER.Vector3(vel.x * scale, vel.y * scale, vel.z * scale),
            true,
          );
        }

        // Unstick ball near triangle bompers
        const speed2d = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const HL = TABLE_LENGTH / 2;
        const inBomperZone = pos.z > (HL - 4.5) && pos.z < (HL - 2.0) && Math.abs(pos.x) > 0.5;
        if (inBomperZone && speed2d < 0.3 && state.isBallInPlay) {
          // Ball is stuck near triangle bompers - kick it toward center and down
          const pushX = pos.x > 0 ? -1 : 1;
          table.ball.body.setLinvel(
            new RAPIER.Vector3(pushX * 1.0, 0.1, 1.0),
            true,
          );
        }

        // Unstick ball near arches (left arch around x:-1.9, z:-1.2; right arch around x:1.1, z:1.8)
        const nearLeftArch = Math.abs(pos.x - (-1.9)) < 1.0 && Math.abs(pos.z - (-1.2)) < 1.0;
        const nearRightArch = Math.abs(pos.x - 1.1) < 1.0 && Math.abs(pos.z - 1.8) < 1.0;
        if ((nearLeftArch || nearRightArch) && speed2d < 0.5 && state.isBallInPlay) {
          // Ball is stuck near arch - push it toward center and down the table
          const pushX = pos.x > 0 ? -1 : 1;
          table.ball.body.setLinvel(
            new RAPIER.Vector3(pushX * 1.5, 0.1, 1.2),
            true,
          );
        }

      }
    },
    // Render
    (_alpha) => {
      // Update entity visuals
      table.ball.update(0);
      table.bumpers.forEach((b) => b.update(1 / 60));
      table.slingshots.forEach((s) => s.update(1 / 60));
      table.spinner.update(1 / 60);

      // Animate Dodo astronaut bobbing up and down
      if (dodoAstronaut) {
        const time = performance.now() / 1000;
        dodoAstronaut.position.y = dodoBaseY + Math.sin(time * 1.4) * 0.3;
      }

      // Animate Rocket in circular orbit, nose facing direction of travel
      if (rocketGroup) {
        const time = performance.now() / 1000;
        const angle = time * rocketOrbitSpeed;
        rocketGroup.position.x = rocketCenterX + Math.cos(angle) * rocketOrbitRadius;
        rocketGroup.position.z = rocketCenterZ + Math.sin(angle) * rocketOrbitRadius;
        rocketGroup.position.y = rocketBaseY + Math.sin(time * 1.2) * 0.4;
        // Point the rocket in the direction of travel (tangent to the circle)
        rocketGroup.rotation.y = -angle;

        // Position flame behind the rocket along the orbit tangent
        const fg = (rocketGroup as any)._flameGroup as THREE.Group | undefined;
        const halfLen = (rocketGroup as any)._rocketHalfLen as number;
        if (fg && halfLen) {
          // The rocket faces along the tangent; the back is opposite the travel direction
          // Travel direction tangent: (-sin(angle), cos(angle))
          // Back direction: (sin(angle), -cos(angle))
          const backDist = halfLen * 0.8 - 0.6 + 0.04;
          const backX = Math.sin(angle) * backDist;
          const backZ = -Math.cos(angle) * backDist;
          fg.position.set(
            rocketGroup.position.x + backX,
            rocketGroup.position.y + 0.03,
            rocketGroup.position.z + backZ,
          );
          // Point flames away from travel direction
          fg.rotation.y = -angle;

          // Animate flame tips (extend/retract)
          const tips = (rocketGroup as any)._flameTips as THREE.Mesh[] | undefined;
          if (tips) {
            tips.forEach((tip, i) => {
              const stretch = 0.7 + Math.sin(time * 10 + i * 2.5) * 0.3 + Math.sin(time * 16 + i * 1.7) * 0.2;
              tip.scale.y = stretch;
            });
          }
        }
      }
      particleSystem.update(1 / 60);

      // Camera follow logic
      let targetCameraPos: THREE.Vector3;
      let targetLookAt: THREE.Vector3;

      if (state.isBallInPlay && table.ball.body) {
        const ballPos = table.ball.body.translation();
        // Clamp ball Z to keep camera within reasonable bounds
        const clampedZ = Math.max(-3, Math.min(30, ballPos.z));
        targetCameraPos = new THREE.Vector3(
          ballPos.x * 0.1,
          followCameraOffset.y,
          clampedZ * 0.5 + followCameraOffset.z,
        );
        targetLookAt = new THREE.Vector3(
          ballPos.x * 0.08,
          0,
          clampedZ * 0.5 + followLookAtOffset.z,
        );
      } else {
        targetCameraPos = preLaunchCameraPos;
        targetLookAt = preLaunchLookAt;
      }

      currentCameraPos.lerp(targetCameraPos, lerpSpeed);
      currentLookAt.lerp(targetLookAt, lerpSpeed);
      baseCameraPos.copy(currentCameraPos);

      sceneManager.camera.position.copy(currentCameraPos);
      sceneManager.camera.lookAt(currentLookAt);

      // Camera shake
      if (shakeIntensity > 0.001) {
        shakeIntensity *= Math.exp(-shakeDecay * (1 / 60));
        sceneManager.camera.position.set(
          currentCameraPos.x + (Math.random() - 0.5) * shakeIntensity,
          currentCameraPos.y + (Math.random() - 0.5) * shakeIntensity,
          currentCameraPos.z + (Math.random() - 0.5) * shakeIntensity,
        );
      }

      // Render with post-processing
      postProcessing.render(1 / 60);
    },
  );

  // ---- Start/Game Over Screens ----
  const startGame = () => {
    state.startGame();
    hud.show();
    table.ball.reset(TableLayout.ballStart);
    table.dropTargets.forEach((dt) => dt.resetTarget());
    table.rolloverLanes.forEach((rl) => rl.deactivate());
    audio.startBgMusic();
  };

  const gameOverScreen = new GameOverScreen(startGame);
  const startScreen = new StartScreen(startGame);

  // Start the game loop (it runs even on title screen for rendering)
  gameLoop.start();

  // Loading complete - transition to start screen
  loadingScreen.updateProgress(100);
  await new Promise(resolve => setTimeout(resolve, 300));
  loadingScreen.hide();

  // Show start screen
  startScreen.show();
}

main().catch(console.error);
