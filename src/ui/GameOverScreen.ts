export class GameOverScreen {
  private overlay: HTMLElement;

  constructor(private onRestart: () => void) {
    this.overlay = document.getElementById('overlay')!;
  }

  show(score: number, highScore: number) {
    this.overlay.className = 'active';
    const isNewHighScore = score >= highScore && score > 0;

    this.overlay.innerHTML = `
      <div class="screen">
        <h1>GAME OVER</h1>
        ${isNewHighScore ? '<h2>NEW HIGH SCORE!</h2>' : ''}
        <div class="final-score">${score.toLocaleString()}</div>
        <div class="high-score">High Score: ${highScore.toLocaleString()}</div>
        <div class="prompt">Press ENTER to play again</div>
      </div>
    `;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        window.removeEventListener('keydown', handler);
        this.overlay.removeEventListener('click', clickHandler);
        this.hide();
        this.onRestart();
      }
    };
    const clickHandler = () => {
      window.removeEventListener('keydown', handler);
      this.overlay.removeEventListener('click', clickHandler);
      this.hide();
      this.onRestart();
    };

    window.addEventListener('keydown', handler);
    this.overlay.addEventListener('click', clickHandler);
  }

  hide() {
    this.overlay.className = '';
    this.overlay.innerHTML = '';
  }
}
