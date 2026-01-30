export type InputAction = 'leftFlipper' | 'rightFlipper' | 'plunger' | 'start';

type InputCallback = (action: InputAction, pressed: boolean) => void;

export class InputManager {
  private callbacks: InputCallback[] = [];
  private keys = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  onInput(callback: InputCallback) {
    this.callbacks.push(callback);
  }

  isPressed(action: InputAction): boolean {
    switch (action) {
      case 'leftFlipper':
        return this.keys.has('z') || this.keys.has('Z');
      case 'rightFlipper':
        return this.keys.has('/');
      case 'plunger':
        return this.keys.has(' ');
      case 'start':
        return this.keys.has('Enter');
      default:
        return false;
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.keys.has(e.key)) return; // Ignore repeats
    this.keys.add(e.key);

    const action = this.keyToAction(e.key);
    if (action) {
      e.preventDefault();
      this.emit(action, true);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);

    const action = this.keyToAction(e.key);
    if (action) {
      e.preventDefault();
      this.emit(action, false);
    }
  };

  private keyToAction(key: string): InputAction | null {
    switch (key) {
      case 'z':
      case 'Z':
        return 'leftFlipper';
      case '/':
        return 'rightFlipper';
      case ' ':
        return 'plunger';
      case 'Enter':
        return 'start';
      default:
        return null;
    }
  }

  private emit(action: InputAction, pressed: boolean) {
    for (const cb of this.callbacks) {
      cb(action, pressed);
    }
  }

  setupTouch(canvas: HTMLCanvasElement) {
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  private activeTouches = new Map<number, InputAction>();

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      let action: InputAction;
      if (y > h * 0.8) {
        action = 'plunger';
      } else if (x < w / 2) {
        action = 'leftFlipper';
      } else {
        action = 'rightFlipper';
      }

      this.activeTouches.set(touch.identifier, action);
      this.emit(action, true);
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const action = this.activeTouches.get(touch.identifier);
      if (action) {
        this.activeTouches.delete(touch.identifier);
        this.emit(action, false);
      }
    }
  };

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
