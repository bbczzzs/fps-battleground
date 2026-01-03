import * as THREE from 'three';
import { Projectile } from '../entities/Projectile';

export class Weapon {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private mesh: THREE.Group;
  private scopeOverlay: HTMLDivElement | null = null;
  private currentAmmo = 30;
  private reserveAmmo = 90;
  private maxAmmo = 30;
  private fireRate = 10; // shots per second
  private lastShotTime = 0;
  private isReloading = false;
  private reloadTime = 1.5;
  private reloadTimer = 0;
  
  // Weapon recoil
  private recoilAmount = 0;
  private recoilRecovery = 10;
  
  // ADS (Aim Down Sights)
  private isAiming = false;
  private defaultFOV = 75;
  private aimFOV = 40;
  private defaultPosition = new THREE.Vector3(0.25, -0.2, -0.5);
  private aimPosition = new THREE.Vector3(0, -0.12, -0.35);
  private aimTransition = 0; // 0 = hip fire, 1 = fully aimed

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.mesh = this.createWeaponMesh();
    camera.add(this.mesh);
    this.createScopeOverlay();
    
    // Prevent context menu on right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  private createScopeOverlay(): void {
    this.scopeOverlay = document.createElement('div');
    this.scopeOverlay.id = 'scope-overlay';
    this.scopeOverlay.innerHTML = `
      <div class="scope-circle"></div>
      <div class="scope-crosshair-h"></div>
      <div class="scope-crosshair-v"></div>
      <div class="scope-vignette"></div>
    `;
    this.scopeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .scope-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        height: 400px;
        border: 3px solid rgba(0, 255, 0, 0.8);
        border-radius: 50%;
        box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.85);
      }
      .scope-crosshair-h {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 380px;
        height: 2px;
        background: linear-gradient(90deg, 
          rgba(0,255,0,0.8) 0%, 
          transparent 45%, 
          transparent 55%, 
          rgba(0,255,0,0.8) 100%
        );
      }
      .scope-crosshair-v {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 2px;
        height: 380px;
        background: linear-gradient(180deg, 
          rgba(0,255,0,0.8) 0%, 
          transparent 45%, 
          transparent 55%, 
          rgba(0,255,0,0.8) 100%
        );
      }
      .scope-vignette {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.3) 100%);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.scopeOverlay);
  }

  private createWeaponMesh(): THREE.Group {
    const group = new THREE.Group();

    // Cartoon toy gun - using palette colors!
    // Gun body - accent coral color
    const bodyGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xE76F51,  // Accent from palette
      roughness: 0.9,
      metalness: 0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Chunky barrel - character orange
    const barrelGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.35, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF4A261,  // Character from palette
      roughness: 0.9,
      metalness: 0
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.4;
    barrel.position.y = 0.02;
    group.add(barrel);

    // Orange tip (toy gun style)
    const tipGeometry = new THREE.SphereGeometry(0.045, 12, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD166,  // Building yellow from palette
      roughness: 0.9,
      metalness: 0
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.z = -0.58;
    tip.position.y = 0.02;
    group.add(tip);

    // Handle - soft gray-blue for shadows
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.18, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7A8A9A,  // Soft gray-blue
      roughness: 0.9,
      metalness: 0
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.14;
    handle.position.z = 0.1;
    handle.rotation.x = -0.2;
    group.add(handle);

    // Cute round sight - building yellow
    const sightGeometry = new THREE.SphereGeometry(0.025, 8, 6);
    const sightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD166,  // Building yellow
      roughness: 0.9,
      metalness: 0
    });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.y = 0.1;
    sight.position.z = -0.15;
    group.add(sight);

    // Position weapon in view
    group.position.set(0.25, -0.2, -0.5);
    group.rotation.y = 0.05;

    return group;
  }

  public update(delta: number, aiming: boolean = false): void {
    // Update aiming state
    this.isAiming = aiming && !this.isReloading;
    
    // Smooth aim transition
    const targetTransition = this.isAiming ? 1 : 0;
    this.aimTransition += (targetTransition - this.aimTransition) * delta * 12;
    
    // Update FOV based on aim
    const targetFOV = this.isAiming ? this.aimFOV : this.defaultFOV;
    this.camera.fov += (targetFOV - this.camera.fov) * delta * 12;
    this.camera.updateProjectionMatrix();
    
    // Update scope overlay
    if (this.scopeOverlay) {
      this.scopeOverlay.style.opacity = (this.aimTransition * 0.9).toString();
    }
    
    // Handle reload
    if (this.isReloading) {
      this.reloadTimer -= delta;
      
      // Reload animation
      this.mesh.rotation.x = Math.sin(this.reloadTimer * 4) * 0.3;
      
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    // Recoil recovery (faster when aiming)
    const recoilRecoveryMult = this.isAiming ? 1.5 : 1;
    if (this.recoilAmount > 0) {
      this.recoilAmount -= this.recoilRecovery * recoilRecoveryMult * delta;
      this.recoilAmount = Math.max(0, this.recoilAmount);
    }

    // Interpolate weapon position based on aim state
    const targetPos = this.defaultPosition.clone().lerp(this.aimPosition, this.aimTransition);
    
    // Apply recoil to weapon position
    targetPos.z += this.recoilAmount * 0.1;
    this.mesh.rotation.x = -this.recoilAmount * 0.1;

    // Subtle weapon sway (reduced when aiming)
    const swayMult = 1 - this.aimTransition * 0.8;
    const targetX = targetPos.x + Math.sin(Date.now() * 0.002) * 0.005 * swayMult;
    const targetY = targetPos.y + Math.sin(Date.now() * 0.003) * 0.003 * swayMult;
    
    this.mesh.position.x += (targetX - this.mesh.position.x) * 0.15;
    this.mesh.position.y += (targetY - this.mesh.position.y) * 0.15;
    this.mesh.position.z += (targetPos.z - this.mesh.position.z) * 0.15;
    
    // Hide weapon body when fully aiming (to see scope better)
    if (this.aimTransition > 0.8) {
      this.mesh.visible = false;
    } else if (!this.isReloading) {
      this.mesh.visible = true;
    }
  }

  public canShoot(): boolean {
    const now = performance.now();
    const timeSinceLastShot = now - this.lastShotTime;
    const minTimeBetweenShots = 1000 / this.fireRate;
    
    return !this.isReloading && 
           this.currentAmmo > 0 && 
           timeSinceLastShot >= minTimeBetweenShots;
  }

  public shoot(): Projectile | null {
    if (!this.canShoot()) return null;

    this.lastShotTime = performance.now();
    this.currentAmmo--;
    this.recoilAmount = this.isAiming ? 0.5 : 1; // Less recoil when aiming

    // Get camera world position and direction
    const position = new THREE.Vector3();
    this.camera.getWorldPosition(position);
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Add spread (much less when aiming)
    const spread = this.isAiming ? 0.005 : 0.02;
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;

    // Create muzzle flash effect
    this.createMuzzleFlash();

    // Auto reload when empty
    if (this.currentAmmo === 0 && this.reserveAmmo > 0) {
      this.reload();
    }

    return new Projectile(this.scene, position, direction);
  }

  private createMuzzleFlash(): void {
    const flash = new THREE.PointLight(0xffaa00, 2, 3);
    flash.position.copy(this.mesh.position);
    flash.position.z -= 0.5;
    this.camera.add(flash);

    setTimeout(() => {
      this.camera.remove(flash);
      flash.dispose();
    }, 50);
  }

  public reload(): void {
    if (this.isReloading || this.currentAmmo === this.maxAmmo || this.reserveAmmo === 0) {
      return;
    }

    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
  }

  private finishReload(): void {
    const ammoNeeded = this.maxAmmo - this.currentAmmo;
    const ammoToAdd = Math.min(ammoNeeded, this.reserveAmmo);
    
    this.currentAmmo += ammoToAdd;
    this.reserveAmmo -= ammoToAdd;
    this.isReloading = false;
    this.mesh.rotation.x = 0;
  }

  public getCurrentAmmo(): number {
    return this.currentAmmo;
  }

  public getReserveAmmo(): number {
    return this.reserveAmmo;
  }

  public hide(): void {
    this.mesh.visible = false;
  }

  public show(): void {
    this.mesh.visible = true;
  }
}
