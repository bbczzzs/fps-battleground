import * as THREE from 'three';
import { Projectile } from '../entities/Projectile';

export enum WeaponType {
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  SNIPER = 'sniper',
  SMG = 'smg'
}

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number;
  maxAmmo: number;
  reserveAmmo: number;
  reloadTime: number;
  spread: number;
  aimSpread: number;
  recoil: number;
  aimFOV: number;
  projectileSpeed: number;
  pelletCount: number; // For shotgun
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.RIFLE]: {
    name: 'Assault Rifle',
    damage: 25,
    fireRate: 10,
    maxAmmo: 30,
    reserveAmmo: 120,
    reloadTime: 1.5,
    spread: 0.02,
    aimSpread: 0.005,
    recoil: 1,
    aimFOV: 50,
    projectileSpeed: 100,
    pelletCount: 1
  },
  [WeaponType.SHOTGUN]: {
    name: 'Shotgun',
    damage: 15,
    fireRate: 1.5,
    maxAmmo: 8,
    reserveAmmo: 32,
    reloadTime: 2.5,
    spread: 0.15,
    aimSpread: 0.08,
    recoil: 3,
    aimFOV: 60,
    projectileSpeed: 80,
    pelletCount: 8
  },
  [WeaponType.SNIPER]: {
    name: 'Sniper Rifle',
    damage: 100,
    fireRate: 0.8,
    maxAmmo: 5,
    reserveAmmo: 20,
    reloadTime: 2.0,
    spread: 0.0,
    aimSpread: 0.0,
    recoil: 4,
    aimFOV: 20,
    projectileSpeed: 150,
    pelletCount: 1
  },
  [WeaponType.SMG]: {
    name: 'SMG',
    damage: 18,
    fireRate: 15,
    maxAmmo: 40,
    reserveAmmo: 160,
    reloadTime: 1.2,
    spread: 0.04,
    aimSpread: 0.015,
    recoil: 0.7,
    aimFOV: 55,
    projectileSpeed: 90,
    pelletCount: 1
  }
};

export class MultiWeapon {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private mesh: THREE.Group;
  private scopeOverlay: HTMLDivElement | null = null;
  
  private currentWeaponType: WeaponType = WeaponType.RIFLE;
  private currentAmmo: number;
  private reserveAmmo: number;
  private lastShotTime = 0;
  private isReloading = false;
  private reloadTimer = 0;
  
  // Weapon recoil
  private recoilAmount = 0;
  private recoilRecovery = 10;
  
  // ADS (Aim Down Sights)
  private isAiming = false;
  private defaultFOV = 75;
  private defaultPosition = new THREE.Vector3(0.25, -0.2, -0.5);
  private aimPosition = new THREE.Vector3(0, -0.12, -0.35);
  private aimTransition = 0;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    this.currentAmmo = config.maxAmmo;
    this.reserveAmmo = config.reserveAmmo;
    
    this.mesh = this.createWeaponMesh(this.currentWeaponType);
    camera.add(this.mesh);
    this.createScopeOverlay();
    
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createWeaponMesh(type: WeaponType): THREE.Group {
    switch (type) {
      case WeaponType.RIFLE:
        return this.createRifleMesh();
      case WeaponType.SHOTGUN:
        return this.createShotgunMesh();
      case WeaponType.SNIPER:
        return this.createSniperMesh();
      case WeaponType.SMG:
        return this.createSMGMesh();
      default:
        return this.createRifleMesh();
    }
  }

