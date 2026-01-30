import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
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
import { PHYSICS_TIMESTEP, BUMPER_IMPULSE, SLINGSHOT_IMPULSE, BALL_RADIUS } from './game/constants';
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

  // ---- Build Table ----
  const table = buildTable(
    physicsWorld.world,
    sceneManager.scene,
    materials,
    lighting,
    collisionHandler,
  );

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
          y: 0.5,
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

      // Check if ball fell off table
      if (table.ball.body) {
        const pos = table.ball.body.translation();
        if (pos.y < -5) {
          // Ball fell through - drain it
          if (state.isBallInPlay) {
            state.drainBall();
          }
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
