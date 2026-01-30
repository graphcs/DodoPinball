import RAPIER from '@dimforge/rapier3d-compat';
import { GameEvents } from '../game/GameEvents';
import { GameState } from '../game/GameState';
import {
  BUMPER_SCORE,
  SLINGSHOT_SCORE,
  DROP_TARGET_SCORE,
  DROP_TARGET_BANK_BONUS,
  SPINNER_SCORE,
  ROLLOVER_SCORE,
  ROLLOVER_COMPLETE_BONUS,
  RAMP_SCORE,
} from '../game/constants';

export const enum ColliderTag {
  Ball = 1,
  Bumper = 2,
  Slingshot = 3,
  DropTarget = 4,
  Spinner = 5,
  RolloverLane = 6,
  Ramp = 7,
  Drain = 8,
  Flipper = 9,
  Wall = 10,
  Plunger = 11,
}

// Maps collider handles to tags and indices
export class CollisionHandler {
  private colliderTags = new Map<number, { tag: ColliderTag; index: number }>();
  private ballHandle: number | null = null;

  constructor(
    private events: GameEvents,
    private state: GameState,
  ) {}

  registerCollider(handle: number, tag: ColliderTag, index: number = 0) {
    this.colliderTags.set(handle, { tag, index });
  }

  registerBall(handle: number) {
    this.ballHandle = handle;
    this.colliderTags.set(handle, { tag: ColliderTag.Ball, index: 0 });
  }

  processEvents(eventQueue: RAPIER.EventQueue, world: RAPIER.World) {
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return;

      const tag1 = this.colliderTags.get(handle1);
      const tag2 = this.colliderTags.get(handle2);
      if (!tag1 || !tag2) return;

      // Find which is the ball and which is the other
      let ballH: number, otherTag: { tag: ColliderTag; index: number };
      if (tag1.tag === ColliderTag.Ball) {
        ballH = handle1;
        otherTag = tag2;
      } else if (tag2.tag === ColliderTag.Ball) {
        ballH = handle2;
        otherTag = tag1;
      } else {
        return; // Not a ball collision
      }

      this.handleBallCollision(otherTag, world, ballH);
    });
  }

  private handleBallCollision(
    other: { tag: ColliderTag; index: number },
    world: RAPIER.World,
    _ballHandle: number,
  ) {
    switch (other.tag) {
      case ColliderTag.Bumper:
        this.state.addScore(BUMPER_SCORE);
        this.events.emit('bumperHit', { index: other.index });
        break;
      case ColliderTag.Slingshot:
        this.state.addScore(SLINGSHOT_SCORE);
        this.events.emit('slingshotHit', { index: other.index });
        break;
      case ColliderTag.DropTarget:
        this.state.addScore(DROP_TARGET_SCORE);
        this.state.hitDropTarget(other.index);
        this.events.emit('dropTargetHit', { index: other.index });
        if (this.state.dropTargetsHit.size === 0) {
          // Bank was just cleared
          this.state.addScore(DROP_TARGET_BANK_BONUS);
        }
        break;
      case ColliderTag.Spinner:
        this.state.addScore(SPINNER_SCORE);
        this.events.emit('spinnerSpin');
        break;
      case ColliderTag.RolloverLane:
        this.state.addScore(ROLLOVER_SCORE);
        this.state.hitRolloverLane(other.index);
        this.events.emit('rolloverLane', { index: other.index });
        if (this.state.rolloverLanesHit.size === 0) {
          this.state.addScore(ROLLOVER_COMPLETE_BONUS);
        }
        break;
      case ColliderTag.Ramp:
        this.state.addScore(RAMP_SCORE);
        this.events.emit('rampComplete');
        break;
      case ColliderTag.Drain:
        this.state.drainBall();
        break;
    }
  }

  clear() {
    this.colliderTags.clear();
    this.ballHandle = null;
  }
}
