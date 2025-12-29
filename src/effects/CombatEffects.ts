export class CombatEffects {
  private screenShakeAmount = 0;
  private screenShakeDecay = 10;

  constructor() {
    this.createHitMarkerElement();
    this.createKillPopupContainer();
  }

  private createHitMarkerElement(): void {
    const hitMarker = document.createElement('div');
    hitMarker.id = 'hit-marker';
    hitMarker.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 30 30">
        <line x1="8" y1="8" x2="12" y2="12" stroke="white" stroke-width="2"/>
        <line x1="22" y1="8" x2="18" y2="12" stroke="white" stroke-width="2"/>
        <line x1="8" y1="22" x2="12" y2="18" stroke="white" stroke-width="2"/>
        <line x1="22" y1="22" x2="18" y2="18" stroke="white" stroke-width="2"/>
      </svg>
    `;
    hitMarker.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s;
    `;
    document.body.appendChild(hitMarker);
  }

  private createKillPopupContainer(): void {
    const container = document.createElement('div');
    container.id = 'kill-popup-container';
    container.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    `;
    document.body.appendChild(container);
  }

  public showHitMarker(isHeadshot: boolean = false): void {
    const hitMarker = document.getElementById('hit-marker');
    if (!hitMarker) return;

    const svg = hitMarker.querySelector('svg');
    if (svg) {
      const lines = svg.querySelectorAll('line');
      lines.forEach(line => {
        line.setAttribute('stroke', isHeadshot ? '#ff4444' : 'white');
      });
    }

    hitMarker.style.opacity = '1';
    hitMarker.style.transform = 'translate(-50%, -50%) scale(1.2)';
    
    setTimeout(() => {
      hitMarker.style.opacity = '0';
      hitMarker.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
  }

  public showKillPopup(points: number, isHeadshot: boolean = false): void {
    const container = document.getElementById('kill-popup-container');
    if (!container) return;

    const popup = document.createElement('div');
    popup.style.cssText = `
      font-family: 'Arial Black', sans-serif;
      font-size: ${isHeadshot ? '28px' : '24px'};
      font-weight: bold;
      color: ${isHeadshot ? '#ff4444' : '#ffffff'};
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      animation: killPopup 1.5s ease-out forwards;
    `;
    popup.textContent = isHeadshot ? `+${points} HEADSHOT!` : `+${points}`;
    
    container.appendChild(popup);

    // Add animation keyframes if not exists
    if (!document.getElementById('kill-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'kill-popup-styles';
      style.textContent = `
        @keyframes killPopup {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => popup.remove(), 1500);
  }

  public triggerScreenShake(amount: number = 0.5): void {
    this.screenShakeAmount = amount;
  }

  public updateScreenShake(delta: number): { x: number; y: number } {
    if (this.screenShakeAmount > 0.01) {
      this.screenShakeAmount -= this.screenShakeDecay * delta;
      return {
        x: (Math.random() - 0.5) * this.screenShakeAmount * 0.02,
        y: (Math.random() - 0.5) * this.screenShakeAmount * 0.02
      };
    }
    this.screenShakeAmount = 0;
    return { x: 0, y: 0 };
  }

  public createBloodSplatter(x: number, y: number): void {
    const splatter = document.createElement('div');
    splatter.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 10px;
      height: 10px;
      background: radial-gradient(circle, #ff0000 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 50;
      animation: bloodFade 0.5s ease-out forwards;
    `;
    document.body.appendChild(splatter);

    if (!document.getElementById('blood-styles')) {
      const style = document.createElement('style');
      style.id = 'blood-styles';
      style.textContent = `
        @keyframes bloodFade {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => splatter.remove(), 500);
  }

  public flashDamageOverlay(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, transparent 0%, rgba(255,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 99;
      animation: damageFlash 0.3s ease-out forwards;
    `;
    document.body.appendChild(overlay);

    if (!document.getElementById('damage-styles')) {
      const style = document.createElement('style');
      style.id = 'damage-styles';
      style.textContent = `
        @keyframes damageFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => overlay.remove(), 300);
  }
}
