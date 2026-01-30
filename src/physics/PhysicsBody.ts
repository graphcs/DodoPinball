import RAPIER from '@dimforge/rapier3d-compat';

export interface BodyOptions {
  position: { x: number; y: number; z: number };
  restitution?: number;
  friction?: number;
  mass?: number;
  linearDamping?: number;
  angularDamping?: number;
  ccdEnabled?: boolean;
  isSensor?: boolean;
  userData?: number;
}

export function createBallBody(
  world: RAPIER.World,
  radius: number,
  opts: BodyOptions,
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(opts.position.x, opts.position.y, opts.position.z)
    .setLinearDamping(opts.linearDamping ?? 0.3)
    .setAngularDamping(opts.angularDamping ?? 0.1)
    .setCcdEnabled(opts.ccdEnabled ?? true);

  const body = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.ball(radius)
    .setRestitution(opts.restitution ?? 0.4)
    .setFriction(opts.friction ?? 0.2)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    .setContactForceEventThreshold(0.1);

  if (opts.mass !== undefined) {
    colliderDesc.setMass(opts.mass);
  }

  const collider = world.createCollider(colliderDesc, body);
  if (opts.userData !== undefined) {
    collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  }

  return body;
}

export function createBoxBody(
  world: RAPIER.World,
  halfExtents: { x: number; y: number; z: number },
  opts: BodyOptions & { type?: 'static' | 'kinematic' | 'dynamic' },
): RAPIER.RigidBody {
  let bodyDesc: RAPIER.RigidBodyDesc;

  switch (opts.type ?? 'static') {
    case 'dynamic':
      bodyDesc = RAPIER.RigidBodyDesc.dynamic();
      break;
    case 'kinematic':
      bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
      break;
    default:
      bodyDesc = RAPIER.RigidBodyDesc.fixed();
  }

  bodyDesc.setTranslation(opts.position.x, opts.position.y, opts.position.z);

  if (opts.linearDamping !== undefined) bodyDesc.setLinearDamping(opts.linearDamping);
  if (opts.angularDamping !== undefined) bodyDesc.setAngularDamping(opts.angularDamping);
  if (opts.ccdEnabled) bodyDesc.setCcdEnabled(true);

  const body = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    halfExtents.x,
    halfExtents.y,
    halfExtents.z,
  )
    .setRestitution(opts.restitution ?? 0.3)
    .setFriction(opts.friction ?? 0.5)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

  if (opts.isSensor) {
    colliderDesc.setSensor(true);
  }

  if (opts.mass !== undefined) {
    colliderDesc.setMass(opts.mass);
  }

  world.createCollider(colliderDesc, body);

  return body;
}

export function createCylinderBody(
  world: RAPIER.World,
  radius: number,
  halfHeight: number,
  opts: BodyOptions,
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(opts.position.x, opts.position.y, opts.position.z);

  const body = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
    .setRestitution(opts.restitution ?? 0.8)
    .setFriction(opts.friction ?? 0.2)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

  if (opts.isSensor) {
    colliderDesc.setSensor(true);
  }

  world.createCollider(colliderDesc, body);

  return body;
}
