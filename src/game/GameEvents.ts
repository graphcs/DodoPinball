export type GameEventType =
  | 'bumperHit'
  | 'slingshotHit'
  | 'dropTargetHit'
  | 'dropTargetBankComplete'
  | 'spinnerSpin'
  | 'rolloverLane'
  | 'rolloverComplete'
  | 'rampComplete'
  | 'ballDrain'
  | 'ballLaunch'
  | 'scoreChange'
  | 'multiplierChange'
  | 'extraBall'
  | 'gameOver'
  | 'gameStart'
  | 'triangleBomperHit'
  | 'rocketHit'
  | 'archHit';

export interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

type Listener = (event: GameEvent) => void;

export class GameEvents {
  private listeners = new Map<GameEventType, Listener[]>();

  on(type: GameEventType, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  off(type: GameEventType, listener: Listener) {
    const list = this.listeners.get(type);
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(type: GameEventType, data?: Record<string, unknown>) {
    const event: GameEvent = { type, data };
    const list = this.listeners.get(type);
    if (list) {
      for (const listener of list) {
        listener(event);
      }
    }
  }
}
