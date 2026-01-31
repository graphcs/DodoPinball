import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TableLayout } from './TableLayout';
import { TABLE_LENGTH, TABLE_WIDTH, LAUNCH_LANE_X } from '../game/constants';
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
  flipperModel?: THREE.Group,
  launchPathModel?: THREE.Group,
  playfieldModel?: THREE.Group,
  buildingsModel?: THREE.Group,
  bumperModels?: (THREE.Group | undefined)[],
  triangleBomperModel?: THREE.Group,
): TableEntities {
  const layout = TableLayout;

  // ---- Launch Path Model ----
  if (launchPathModel) {
    const lp = launchPathModel.clone();
    lp.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Compute bounding box to determine the model's native size
    const box = new THREE.Box3().setFromObject(lp);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Scale to fit the table height, slightly smaller
    const targetHeight = TABLE_LENGTH * 0.839;
    const uniformScale = targetHeight / (size.z || size.y || size.x || 1);
    lp.scale.setScalar(uniformScale);

    // Recompute after scaling
    const scaledBox = new THREE.Box3().setFromObject(lp);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    // Position so the ball start (LAUNCH_LANE_X) is on top of the launch path
    lp.position.set(
      layout.ballStart.x - scaledCenter.x - 0.65,
      -scaledBox.min.y + 0.15, // raised above the playfield surface
      -scaledCenter.z - 0.6,  // center along table length, shifted up
    );
    scene.add(lp);

    // Update world matrices so we can extract world-space geometry
    lp.updateMatrixWorld(true);

    // Extract triangle mesh from all child meshes for physics collider
    const allVertices: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    lp.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      // Transform each vertex to world space
      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        allVertices.push(vertex.x, vertex.y, vertex.z);
      }

      // Collect indices (or generate them for non-indexed geometry)
      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          allIndices.push(geo.index.array[i] + vertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          allIndices.push(i + vertexOffset);
        }
      }

      vertexOffset += posAttr.count;
    });

    // Create trimesh physics collider matching the model shape
    if (allVertices.length > 0 && allIndices.length > 0) {
      const vertices = new Float32Array(allVertices);
      const indices = new Uint32Array(allIndices);

      const lpBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const lpBody = world.createRigidBody(lpBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.3)
        .setFriction(0.5);
      world.createCollider(trimeshDesc, lpBody);
    }
  }

  // ---- Playfield surface (invisible physics floor) ----
  const pfBody = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(layout.playfield.position.x, layout.playfield.position.y, layout.playfield.position.z);
  const pfRb = world.createRigidBody(pfBody);
  const pfCollider = RAPIER.ColliderDesc.cuboid(
    layout.playfield.halfExtents.x,
    layout.playfield.halfExtents.y,
    layout.playfield.halfExtents.z,
  ).setRestitution(0.2).setFriction(0.4);
  world.createCollider(pfCollider, pfRb);

  // ---- Playfield Model (boundary walls) ----
  const walls: Wall[] = [];
  if (playfieldModel) {
    const pf = playfieldModel.clone();

    // Replace FBX materials with transparent navy blue sheen
    const navyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1e3d,
      side: THREE.DoubleSide,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    pf.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = navyMat;
      }
    });

    // Compute bounding box to determine the model's native size
    const pfBox = new THREE.Box3().setFromObject(pf);
    const pfSize = new THREE.Vector3();
    pfBox.getSize(pfSize);
    const pfCenter = new THREE.Vector3();
    pfBox.getCenter(pfCenter);

    // FBX models are often very large (in cm units). Determine the largest dimension.
    const maxDim = Math.max(pfSize.x, pfSize.y, pfSize.z);
    // Scale so the largest dimension maps to TABLE_LENGTH
    const uniformScale = TABLE_LENGTH / (maxDim || 1);
    pf.scale.setScalar(uniformScale);

    // Recompute after scaling
    const scaledBox = new THREE.Box3().setFromObject(pf);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    const scaledSize = new THREE.Vector3();
    scaledBox.getSize(scaledSize);

    // Center the model on the table, sitting on the playfield surface
    pf.position.set(
      -scaledCenter.x,
      -scaledBox.min.y,
      -scaledCenter.z,
    );
    scene.add(pf);


    // Extract trimesh colliders from the playfield model
    pf.updateMatrixWorld(true);

    const pfVertices: number[] = [];
    const pfIndices: number[] = [];
    let pfVertexOffset = 0;

    pf.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        pfVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          pfIndices.push(geo.index.array[i] + pfVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          pfIndices.push(i + pfVertexOffset);
        }
      }

      pfVertexOffset += posAttr.count;
    });

    if (pfVertices.length > 0 && pfIndices.length > 0) {
      console.log('Playfield trimesh:', pfVertices.length / 3, 'vertices,', pfIndices.length / 3, 'triangles');
      const vertices = new Float32Array(pfVertices);
      const indices = new Uint32Array(pfIndices);

      const pfTrimeshBody = RAPIER.RigidBodyDesc.fixed();
      const pfTrimeshRb = world.createRigidBody(pfTrimeshBody);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.3)
        .setFriction(0.5);
      world.createCollider(trimeshDesc, pfTrimeshRb);
    }
  } else {
    console.warn('No playfield model loaded, walls will be missing');
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
    flipperModel,
  );
  collisionHandler.registerCollider(leftFlipper.getColliderHandle(), ColliderTag.Flipper);

  const rightFlipper = new Flipper(
    world, scene, materials,
    layout.flippers.right.x, layout.flippers.right.z, false,
    flipperModel,
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
      ball.body.setLinvel(new RAPIER.Vector3(0, 0.3, -speed), true);
    }
  });

  // ---- Bumpers ----
  const bumpers: Bumper[] = [];
  layout.bumpers.forEach((b, i) => {
    const bumper = new Bumper(world, scene, materials, b.x, b.z, b.color, bumperModels?.[i]);
    const light = lighting.createBumperLight(new THREE.Vector3(b.x, 0.5, b.z));
    scene.add(light);
    bumper.setLight(light);
    bumpers.push(bumper);
    collisionHandler.registerCollider(bumper.getColliderHandle(), ColliderTag.Bumper, i);
  });

  // ---- Triangle Bompers ----
  if (triangleBomperModel) {
    const tb = triangleBomperModel.clone();

    // Keep original materials, fix rendering
    tb.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.visible = true;
          }
        });
      }
    });

    // Scale to fit the table
    const tbBox = new THREE.Box3().setFromObject(tb);
    const tbSize = new THREE.Vector3();
    tbBox.getSize(tbSize);
    const tbCenter = new THREE.Vector3();
    tbBox.getCenter(tbCenter);

    const maxDim = Math.max(tbSize.x, tbSize.y, tbSize.z);
    const tbScale = (TABLE_WIDTH * 0.691) / (maxDim || 1);
    tb.scale.setScalar(tbScale);

    // Recompute after scaling
    const scaledTbBox = new THREE.Box3().setFromObject(tb);
    const scaledTbCenter = new THREE.Vector3();
    scaledTbBox.getCenter(scaledTbCenter);

    // Position above the flippers
    const HL = TABLE_LENGTH / 2;
    tb.position.set(
      -scaledTbCenter.x,
      -scaledTbBox.min.y,
      -scaledTbCenter.z + HL - 3.5,
    );
    scene.add(tb);

    // Add trimesh colliders with bounce
    tb.updateMatrixWorld(true);

    const tbVertices: number[] = [];
    const tbIndices: number[] = [];
    let tbVertexOffset = 0;

    tb.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        tbVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          tbIndices.push(geo.index.array[i] + tbVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          tbIndices.push(i + tbVertexOffset);
        }
      }

      tbVertexOffset += posAttr.count;
    });

    if (tbVertices.length > 0 && tbIndices.length > 0) {
      const vertices = new Float32Array(tbVertices);
      const indices = new Uint32Array(tbIndices);

      const tbBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const tbBody = world.createRigidBody(tbBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.8)
        .setFriction(0.1)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const tbCollider = world.createCollider(trimeshDesc, tbBody);
      collisionHandler.registerCollider(tbCollider.handle, ColliderTag.TriangleBomper, 0);
    }

    // Add lights for each triangle bomper (left and right)
    const tbLeftLight = new THREE.PointLight(0xff4400, 0, 3);
    tbLeftLight.position.set(-1.2, 0.5, HL - 3.5);
    scene.add(tbLeftLight);

    const tbRightLight = new THREE.PointLight(0xff4400, 0, 3);
    tbRightLight.position.set(1.2, 0.5, HL - 3.5);
    scene.add(tbRightLight);

    // Store references for event handling
    (scene as any)._triangleBomperLights = [tbLeftLight, tbRightLight];
    (scene as any)._triangleBomperGroup = tb;
  }

  // ---- Slingshots (disabled) ----
  const slingshots: Slingshot[] = [];

  // ---- Drop Targets (disabled) ----
  const dropTargets: DropTarget[] = [];

  // ---- Spinner (disabled) ----
  const spinner = new Spinner(
    world, scene, materials,
    0, -100, // off-screen
  );

  // ---- Rollover Lanes (disabled) ----
  const rolloverLanes: RolloverLane[] = [];

  // ---- Ramp (disabled) ----
  const ramp = new Ramp(
    world, scene, materials,
    0, -100, 0, -100, 0, // off-screen
  );

  // ---- Buildings (back of table) ----
  if (buildingsModel) {
    const bldg = buildingsModel.clone();
    bldg.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Fix FBX material issues: ensure double-sided and visible
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.visible = true;
            // Lighten orange/red materials
            if ((mat as THREE.MeshStandardMaterial).color) {
              const c = (mat as THREE.MeshStandardMaterial).color;
              if (c.r > 0.4 && c.g < 0.4) {
                c.lerp(new THREE.Color(1, 1, 1), 0.05);
              }
              // Add glow to blue materials
              const stdMat = mat as THREE.MeshStandardMaterial;
              if (c.b > 0.3 && c.r < 0.3 && c.g < 0.5) {
                stdMat.emissive = new THREE.Color(c.r, c.g, c.b);
                stdMat.emissiveIntensity = 0.5;
              }
            }
          }
        });
      }
    });

    const bldgBox = new THREE.Box3().setFromObject(bldg);
    const bldgSize = new THREE.Vector3();
    bldgBox.getSize(bldgSize);
    const bldgCenter = new THREE.Vector3();
    bldgBox.getCenter(bldgCenter);

    // Scale to fit the table width
    const maxDim = Math.max(bldgSize.x, bldgSize.y, bldgSize.z);
    const bldgScale = TABLE_WIDTH / (maxDim || 1);
    bldg.scale.setScalar(bldgScale);

    // Recompute after scaling
    const scaledBldgBox = new THREE.Box3().setFromObject(bldg);
    const scaledBldgCenter = new THREE.Vector3();
    scaledBldgBox.getCenter(scaledBldgCenter);

    // Position at the back (top / -Z end) of the table
    const HL = TABLE_LENGTH / 2;
    bldg.position.set(
      -scaledBldgCenter.x,
      -scaledBldgBox.min.y,
      -HL - scaledBldgCenter.z,
    );
    scene.add(bldg);

    // Extract trimesh colliders from the buildings model
    bldg.updateMatrixWorld(true);

    const bldgVertices: number[] = [];
    const bldgIndices: number[] = [];
    let bldgVertexOffset = 0;

    bldg.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (!posAttr) return;

      const vertex = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        vertex.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        mesh.localToWorld(vertex);
        bldgVertices.push(vertex.x, vertex.y, vertex.z);
      }

      if (geo.index) {
        for (let i = 0; i < geo.index.count; i++) {
          bldgIndices.push(geo.index.array[i] + bldgVertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          bldgIndices.push(i + bldgVertexOffset);
        }
      }

      bldgVertexOffset += posAttr.count;
    });

    if (bldgVertices.length > 0 && bldgIndices.length > 0) {
      const vertices = new Float32Array(bldgVertices);
      const indices = new Uint32Array(bldgIndices);

      const bldgBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const bldgBody = world.createRigidBody(bldgBodyDesc);

      const trimeshDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setRestitution(0.5)
        .setFriction(0.3);
      world.createCollider(trimeshDesc, bldgBody);
    }
  }

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
