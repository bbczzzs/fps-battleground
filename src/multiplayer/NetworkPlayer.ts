import * as THREE from 'three';

export class NetworkPlayer {
  private scene: THREE.Scene;
  private mesh: THREE.Group;
  private nameTag: THREE.Sprite;
  private health = 100;
  private maxHealth = 100;
  private targetPosition = new THREE.Vector3();
  private targetRotation = new THREE.Euler();
  private previousPosition = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private isShooting = false;
  private lastShootTime = 0;
  private muzzleFlash: THREE.PointLight;
  private lastUpdateTime = 0;
  private updateInterval = 0;

  constructor(scene: THREE.Scene, name: string = 'Enemy') {
    this.scene = scene;
    this.mesh = this.createPlayerMesh();
    this.nameTag = this.createNameTag(name);
    this.muzzleFlash = this.createMuzzleFlash();
    
    this.mesh.add(this.nameTag);
    this.mesh.add(this.muzzleFlash);
    scene.add(this.mesh);
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();
    
    // Body
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 8, 16), bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    // Head
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), headMaterial);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);

    // Helmet
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.5 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), helmetMaterial);
    helmet.position.y = 1.9;
    helmet.castShadow = true;
    group.add(helmet);

    // Arms
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.7 });
    [-0.5, 0.5].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), armMaterial);
      arm.position.set(x, 1.2, 0);
      arm.rotation.z = x > 0 ? -0.3 : 0.3;
      arm.castShadow = true;
      group.add(arm);
    });

    // Weapon
    const weaponGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    weaponGroup.add(gunBody);
    
    const gunStock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.12, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x4a3020 })
    );
    gunStock.position.z = -0.35;
    weaponGroup.add(gunStock);

    weaponGroup.position.set(0.35, 1.1, 0.3);
    weaponGroup.name = 'weapon';
    group.add(weaponGroup);

    // Legs
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.8 });
    [-0.15, 0.15].forEach(x => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), legMaterial);
      leg.position.set(x, 0.35, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    // Health bar background
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })
    );
    healthBarBg.position.y = 2.3;
    healthBarBg.name = 'healthBarBg';
    group.add(healthBarBg);

    // Health bar fill
    const healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
    );
    healthBarFill.position.y = 2.3;
    healthBarFill.position.z = 0.01;
    healthBarFill.name = 'healthBar';
    group.add(healthBarFill);

    return group;
  }

  private createNameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 2.6;
    sprite.scale.set(1.5, 0.4, 1);
    
    return sprite;
  }

  private createMuzzleFlash(): THREE.PointLight {
    const light = new THREE.PointLight(0xffaa00, 0, 5);
    light.position.set(0.35, 1.1, 0.6);
    return light;
  }

  public update(delta: number, cameraPosition: THREE.Vector3): void {
    // Predict position using velocity extrapolation for smoother movement
    const predictedPosition = this.targetPosition.clone().add(
      this.velocity.clone().multiplyScalar(delta)
    );
    
    // Smooth interpolation with adaptive speed based on distance
    const distance = this.mesh.position.distanceTo(predictedPosition);
    const interpSpeed = Math.min(20, Math.max(8, distance * 10));
    
    this.mesh.position.lerp(predictedPosition, interpSpeed * delta);
    
    // Smooth rotation interpolation
    const currentY = this.mesh.rotation.y;
    const targetY = this.targetRotation.y;
    let diff = targetY - currentY;
    
    // Handle angle wrapping
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    this.mesh.rotation.y += diff * 12 * delta;

    // Face name tag and health bar towards camera
    const lookDir = new THREE.Vector3().subVectors(cameraPosition, this.mesh.position);
    const angle = Math.atan2(lookDir.x, lookDir.z);
    
    this.nameTag.material.rotation = 0;
    
    const healthBar = this.mesh.getObjectByName('healthBar') as THREE.Mesh;
    const healthBarBg = this.mesh.getObjectByName('healthBarBg') as THREE.Mesh;
    if (healthBar && healthBarBg) {
      healthBar.rotation.y = angle - this.mesh.rotation.y;
      healthBarBg.rotation.y = angle - this.mesh.rotation.y;
    }

    // Muzzle flash effect
    if (this.isShooting && Date.now() - this.lastShootTime < 100) {
      this.muzzleFlash.intensity = 3;
    } else {
      this.muzzleFlash.intensity = 0;
      this.isShooting = false;
    }
  }

  public setTargetState(position: THREE.Vector3, rotation: THREE.Euler): void {
    // Calculate velocity from position delta for prediction
    const now = Date.now();
    if (this.lastUpdateTime > 0) {
      this.updateInterval = now - this.lastUpdateTime;
      if (this.updateInterval > 0) {
        this.velocity.subVectors(position, this.targetPosition)
          .multiplyScalar(1000 / this.updateInterval);
      }
    }
    this.lastUpdateTime = now;
    
    this.previousPosition.copy(this.targetPosition);
    this.targetPosition.copy(position);
    this.targetRotation.copy(rotation);
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.targetPosition.copy(position);
    this.velocity.set(0, 0, 0);
  }

  public shoot(): void {
    this.isShooting = true;
    this.lastShootTime = Date.now();
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
  }

  public setHealth(health: number): void {
    this.health = health;
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    const healthBar = this.mesh.getObjectByName('healthBar') as THREE.Mesh;
    if (healthBar) {
      const healthPercent = this.health / this.maxHealth;
      healthBar.scale.x = Math.max(0.01, healthPercent);
      healthBar.position.x = (1 - healthPercent) * -0.39;
      
      // Color based on health
      const material = healthBar.material as THREE.MeshBasicMaterial;
      if (healthPercent > 0.6) {
        material.color.setHex(0x00ff00);
      } else if (healthPercent > 0.3) {
        material.color.setHex(0xffff00);
      } else {
        material.color.setHex(0xff0000);
      }
    }
  }

  public getHealth(): number {
    return this.health;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public respawn(position: THREE.Vector3): void {
    this.health = this.maxHealth;
    this.setPosition(position);
    this.updateHealthBar();
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
  }
}
