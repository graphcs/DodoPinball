import { GameEvents } from '../game/GameEvents';
import { GameState } from '../game/GameState';

export class HUD {
  private container: HTMLElement;
  private scoreEl: HTMLElement;
  private ballsEl: HTMLElement;
  private multiplierEl: HTMLElement;

  constructor(
    private state: GameState,
    private events: GameEvents,
  ) {
    this.container = document.getElementById('hud')!;

    const bar = document.createElement('div');
    bar.className = 'hud-bar';

    this.ballsEl = document.createElement('div');
    this.ballsEl.className = 'hud-item';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-item hud-score';

    this.multiplierEl = document.createElement('div');
    this.multiplierEl.className = 'hud-item hud-multiplier';

    bar.appendChild(this.ballsEl);
    bar.appendChild(this.scoreEl);
    bar.appendChild(this.multiplierEl);
    this.container.appendChild(bar);

    this.updateDisplay();

    this.events.on('scoreChange', () => this.updateDisplay());
    this.events.on('multiplierChange', () => this.updateDisplay());
    this.events.on('ballDrain', () => this.updateDisplay());
    this.events.on('extraBall', () => this.updateDisplay());
    this.events.on('gameStart', () => this.updateDisplay());
  }

  private updateDisplay() {
    this.scoreEl.textContent = this.state.score.toLocaleString();
    this.ballsEl.textContent = `BALL ${'●'.repeat(this.state.ballsRemaining)}`;
    this.multiplierEl.textContent = `${this.state.multiplier}X`;
  }

  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }
}
