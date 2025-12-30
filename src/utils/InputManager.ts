export class InputManager {
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    interact: false,
    up: false,
    down: false
  };
  
  public isMouseDown = false;
  public isAiming = false; // Right-click scope/ADS
  public isReloading = false;
  public interactPressed = false; // Single press detection

  constructor() {
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
