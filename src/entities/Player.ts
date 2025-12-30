import * as THREE from 'three';
import { InputManager } from '../utils/InputManager';
import { CollisionManager } from '../utils/CollisionManager';

export class Player {
  private camera: THREE.PerspectiveCamera;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private health = 100;
  private moveSpeed = 10;
  private jumpForce = 8;
  private gravity = 20;
  private isGrounded = true;
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private mouseSensitivity = 0.002;
  private playerHeight = 1.7;
  
  // Terrain height function (set by Game)
  private getTerrainHeight: ((x: number, z: number) => number) | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.position.set(0, this.playerHeight, 0);

    // Setup mouse look
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  public setTerrainHeightFunction(fn: (x: number, z: number) => number): void {
    this.getTerrainHeight = fn;
  }

  private onMouseMove(event: MouseEvent): void {
    if (document.pointerLockElement !== document.body) return;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= event.movementX * this.mouseSensitivity;
    this.euler.x -= event.movementY * this.mouseSensitivity;

    // Clamp vertical look
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }
  
  // Mobile touch look
  public applyMobileLook(deltaX: number, deltaY: number): void {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= deltaX * this.mouseSensitivity * 5;
    this.euler.x -= deltaY * this.mouseSensitivity * 5;

    // Clamp vertical look
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  public update(
    delta: number, 
    input: InputManager, 
    collision: CollisionManager
  ): void {
    // Get movement direction
    this.direction.set(0, 0, 0);

    if (input.keys.forward) this.direction.z -= 1;
    if (input.keys.backward) this.direction.z += 1;
    if (input.keys.left) this.direction.x -= 1;
    if (input.keys.right) this.direction.x += 1;

    this.direction.normalize();

    // Apply camera rotation to movement direction
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    const moveX = right.x * this.direction.x + cameraDirection.x * -this.direction.z;
    const moveZ = right.z * this.direction.x + cameraDirection.z * -this.direction.z;

    // Apply movement
    this.velocity.x = moveX * this.moveSpeed;
    this.velocity.z = moveZ * this.moveSpeed;

    // Jumping
    if (input.keys.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * delta;
    }

    // Calculate new position
    const newPosition = this.camera.position.clone();
    newPosition.x += this.velocity.x * delta;
    newPosition.z += this.velocity.z * delta;
    newPosition.y += this.velocity.y * delta;

    // Get terrain height at new position
    let groundHeight = this.playerHeight;
    if (this.getTerrainHeight) {
      groundHeight = this.getTerrainHeight(newPosition.x, newPosition.z) + this.playerHeight;
    }

    // Check ground collision with terrain
    if (newPosition.y <= groundHeight) {
      newPosition.y = groundHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Check obstacle collision
    const horizontalMovement = new THREE.Vector3(
      this.velocity.x * delta,
      0,
      this.velocity.z * delta
    );

    if (!collision.checkPlayerCollision(this.camera.position, horizontalMovement)) {
      this.camera.position.x = newPosition.x;
      this.camera.position.z = newPosition.z;
    }

    this.camera.position.y = newPosition.y;

    // Keep player in bounds
    const bounds = 140;
    this.camera.position.x = Math.max(-bounds, Math.min(bounds, this.camera.position.x));
    this.camera.position.z = Math.max(-bounds, Math.min(bounds, this.camera.position.z));
  }

  public setPosition(pos: THREE.Vector3): void {
    this.camera.position.copy(pos);
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Flash screen red
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 0, 0, 0.3);
      pointer-events: none;
      z-index: 99;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 100);

    if (this.health <= 0) {
      this.onDeath();
    }
  }

  public heal(amount: number): void {
    this.health = Math.min(100, this.health + amount);
  }

  public getHealth(): number {
    return this.health;
  }

  private onDeath(): void {
    // Game over logic
    document.exitPointerLock();
    const gameOver = document.createElement('div');
    gameOver.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        color: #fff;
        font-family: Arial, sans-serif;
      ">
        <h1 style="font-size: 64px; color: #ff4444; margin-bottom: 20px;">GAME OVER</h1>
        <button onclick="location.reload()" style="
          padding: 15px 50px;
          font-size: 24px;
          background: #ff4444;
          color: #fff;
          border: none;
          cursor: pointer;
        ">Try Again</button>
      </div>
    `;
    document.body.appendChild(gameOver);
  }
}
