export class StartScreen {
  private overlay: HTMLElement;

  constructor(private onStart: () => void) {
    this.overlay = document.getElementById('overlay')!;
  }

  show() {
    this.overlay.className = 'active';
    this.overlay.innerHTML = `
      <div class="screen">
        <h1>3D PINBALL</h1>
        <h2>SPACE CADET</h2>
        <div class="controls">
          <kbd>Z</kbd> Left Flipper &nbsp;&nbsp; <kbd>/</kbd> Right Flipper<br>
          Hold <kbd>Space</kbd> to charge plunger, release to launch<br>
          <br>
          <em>Mobile: Tap left/right for flippers, bottom for plunger</em>
        </div>
        <div class="prompt">Press ENTER to start</div>
      </div>
    `;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        window.removeEventListener('keydown', handler);
        this.overlay.removeEventListener('click', clickHandler);
        this.hide();
        this.onStart();
      }
    };
    const clickHandler = () => {
      window.removeEventListener('keydown', handler);
      this.overlay.removeEventListener('click', clickHandler);
      this.hide();
      this.onStart();
    };

    window.addEventListener('keydown', handler);
    this.overlay.addEventListener('click', clickHandler);
  }

  hide() {
    this.overlay.className = '';
    this.overlay.innerHTML = '';
  }
}
