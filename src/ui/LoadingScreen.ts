export class LoadingScreen {
  private overlay: HTMLElement;
  private progressText: HTMLElement | null = null;

  constructor() {
    this.overlay = document.getElementById('overlay')!;
  }

  show() {
    this.overlay.className = 'active';
    this.overlay.innerHTML = `
      <div class="screen loading-screen">
        <div class="loading-title">LOADING</div>
        <div class="loading-bar-container">
          <div class="loading-bar" id="loading-bar"></div>
        </div>
        <div class="loading-progress" id="loading-progress">0%</div>
      </div>
    `;
    this.progressText = document.getElementById('loading-progress');
  }

  updateProgress(progress: number) {
    const bar = document.getElementById('loading-bar');
    if (bar) {
      bar.style.width = `${progress}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  hide() {
    this.overlay.className = '';
    this.overlay.innerHTML = '';
  }
}
