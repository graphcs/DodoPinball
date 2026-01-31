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
import { PHYSICS_TIMESTEP, BUMPER_IMPULSE, SLINGSHOT_IMPULSE, BALL_RADIUS, TABLE_LENGTH } from './game/constants';
import { InputManager } from './input/InputManager';
import { AudioManager } from './audio/AudioManager';
import { HUD } from './ui/HUD';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { buildTable, TableEntities } from './table/TableBuilder';
import { TableLayout } from './table/TableLayout';

async function main() {
  // Initialize Rapier WASM
  await RAPIER.init();

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
  let triangleBomperModel: THREE.Group | undefined;
  const bumperModels: (THREE.Group | undefined)[] = [undefined, undefined, undefined];
  try {
    flipperModel = await fbxLoader.loadAsync('/assets/models/Flipper.fbx');
  } catch (e) {
    console.warn('Failed to load flipper model, using fallback geometry:', e);
  }
  try {
    launchPathModel = await fbxLoader.loadAsync('/assets/models/Launch path.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load launch path model:', e);
  }
  try {
    playfieldModel = await fbxLoader.loadAsync('/assets/models/Play field base.fbx?v=r4_' + Date.now());
  } catch (e) {
    console.warn('Failed to load playfield model:', e);
  }
  try {
    buildingsModel = await fbxLoader.loadAsync('/assets/models/Buildings.fbx?v=reload_' + Date.now());
  } catch (e) {
    console.warn('Failed to load buildings model:', e);
  }
  const bumperFiles = ['200 bumper.fbx', '400 bumper.fbx', '600 bumper.fbx'];
  for (let i = 0; i < bumperFiles.length; i++) {
    try {
      bumperModels[i] = await fbxLoader.loadAsync('/assets/models/' + bumperFiles[i] + '?v=r2_' + Date.now());
    } catch (e) {
      console.warn('Failed to load bumper model ' + bumperFiles[i] + ':', e);
    }
  }
  try {
    triangleBomperModel = await fbxLoader.loadAsync('/assets/models/Triangle bomper.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load triangle bomper model:', e);
  }
  let dodoAstronautModel: THREE.Group | undefined;
  try {
    // Use a separate loader with resource path pointing to images folder
    const dodoLoader = new FBXLoader();
    dodoLoader.setResourcePath('/assets/images/');
    dodoAstronautModel = await dodoLoader.loadAsync('/assets/models/Dodo astronaut.fbx?v=r3_' + Date.now());
  } catch (e) {
    console.warn('Failed to load Dodo astronaut model:', e);
  }
  let rocketModel: THREE.Group | undefined;
  try {
    rocketModel = await fbxLoader.loadAsync('/assets/models/Rocket.fbx?v=' + Date.now());
  } catch (e) {
    console.warn('Failed to load Rocket model:', e);
  }

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
    triangleBomperModel,
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
          const newMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: oldMat.map || null,
            normalMap: oldMat.normalMap || null,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.6,
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
      -scaledCenter.x,
      dodoBaseY,
      -scaledCenter.z - HL + 1.5,
    );
    sceneManager.scene.add(dodoAstronaut);
  }

  // ---- Rocket ----
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

    // Scale to ~2.16 units tall
    const maxDim = Math.max(rSize.x, rSize.y, rSize.z);
    const rScale = 2.16 / (maxDim || 1);
    rocket.scale.setScalar(rScale);

    // Recompute after scaling
    const scaledRBox = new THREE.Box3().setFromObject(rocket);
    const scaledRCenter = new THREE.Vector3();
    scaledRBox.getCenter(scaledRCenter);

    // Position on the right side of the table, mid-field
    const HL = TABLE_LENGTH / 2;
    rocket.position.set(
      -scaledRCenter.x + 1.5,
      -scaledRBox.min.y,
      -scaledRCenter.z - 1.5,
    );
    sceneManager.scene.add(rocket);

    // Add trimesh collider with bounce
    rocket.updateMatrixWorld(true);

    const rVertices: number[] = [];
    const rIndices: number[] = [];
    let rVertexOffset = 0;

    rocket.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        rVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          rIndices.push(geo.index.array[i] + rVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          rIndices.push(i + rVertexOffset);
        }
      }

      rVertexOffset += posAttr.count;
    });

    if (rVertices.length > 0 && rIndices.length > 0) {
      const vertices = new Float32Array(rVertices);
      const indices = new Uint32Array(rIndices);

      const rBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const rBody = physicsWorld.world.createRigidBody(rBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.8)
        .setFriction(0.1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const rCollider = physicsWorld.world.createCollider(trimeshDesc, rBody);
      collisionHandler.registerCollider(rCollider.handle, ColliderTag.Rocket, 0);
    }
  }

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
        if (pressed) audio.playFlipperUp();
        else audio.playFlipperDown();
        break;
      case 'rightFlipper':
        table.rightFlipper.setActive(pressed);
        if (pressed) audio.playFlipperUp();
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
        } else {
          table.plunger.release();
          if (!state.isBallInPlay && state.isPlaying) {
            state.launchBall();
            audio.playPlungerRelease();
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
      // Rocket is at x:1.5, z:-1.5 — push ball away from it
      const rocketX = 1.5;
      const rocketZ = -1.5;
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
  const baseCameraPos = sceneManager.camera.position.clone();

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

        // Unstick ball near triangle bompers
        const vel = table.ball.body.linvel();
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const HL = TABLE_LENGTH / 2;
        const inBomperZone = pos.z > (HL - 4.5) && pos.z < (HL - 2.0) && Math.abs(pos.x) > 0.5;
        if (inBomperZone && speed < 0.3 && state.isBallInPlay) {
          // Ball is stuck near triangle bompers - kick it toward center and down
          const pushX = pos.x > 0 ? -1 : 1;
          table.ball.body.setLinvel(
            new RAPIER.Vector3(pushX * 1.0, 0.1, 1.0),
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
        dodoAstronaut.position.y = dodoBaseY + Math.sin(time * 0.8) * 0.15;
      }
      particleSystem.update(1 / 60);

      // Camera shake
      if (shakeIntensity > 0.001) {
        shakeIntensity *= Math.exp(-shakeDecay * (1 / 60));
        sceneManager.camera.position.set(
          baseCameraPos.x + (Math.random() - 0.5) * shakeIntensity,
          baseCameraPos.y + (Math.random() - 0.5) * shakeIntensity,
          baseCameraPos.z + (Math.random() - 0.5) * shakeIntensity,
        );
      } else {
        sceneManager.camera.position.copy(baseCameraPos);
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
  };

  const gameOverScreen = new GameOverScreen(startGame);
  const startScreen = new StartScreen(startGame);

  // Start the game loop (it runs even on title screen for rendering)
  gameLoop.start();

  // Show start screen
  startScreen.show();
}

main().catch(console.error);