  private createRifleMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5A5A68, metalness: 0, roughness: 0.9 });
    
    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), bodyMat);
    group.add(body);
    
    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), bodyMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.z = -0.5;
    barrel.position.y = 0.03;
    group.add(barrel);
    
    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.08), bodyMat);
    mag.position.y = -0.1;
    group.add(mag);
    
    group.position.set(0.25, -0.2, -0.5);
    return group;
  }

  private createShotgunMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B6B50, metalness: 0, roughness: 0.9 });
    
    // Main body (wooden stock)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), bodyMat);
    group.add(body);
    
    // Barrel (thicker)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x4A4A58, metalness: 0, roughness: 0.9 })
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.z = -0.5;
    barrel.position.y = 0.05;
    group.add(barrel);
    
    // Pump
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.15), bodyMat);
    pump.position.z = -0.15;
    pump.position.y = -0.05;
    group.add(pump);
    
    group.position.set(0.25, -0.2, -0.5);
    return group;
  }

  private createSniperMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5A7A5A, metalness: 0, roughness: 0.9 });
    
    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), bodyMat);
    group.add(body);
    
    // Long barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8), bodyMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.z = -0.7;
    barrel.position.y = 0.04;
    group.add(barrel);
    
    // Scope
    const scopeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x3A3A48, metalness: 0, roughness: 0.9 })
    );
    scopeBody.rotation.z = Math.PI / 2;
    scopeBody.position.y = 0.12;
    scopeBody.position.z = -0.1;
    group.add(scopeBody);
    
    // Bipod
    const bipodMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const bipodLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15), bipodMat);
    bipodLeft.position.set(-0.05, -0.12, -0.3);
    bipodLeft.rotation.z = 0.3;
    group.add(bipodLeft);
    
    const bipodRight = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15), bipodMat);
    bipodRight.position.set(0.05, -0.12, -0.3);
    bipodRight.rotation.z = -0.3;
    group.add(bipodRight);
    
    group.position.set(0.25, -0.2, -0.5);
    return group;
  }

  private createSMGMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5A5A68, metalness: 0, roughness: 0.9 });
    
    // Compact body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.4), bodyMat);
    group.add(body);
    
    // Short barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3), bodyMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.z = -0.35;
    barrel.position.y = 0.02;
    group.add(barrel);
    
    // Large magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.08), bodyMat);
    mag.position.y = -0.12;
    group.add(mag);
    
    // Foregrip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1), bodyMat);
    grip.position.set(0, -0.1, -0.2);
    group.add(grip);
    
    group.position.set(0.25, -0.2, -0.5);
    return group;
  }

  private createScopeOverlay(): void {
    this.scopeOverlay = document.createElement('div');
    this.scopeOverlay.id = 'scope-overlay';
    this.scopeOverlay.innerHTML = `
      <div class="scope-circle"></div>
      <div class="scope-crosshair-h"></div>
      <div class="scope-crosshair-v"></div>
    `;
    this.scopeOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0;
      transition: opacity 0.15s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .scope-circle {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 400px; height: 400px; border: 3px solid rgba(0, 255, 0, 0.8);
        border-radius: 50%; box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.85);
      }
      .scope-crosshair-h {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 380px; height: 2px;
        background: linear-gradient(90deg, rgba(0,255,0,0.8) 0%, transparent 45%, transparent 55%, rgba(0,255,0,0.8) 100%);
      }
      .scope-crosshair-v {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 2px; height: 380px;
        background: linear-gradient(180deg, rgba(0,255,0,0.8) 0%, transparent 45%, transparent 55%, rgba(0,255,0,0.8) 100%);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.scopeOverlay);
  }

  public switchWeapon(type: WeaponType): void {
    if (this.currentWeaponType === type || this.isReloading) return;
    
    this.currentWeaponType = type;
    const config = WEAPON_CONFIGS[type];
    
    // Reset ammo
    this.currentAmmo = config.maxAmmo;
    this.reserveAmmo = config.reserveAmmo;
    this.isReloading = false;
    this.recoilAmount = 0;
    
    // Replace mesh
    this.camera.remove(this.mesh);
    this.mesh = this.createWeaponMesh(type);
    this.camera.add(this.mesh);
  }

  public update(delta: number, aiming: boolean = false): void {
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    this.isAiming = aiming && !this.isReloading;
    
    const targetTransition = this.isAiming ? 1 : 0;
    this.aimTransition += (targetTransition - this.aimTransition) * delta * 12;
    
    const targetFOV = this.isAiming ? config.aimFOV : this.defaultFOV;
    this.camera.fov += (targetFOV - this.camera.fov) * delta * 12;
    this.camera.updateProjectionMatrix();
    
    // Show scope overlay only for sniper rifle
    if (this.scopeOverlay) {
      const showScope = this.isAiming && this.currentWeaponType === WeaponType.SNIPER;
      this.scopeOverlay.style.opacity = (showScope ? this.aimTransition * 0.95 : 0).toString();
    }
    
    // Hide weapon model when looking through sniper scope
    if (this.currentWeaponType === WeaponType.SNIPER) {
      this.mesh.visible = !(this.isAiming && this.aimTransition > 0.8);
    } else {
      this.mesh.visible = true;
    }
    
    if (this.isReloading) {
      this.reloadTimer -= delta;
      this.mesh.rotation.x = Math.sin(this.reloadTimer * 4) * 0.3;
      
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    const recoilRecoveryMult = this.isAiming ? 1.5 : 1;
    if (this.recoilAmount > 0) {
      this.recoilAmount -= this.recoilRecovery * recoilRecoveryMult * delta;
      this.recoilAmount = Math.max(0, this.recoilAmount);
    }

    const targetPos = this.defaultPosition.clone().lerp(this.aimPosition, this.aimTransition);
    targetPos.z += this.recoilAmount * 0.1;
    this.mesh.rotation.x = -this.recoilAmount * 0.1;

    const swayMult = 1 - this.aimTransition * 0.8;
    const targetX = targetPos.x + Math.sin(Date.now() * 0.002) * 0.005 * swayMult;
    const targetY = targetPos.y + Math.sin(Date.now() * 0.003) * 0.003 * swayMult;
    
    this.mesh.position.x += (targetX - this.mesh.position.x) * 0.15;
    this.mesh.position.y += (targetY - this.mesh.position.y) * 0.15;
    this.mesh.position.z += (targetPos.z - this.mesh.position.z) * 0.15;
  }

  public canShoot(): boolean {
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    const now = performance.now();
    const timeSinceLastShot = now - this.lastShotTime;
    const minTimeBetweenShots = 1000 / config.fireRate;
    
    return !this.isReloading && 
           this.currentAmmo > 0 && 
           timeSinceLastShot >= minTimeBetweenShots;
  }

  public shoot(): Projectile[] {
    if (!this.canShoot()) return [];

    const config = WEAPON_CONFIGS[this.currentWeaponType];
    this.lastShotTime = performance.now();
    this.currentAmmo--;
    this.recoilAmount = this.isAiming ? config.recoil * 0.5 : config.recoil;

    const position = new THREE.Vector3();
    this.camera.getWorldPosition(position);
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const projectiles: Projectile[] = [];
    const spread = this.isAiming ? config.aimSpread : config.spread;
    
    // Create multiple projectiles for shotgun
    for (let i = 0; i < config.pelletCount; i++) {
      const spreadDir = direction.clone();
      spreadDir.x += (Math.random() - 0.5) * spread;
      spreadDir.y += (Math.random() - 0.5) * spread;
      spreadDir.z += (Math.random() - 0.5) * spread;
      spreadDir.normalize();

      const projectile = new Projectile(this.scene, position, spreadDir);
      projectiles.push(projectile);
    }

    this.createMuzzleFlash();

    if (this.currentAmmo === 0 && this.reserveAmmo > 0) {
      this.reload();
    }

    return projectiles;
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
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    if (this.isReloading || this.currentAmmo === config.maxAmmo || this.reserveAmmo === 0) {
      return;
    }

    this.isReloading = true;
    this.reloadTimer = config.reloadTime;
  }

  private finishReload(): void {
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    const ammoNeeded = config.maxAmmo - this.currentAmmo;
    const ammoToAdd = Math.min(ammoNeeded, this.reserveAmmo);
    
    this.currentAmmo += ammoToAdd;
    this.reserveAmmo -= ammoToAdd;
    this.isReloading = false;
    this.mesh.rotation.x = 0;
  }

  public addAmmo(amount: number): void {
    const config = WEAPON_CONFIGS[this.currentWeaponType];
    this.reserveAmmo = Math.min(this.reserveAmmo + amount, config.reserveAmmo + 200);
  }

  public getCurrentAmmo(): number { return this.currentAmmo; }
  public getReserveAmmo(): number { return this.reserveAmmo; }
  public getCurrentWeaponType(): WeaponType { return this.currentWeaponType; }
  public getCurrentWeaponName(): string { return WEAPON_CONFIGS[this.currentWeaponType].name; }
  public hide(): void { this.mesh.visible = false; }
  public show(): void { this.mesh.visible = true; }
}
