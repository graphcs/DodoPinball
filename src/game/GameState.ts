import {
  INITIAL_BALLS,
  MAX_MULTIPLIER,
  EXTRA_BALL_THRESHOLD,
} from './constants';
import { GameEvents } from './GameEvents';

export class GameState {
  score = 0;
  ballsRemaining = INITIAL_BALLS;
  multiplier = 1;
  isPlaying = false;
  isBallInPlay = false;
  highScore = 0;
  dropTargetsHit = new Set<number>();
  rolloverLanesHit = new Set<number>();
  private nextExtraBallAt = EXTRA_BALL_THRESHOLD;

  constructor(private events: GameEvents) {
    this.loadHighScore();
  }

  startGame() {
    this.score = 0;
    this.ballsRemaining = INITIAL_BALLS;
    this.multiplier = 1;
    this.isPlaying = true;
    this.isBallInPlay = false;
    this.dropTargetsHit.clear();
    this.rolloverLanesHit.clear();
    this.nextExtraBallAt = EXTRA_BALL_THRESHOLD;
    this.events.emit('gameStart');
  }

  addScore(points: number) {
    const earned = points * this.multiplier;
    this.score += earned;
    this.events.emit('scoreChange', { score: this.score, earned });

    if (this.score >= this.nextExtraBallAt) {
      this.ballsRemaining++;
      this.nextExtraBallAt += EXTRA_BALL_THRESHOLD;
      this.events.emit('extraBall');
    }
  }

  increaseMultiplier() {
    if (this.multiplier < MAX_MULTIPLIER) {
      this.multiplier++;
      this.events.emit('multiplierChange', { multiplier: this.multiplier });
    }
  }

  drainBall() {
    this.isBallInPlay = false;
    this.ballsRemaining--;
    this.events.emit('ballDrain', { ballsRemaining: this.ballsRemaining });

    if (this.ballsRemaining <= 0) {
      this.endGame();
    }
  }

  launchBall() {
    this.isBallInPlay = true;
    this.events.emit('ballLaunch');
  }

  private endGame() {
    this.isPlaying = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
    this.events.emit('gameOver', {
      score: this.score,
      highScore: this.highScore,
    });
  }

  hitDropTarget(index: number) {
    this.dropTargetsHit.add(index);
    if (this.dropTargetsHit.size >= 5) {
      this.dropTargetsHit.clear();
      this.increaseMultiplier();
      this.events.emit('dropTargetBankComplete');
    }
  }

  hitRolloverLane(index: number) {
    this.rolloverLanesHit.add(index);
    if (this.rolloverLanesHit.size >= 3) {
      this.rolloverLanesHit.clear();
      this.events.emit('rolloverComplete');
    }
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('pinball-highscore');
      this.highScore = saved ? parseInt(saved, 10) : 0;
    } catch {
      this.highScore = 0;
    }
  }

  private saveHighScore() {
    try {
      localStorage.setItem('pinball-highscore', String(this.highScore));
    } catch {
      // localStorage might be unavailable
    }
  }
}
