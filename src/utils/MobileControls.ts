export class MobileControls {
  private container: HTMLDivElement;
  private joystickBase: HTMLDivElement;
  private joystickThumb: HTMLDivElement;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };
  private joystickTouchId: number | null = null;
  
  // Movement values (-1 to 1)
  public moveX = 0;
  public moveY = 0;
  
  // Look values (delta per frame)
  public lookX = 0;
  public lookY = 0;
  
  // Action buttons
  public shootPressed = false;
  public aimPressed = false;
  public jumpPressed = false;
  public reloadPressed = false;
  public interactPressed = false;
  
  private lookTouchId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;
  
  public static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || ('ontouchstart' in window)
      || (navigator.maxTouchPoints > 0);
  }

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mobile-controls';
    this.container.innerHTML = this.getHTML();
    document.body.appendChild(this.container);
    
    this.addStyles();
    
    this.joystickBase = document.getElementById('joystick-base') as HTMLDivElement;
    this.joystickThumb = document.getElementById('joystick-thumb') as HTMLDivElement;
    
    this.setupJoystick();
    this.setupLookArea();
    this.setupActionButtons();
    
    // Hide on desktop
    if (!MobileControls.isMobile()) {
      this.container.style.display = 'none';
    }
  }
  
  private getHTML(): string {
    return `
      <!-- Left side: Movement joystick -->
      <div id="joystick-container">
        <div id="joystick-base">
          <div id="joystick-thumb"></div>
        </div>
      </div>
      
      <!-- Right side: Look area (invisible, covers right half) -->
      <div id="look-area"></div>
      
      <!-- Right side: Action buttons -->
      <div id="action-buttons">
        <button id="btn-shoot" class="action-btn shoot-btn">
          <span class="btn-icon">🔫</span>
        </button>
        <button id="btn-aim" class="action-btn aim-btn">
          <span class="btn-icon">🎯</span>
        </button>
        <button id="btn-jump" class="action-btn jump-btn">
          <span class="btn-icon">⬆</span>
        </button>
        <button id="btn-reload" class="action-btn reload-btn">
          <span class="btn-icon">🔄</span>
        </button>
        <button id="btn-interact" class="action-btn interact-btn">
          <span class="btn-icon">E</span>
        </button>
      </div>
    `;
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #mobile-controls {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
        touch-action: none;
      }
      
      #joystick-container {
        position: absolute;
        bottom: 30px;
        left: 30px;
        width: 150px;
        height: 150px;
        pointer-events: auto;
        touch-action: none;
      }
      
      #joystick-base {
        position: absolute;
        width: 130px;
        height: 130px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #joystick-thumb {
        width: 60px;
        height: 60px;
        background: radial-gradient(circle, rgba(255,80,80,0.8) 0%, rgba(255,60,60,0.6) 100%);
        border: 2px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(255,80,80,0.5);
        transition: transform 0.05s ease-out;
      }
      
      #look-area {
        position: absolute;
        top: 0;
        right: 0;
        width: 50%;
        height: 70%;
        pointer-events: auto;
        touch-action: none;
      }
      
      #action-buttons {
        position: absolute;
        bottom: 30px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        pointer-events: auto;
      }
      
      .action-btn {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.4);
        background: rgba(0,0,0,0.5);
        color: #fff;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.1s ease;
      }
      
      .action-btn:active, .action-btn.pressed {
        transform: scale(0.9);
        background: rgba(255,80,80,0.6);
        border-color: rgba(255,80,80,0.8);
        box-shadow: 0 0 20px rgba(255,80,80,0.5);
      }
      
      .shoot-btn {
        width: 90px;
        height: 90px;
        background: rgba(255,60,60,0.3);
        border-color: rgba(255,80,80,0.6);
      }
      
      .aim-btn {
        position: absolute;
        bottom: 50px;
        right: 110px;
        width: 60px;
        height: 60px;
      }
      
      .jump-btn {
        position: absolute;
        bottom: 130px;
        right: 100px;
        width: 55px;
        height: 55px;
      }
      
      .reload-btn {
        position: absolute;
        bottom: 190px;
        right: 30px;
        width: 50px;
        height: 50px;
        font-size: 18px;
      }
      
      .interact-btn {
        position: absolute;
        bottom: 190px;
        right: 90px;
        width: 50px;
        height: 50px;
        font-size: 16px;
        font-weight: bold;
      }
      
      .btn-icon {
        pointer-events: none;
      }
      
      /* Landscape adjustments */
      @media (orientation: landscape) and (max-height: 500px) {
        #joystick-container {
          bottom: 15px;
          left: 15px;
        }
        
        #joystick-base {
          width: 100px;
          height: 100px;
        }
        
        #joystick-thumb {
          width: 45px;
          height: 45px;
        }
        
        .action-btn {
          width: 55px;
          height: 55px;
          font-size: 18px;
        }
        
        .shoot-btn {
          width: 70px;
          height: 70px;
        }
        
        #action-buttons {
          bottom: 15px;
          right: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  private setupJoystick(): void {
    const base = this.joystickBase;
    const thumb = this.joystickThumb;
    const maxDistance = 35;
    
    const handleStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      this.joystickActive = true;
      
      const rect = base.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    };
    
    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.joystickTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      
      if (!touch) return;
      
      const deltaX = touch.clientX - this.joystickCenter.x;
      const deltaY = touch.clientY - this.joystickCenter.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      let thumbX = deltaX;
      let thumbY = deltaY;
      
      if (distance > maxDistance) {
        thumbX = (deltaX / distance) * maxDistance;
        thumbY = (deltaY / distance) * maxDistance;
      }
      
      thumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
      
      // Normalize to -1 to 1
      this.moveX = thumbX / maxDistance;
      this.moveY = -thumbY / maxDistance; // Invert Y for forward/backward
    };
    
    const handleEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          thumb.style.transform = 'translate(0, 0)';
          this.moveX = 0;
          this.moveY = 0;
          break;
        }
      }
    };
    
    base.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
  }
  
  private setupLookArea(): void {
    const lookArea = document.getElementById('look-area')!;
    const sensitivity = 0.3;
    
    const handleStart = (e: TouchEvent) => {
      // Only use touch if not already tracking one for look
      if (this.lookTouchId !== null) return;
      
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastLookX = touch.clientX;
      this.lastLookY = touch.clientY;
    };
    
    const handleMove = (e: TouchEvent) => {
      if (this.lookTouchId === null) return;
      
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.lookTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      
      if (!touch) return;
      
      const deltaX = touch.clientX - this.lastLookX;
      const deltaY = touch.clientY - this.lastLookY;
      
      this.lookX = deltaX * sensitivity;
      this.lookY = deltaY * sensitivity;
      
      this.lastLookX = touch.clientX;
      this.lastLookY = touch.clientY;
    };
    
    const handleEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          this.lookX = 0;
          this.lookY = 0;
          break;
        }
      }
    };
    
    lookArea.addEventListener('touchstart', handleStart, { passive: true });
    lookArea.addEventListener('touchmove', handleMove, { passive: true });
    lookArea.addEventListener('touchend', handleEnd);
    lookArea.addEventListener('touchcancel', handleEnd);
  }
  
  private setupActionButtons(): void {
    const shootBtn = document.getElementById('btn-shoot')!;
    const aimBtn = document.getElementById('btn-aim')!;
    const jumpBtn = document.getElementById('btn-jump')!;
    const reloadBtn = document.getElementById('btn-reload')!;
    const interactBtn = document.getElementById('btn-interact')!;
    
    // Shoot button (hold to shoot)
    shootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.shootPressed = true;
      shootBtn.classList.add('pressed');
    });
    shootBtn.addEventListener('touchend', () => {
      this.shootPressed = false;
      shootBtn.classList.remove('pressed');
    });
    shootBtn.addEventListener('touchcancel', () => {
      this.shootPressed = false;
      shootBtn.classList.remove('pressed');
    });
    
    // Aim button (toggle)
    aimBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.aimPressed = !this.aimPressed;
      aimBtn.classList.toggle('pressed', this.aimPressed);
    });
    
    // Jump button
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpPressed = true;
      jumpBtn.classList.add('pressed');
    });
    jumpBtn.addEventListener('touchend', () => {
      this.jumpPressed = false;
      jumpBtn.classList.remove('pressed');
    });
    
    // Reload button
    reloadBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.reloadPressed = true;
      reloadBtn.classList.add('pressed');
    });
    reloadBtn.addEventListener('touchend', () => {
      this.reloadPressed = false;
      reloadBtn.classList.remove('pressed');
    });
    
    // Interact button
    interactBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.interactPressed = true;
      interactBtn.classList.add('pressed');
    });
    interactBtn.addEventListener('touchend', () => {
      this.interactPressed = false;
      interactBtn.classList.remove('pressed');
    });
  }
  
  public resetLookDelta(): void {
    this.lookX = 0;
    this.lookY = 0;
  }
  
  public show(): void {
    this.container.style.display = 'block';
  }
  
  public hide(): void {
    this.container.style.display = 'none';
  }
}
