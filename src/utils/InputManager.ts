import { MobileControls } from './MobileControls';

export class InputManager {
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    interact: false,
    up: false,
    down: false,
    sprint: false,
    crouch: false
  };
  
  public isMouseDown = false;
  public isAiming = false; // Right-click scope/ADS
  public isReloading = false;
  public interactPressed = false; // Single press detection
  
  // Mobile controls
  public mobileControls: MobileControls | null = null;
  public isMobile = false;

  constructor() {
    this.isMobile = MobileControls.isMobile();
    
    if (this.isMobile) {
      this.mobileControls = new MobileControls();
    }
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    // Mouse events
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }
  
  // Call this every frame to sync mobile input
  public updateMobileInput(): void {
    if (!this.mobileControls) return;
    
    const mc = this.mobileControls;
    
    // Movement from joystick
    this.keys.forward = mc.moveY > 0.3;
    this.keys.backward = mc.moveY < -0.3;
    this.keys.left = mc.moveX < -0.3;
    this.keys.right = mc.moveX > 0.3;
    
    // Actions
    this.isMouseDown = mc.shootPressed;
    this.isAiming = mc.aimPressed;
    this.keys.jump = mc.jumpPressed;
    
    if (mc.reloadPressed) {
      this.isReloading = true;
      mc.reloadPressed = false;
    }
    
    if (mc.interactPressed) {
      this.interactPressed = true;
      mc.interactPressed = false;
    }
  }
  
  // Get mobile look delta (for camera rotation)
  public getMobileLookDelta(): { x: number, y: number } {
    if (!this.mobileControls) return { x: 0, y: 0 };
    
    const delta = {
      x: this.mobileControls.lookX,
      y: this.mobileControls.lookY
    };
    
    this.mobileControls.resetLookDelta();
    return delta;
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.jump = true;
        break;
      case 'KeyR':
        this.isReloading = true;
        break;
      case 'KeyE':
        if (!this.keys.interact) {
          this.interactPressed = true;
        }
        this.keys.interact = true;
        break;
      case 'KeyQ':
        this.keys.up = true;
        break;
      case 'KeyZ':
        this.keys.down = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'KeyC':
        this.keys.crouch = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'KeyE':
        this.keys.interact = false;
        break;
      case 'KeyQ':
        this.keys.up = false;
        break;
      case 'KeyZ':
        this.keys.down = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
      case 'KeyC':
        this.keys.crouch = false;
        break;
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = true;
    }
    if (event.button === 2) {
      this.isAiming = true;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    }
    if (event.button === 2) {
      this.isAiming = false;
    }
  }

  public consumeInteract(): boolean {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }
}
