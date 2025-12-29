import * as THREE from 'three';
import { Projectile } from '../entities/Projectile';

export class Weapon {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private mesh: THREE.Group;
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

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.mesh = this.createWeaponMesh();
    camera.add(this.mesh);
  }

  private createWeaponMesh(): THREE.Group {
    const group = new THREE.Group();

    // Gun body
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.3, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.2,
      metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.35;
    barrel.position.y = 0.02;
    group.add(barrel);

    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.08);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a3728,
      roughness: 0.8
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.12;
    handle.position.z = 0.1;
    handle.rotation.x = -0.2;
    group.add(handle);

    // Sight
    const sightGeometry = new THREE.BoxGeometry(0.02, 0.04, 0.02);
    const sightMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.y = 0.08;
    sight.position.z = -0.15;
    group.add(sight);

    // Position weapon in view
    group.position.set(0.25, -0.2, -0.5);
    group.rotation.y = 0.05;

    return group;
  }

  public update(delta: number): void {
    // Handle reload
    if (this.isReloading) {
      this.reloadTimer -= delta;
      
      // Reload animation
      this.mesh.rotation.x = Math.sin(this.reloadTimer * 4) * 0.3;
      
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    // Recoil recovery
    if (this.recoilAmount > 0) {
      this.recoilAmount -= this.recoilRecovery * delta;
      this.recoilAmount = Math.max(0, this.recoilAmount);
    }

    // Apply recoil to weapon position
    this.mesh.position.z = -0.5 + this.recoilAmount * 0.1;
    this.mesh.rotation.x = -this.recoilAmount * 0.1;

    // Subtle weapon sway based on mouse movement
    const targetX = 0.25 + Math.sin(Date.now() * 0.002) * 0.005;
    const targetY = -0.2 + Math.sin(Date.now() * 0.003) * 0.003;
    
    this.mesh.position.x += (targetX - this.mesh.position.x) * 0.1;
    this.mesh.position.y += (targetY - this.mesh.position.y) * 0.1;
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
    this.recoilAmount = 1;

    // Get camera world position and direction
    const position = new THREE.Vector3();
    this.camera.getWorldPosition(position);
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Add slight spread
    const spread = 0.02;
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
