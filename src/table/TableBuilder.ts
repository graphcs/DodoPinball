import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TableLayout } from './TableLayout';
import { Materials } from '../rendering/Materials';
import { Lighting } from '../rendering/Lighting';
import { Ball } from '../entities/Ball';
import { Flipper } from '../entities/Flipper';
import { Plunger } from '../entities/Plunger';
import { Bumper } from '../entities/Bumper';
import { Slingshot } from '../entities/Slingshot';
import { DropTarget } from '../entities/DropTarget';
import { Spinner } from '../entities/Spinner';
import { RolloverLane } from '../entities/RolloverLane';
import { Ramp } from '../entities/Ramp';
import { Wall } from '../entities/Wall';
import { CollisionHandler, ColliderTag } from '../physics/CollisionHandler';

export interface TableEntities {
  ball: Ball;
  leftFlipper: Flipper;
  rightFlipper: Flipper;
  plunger: Plunger;
  bumpers: Bumper[];
  slingshots: Slingshot[];
  dropTargets: DropTarget[];
  spinner: Spinner;
  rolloverLanes: RolloverLane[];
  ramp: Ramp;
  walls: Wall[];
  drainSensor: Wall;
}

export function buildTable(
  world: RAPIER.World,
  scene: THREE.Scene,
  materials: Materials,
  lighting: Lighting,
  collisionHandler: CollisionHandler,
): TableEntities {
  const layout = TableLayout;

  // ---- Playfield ----
  const playfieldGeo = new THREE.BoxGeometry(
    layout.playfield.halfExtents.x * 2,
    layout.playfield.halfExtents.y * 2,
    layout.playfield.halfExtents.z * 2,
  );
  const playfieldMat = materials.playfield();
  const playfieldMesh = new THREE.Mesh(playfieldGeo, playfieldMat);
  playfieldMesh.position.set(
    layout.playfield.position.x,
    layout.playfield.position.y,
    layout.playfield.position.z,
  );
  playfieldMesh.receiveShadow = true;
  scene.add(playfieldMesh);

  // Playfield physics
  const pfBody = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(layout.playfield.position.x, layout.playfield.position.y, layout.playfield.position.z);
  const pfRb = world.createRigidBody(pfBody);
  const pfCollider = RAPIER.ColliderDesc.cuboid(
    layout.playfield.halfExtents.x,
    layout.playfield.halfExtents.y,
    layout.playfield.halfExtents.z,
  ).setRestitution(0.2).setFriction(0.4);
  world.createCollider(pfCollider, pfRb);

  // ---- Walls ----
  const wallMat = materials.wood();
  const walls: Wall[] = [];

  for (const w of layout.walls) {
    const wall = new Wall(
      world,
      scene,
      wallMat,
      { x: w.pos.x, y: w.pos.y, z: w.pos.z },
      w.half,
      w.rot,
    );
    walls.push(wall);
    collisionHandler.registerCollider(wall.getColliderHandle(), ColliderTag.Wall);
  }

  // ---- Drain Sensor ----
  const drainMat = new THREE.MeshBasicMaterial({ visible: false });
  const drainSensor = new Wall(
    world,
    scene,
    drainMat,
    layout.drain.position,
    layout.drain.halfExtents,
    undefined,
    true, // isSensor
    false, // not visible
  );
  collisionHandler.registerCollider(drainSensor.getColliderHandle(), ColliderTag.Drain);

  // ---- Ball ----
  const ball = new Ball(world, scene, materials, layout.ballStart);
  collisionHandler.registerBall(ball.getColliderHandle());

  // ---- Flippers ----
  const leftFlipper = new Flipper(
    world, scene, materials,
    layout.flippers.left.x, layout.flippers.left.z, true,
  );
  collisionHandler.registerCollider(leftFlipper.getColliderHandle(), ColliderTag.Flipper);

  const rightFlipper = new Flipper(
    world, scene, materials,
    layout.flippers.right.x, layout.flippers.right.z, false,
  );
  collisionHandler.registerCollider(rightFlipper.getColliderHandle(), ColliderTag.Flipper);

  // ---- Plunger ----
  const plunger = new Plunger(
    world, scene, materials,
    layout.plunger.x, layout.plunger.z,
  );
  plunger.setReleaseCallback((speed) => {
    // Set ball velocity directly for reliable launch
    if (ball.body) {
      ball.body.setLinvel(new RAPIER.Vector3(0, 1, -speed), true);
    }
  });

  // ---- Bumpers ----
  const bumpers: Bumper[] = [];
  layout.bumpers.forEach((b, i) => {
    const bumper = new Bumper(world, scene, materials, b.x, b.z, b.color);
    const light = lighting.createBumperLight(new THREE.Vector3(b.x, 0.5, b.z));
    scene.add(light);
    bumper.setLight(light);
    bumpers.push(bumper);
    collisionHandler.registerCollider(bumper.getColliderHandle(), ColliderTag.Bumper, i);
  });

  // ---- Slingshots ----
  const slingshots: Slingshot[] = [];
  const leftSlingVerts = layout.slingshots.left.map(
    (v) => new THREE.Vector3(v.x, 0, v.z),
  ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const leftSling = new Slingshot(world, scene, materials, leftSlingVerts, true);
  slingshots.push(leftSling);
  collisionHandler.registerCollider(leftSling.getColliderHandle(), ColliderTag.Slingshot, 0);

  const rightSlingVerts = layout.slingshots.right.map(
    (v) => new THREE.Vector3(v.x, 0, v.z),
  ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const rightSling = new Slingshot(world, scene, materials, rightSlingVerts, false);
  slingshots.push(rightSling);
  collisionHandler.registerCollider(rightSling.getColliderHandle(), ColliderTag.Slingshot, 1);

  // ---- Drop Targets ----
  const dropTargets: DropTarget[] = [];
  layout.dropTargets.forEach((dt, i) => {
    const target = new DropTarget(world, scene, materials, dt.x, dt.z);
    dropTargets.push(target);
    collisionHandler.registerCollider(target.getColliderHandle(), ColliderTag.DropTarget, i);
  });

  // ---- Spinner ----
  const spinner = new Spinner(
    world, scene, materials,
    layout.spinner.x, layout.spinner.z,
  );
  collisionHandler.registerCollider(spinner.getColliderHandle(), ColliderTag.Spinner);

  // ---- Rollover Lanes ----
  const rolloverLanes: RolloverLane[] = [];
  layout.rolloverLanes.forEach((rl, i) => {
    const lane = new RolloverLane(world, scene, materials, rl.x, rl.z);
    rolloverLanes.push(lane);
    collisionHandler.registerCollider(lane.getColliderHandle(), ColliderTag.RolloverLane, i);
  });

  // ---- Ramp ----
  const ramp = new Ramp(
    world, scene, materials,
    layout.ramp.startX, layout.ramp.startZ,
    layout.ramp.endX, layout.ramp.endZ,
    layout.ramp.height,
  );
  collisionHandler.registerCollider(ramp.getColliderHandle(), ColliderTag.Ramp);

  // ---- Decorative elements ----
  addTableDecorations(scene, materials);

  return {
    ball,
    leftFlipper,
    rightFlipper,
    plunger,
    bumpers,
    slingshots,
    dropTargets,
    spinner,
    rolloverLanes,
    ramp,
    walls,
    drainSensor,
  };
}

function addTableDecorations(scene: THREE.Scene, materials: Materials) {
  // Side cabinet trim
  const trimGeo = new THREE.BoxGeometry(0.05, 0.8, 10);
  const trimMat = materials.wood();

  const leftTrim = new THREE.Mesh(trimGeo, trimMat);
  leftTrim.position.set(-2.6, 0.1, 0);
  scene.add(leftTrim);

  const rightTrim = new THREE.Mesh(trimGeo, trimMat);
  rightTrim.position.set(2.6, 0.1, 0);
  scene.add(rightTrim);

  // Table art dots (decorative circles on playfield)
  const dotGeo = new THREE.CircleGeometry(0.05, 16);
  const dotMat = materials.emissive(0xffd700, 0.5);
  const dotPositions = [
    [-1.0, -1.5], [1.0, -1.5],
    [-1.5, 0.0], [1.5, 0.0],
    [-0.3, -3.5], [0.3, -3.5],
  ];

  for (const [x, z] of dotPositions) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(x, 0.01, z);
    scene.add(dot);
  }
}
