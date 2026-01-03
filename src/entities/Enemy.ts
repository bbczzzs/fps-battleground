import * as THREE from 'three';

export type EnemyType = 'rifle' | 'smg' | 'heavy' | 'boss';

interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  attackRate: number;
  color: number;
  scale: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  rifle: { health: 80, speed: 2.5, damage: 15, attackRate: 0.8, color: 0xF4A261, scale: 1 },
  smg: { health: 60, speed: 5, damage: 8, attackRate: 2, color: 0xE9967A, scale: 0.9 },
  heavy: { health: 200, speed: 1.5, damage: 25, attackRate: 0.5, color: 0xFFD166, scale: 1.3 },
  boss: { health: 1000, speed: 3, damage: 40, attackRate: 1.5, color: 0xE76F51, scale: 2.5 }
};

export class Enemy {
  private mesh: THREE.Group;
  private scene: THREE.Scene;
  private health: number;
  private maxHealth: number;
  private speed: number;
  private damage: number;
  private attackCooldown = 0;
  private attackRate: number;
  private dead = false;
  private type: EnemyType;
  private walkCycle = 0;
  private isHit = false;
  private hitTimer = 0;
  private deathTimer = 0;
  private isDying = false;
  
  // Terrain and collision
  private getTerrainHeight: ((x: number, z: number) => number) | null = null;
  private colliders: THREE.Box3[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, type: EnemyType = 'rifle') {
    this.scene = scene;
    this.type = type;
    const config = ENEMY_CONFIGS[type];
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    this.attackRate = config.attackRate;
    this.mesh = this.createMesh(config);
    this.mesh.position.copy(position);
    this.mesh.scale.setScalar(config.scale);
    scene.add(this.mesh);
  }

  private createMesh(config: EnemyConfig): THREE.Group {
    const group = new THREE.Group();
    
    // Boss gets special appearance
    if (this.type === 'boss') {
      return this.createBossMesh(config);
    }
    
    // Cartoon toon-shaded materials
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: config.color, 
      roughness: 0.9,
      metalness: 0
    });
    const skinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFAE5D3, // Warm skin tone (no pure white)
      roughness: 0.9,
      metalness: 0
    });

    // CHIBI STYLE: Big round body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      bodyMaterial
    );
    body.position.y = 0.8;
    body.scale.set(1, 1.2, 0.9);
    body.castShadow = true;
    body.name = 'torso';
    group.add(body);

    // CHIBI: Very big head (50% of body)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16), 
      skinMaterial
    );
    head.position.y = 1.7;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    // Cute blush cheeks
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 1, metalness: 0 });
    [-0.25, 0.25].forEach(x => {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), blushMat);
      blush.position.set(x, 1.6, 0.35);
      blush.scale.set(1.2, 0.8, 0.5);
      group.add(blush);
    });

    // Big cartoon eyes
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xFFFFF5, roughness: 0.9, metalness: 0 });
    const eyePupil = new THREE.MeshBasicMaterial({ color: 0x2C2C2C });
    [-0.15, 0.15].forEach(x => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), eyeWhite);
      white.position.set(x, 1.75, 0.35);
      white.scale.z = 0.5;
      group.add(white);
      
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyePupil);
      pupil.position.set(x, 1.75, 0.42);
      group.add(pupil);
      
      // Eye shine
      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
      );
      shine.position.set(x + 0.03, 1.78, 0.44);
      group.add(shine);
    });

    // Cute smile
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x2C2C2C });
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI),
      smileMat
    );
    smile.position.set(0, 1.55, 0.4);
    smile.rotation.x = Math.PI;
    group.add(smile);

    // Stubby cartoon arms
    const armGeo = new THREE.CapsuleGeometry(0.12, 0.25, 8, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    leftArm.position.set(-0.55, 0.85, 0);
    leftArm.rotation.z = 0.5;
    leftArm.castShadow = true;
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    rightArm.position.set(0.55, 0.85, 0);
    rightArm.rotation.z = -0.5;
    rightArm.castShadow = true;
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Stubby cartoon legs
    const legGeo = new THREE.CapsuleGeometry(0.14, 0.2, 8, 8);
    const leftLeg = new THREE.Mesh(legGeo, bodyMaterial);
    leftLeg.position.set(-0.2, 0.2, 0);
    leftLeg.castShadow = true;
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMaterial);
    rightLeg.position.set(0.2, 0.2, 0);
    rightLeg.castShadow = true;
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    // Toy weapon (colorful)
    const weapon = this.createWeaponMesh();
    weapon.position.set(0.5, 0.9, 0.3);
    weapon.name = 'weapon';
    group.add(weapon);

    // Health bar with rounded look
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xE0E0E0 })
    );
    healthBarBg.position.y = 2.4;
    healthBarBg.name = 'healthBarBg';
    group.add(healthBarBg);

    const healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x90EE90 }) // Light green
    );
    healthBarFill.position.y = 2.4;
    healthBarFill.position.z = 0.01;
    healthBarFill.name = 'healthBarFill';
    group.add(healthBarFill);

    return group;
  }
  
  private createBossMesh(config: EnemyConfig): THREE.Group {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: config.color, 
      roughness: 0.9,
      metalness: 0,
      emissive: 0x440000,
      emissiveIntensity: 0.3
    });

    // Large armored torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.6), bodyMaterial);
    torso.position.y = 1.5;
    torso.castShadow = true;
    torso.name = 'torso';
    group.add(torso);

    // Menacing head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5), 
      new THREE.MeshStandardMaterial({ 
        color: 0x3A3A48, 
        emissive: 0xff0000, 
        emissiveIntensity: 0.6,
        roughness: 0.9,
        metalness: 0 
      })
    );
    head.position.y = 2.5;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    // Glowing red eyes
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    [-0.15, 0.15].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMaterial);
      eye.position.set(x, 2.5, 0.26);
      group.add(eye);
      
      // Add eye glow
      const eyeLight = new THREE.PointLight(0xff0000, 1, 3);
      eyeLight.position.copy(eye.position);
      group.add(eyeLight);
    });

    // Shoulder pads
    [-0.6, 0.6].forEach(x => {
      const shoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.4, 0.4),
        bodyMaterial
      );
      shoulder.position.set(x, 2.1, 0);
      shoulder.castShadow = true;
      group.add(shoulder);
    });

    // Massive arms
    const armGeo = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    leftArm.position.set(-0.7, 1.3, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    rightArm.position.set(0.7, 1.3, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Heavy legs
    const legGeo = new THREE.CapsuleGeometry(0.18, 0.8, 4, 8);
    [-0.3, 0.3].forEach(x => {
      const leg = new THREE.Mesh(legGeo, bodyMaterial);
      leg.position.set(x, 0.5, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    // Mini-gun weapon
    const weapon = new THREE.Group();
    const barrels = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x4A4A58, metalness: 0, roughness: 0.9 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.x = Math.cos(angle) * 0.15;
      barrel.position.y = Math.sin(angle) * 0.15;
      barrels.add(barrel);
    }
    weapon.add(barrels);
    weapon.position.set(0.8, 1.3, 0.4);
    weapon.name = 'weapon';
    group.add(weapon);

    // Boss health bar (larger)
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    healthBarBg.position.y = 3.5;
    healthBarBg.name = 'healthBarBg';
    group.add(healthBarBg);

    const healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    healthBarFill.position.y = 3.5;
    healthBarFill.position.z = 0.01;
    healthBarFill.name = 'healthBarFill';
    group.add(healthBarFill);

    return group;
  }
  
  // Set terrain height function for ground following
  public setTerrainHeightFunction(fn: (x: number, z: number) => number): void {
    this.getTerrainHeight = fn;
  }
  
  // Set colliders for obstacle avoidance
  public setColliders(colliders: THREE.Box3[]): void {
    this.colliders = colliders;
  }

  private createWeaponMesh(): THREE.Group {
    const weapon = new THREE.Group();
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x5A5A68, metalness: 0, roughness: 0.9 });
    if (this.type === 'heavy') {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), gunMaterial);
      barrel.rotation.x = Math.PI / 2;
      weapon.add(barrel);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.6), gunMaterial);
      weapon.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), gunMaterial);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.4;
      weapon.add(barrel);
    }
    return weapon;
  }

  public update(delta: number, playerPosition: THREE.Vector3): void {
    if (this.dead) return;

    if (this.isDying) {
      this.deathTimer += delta;
      this.mesh.rotation.x = Math.min(Math.PI / 2, this.deathTimer * 3);
      this.mesh.position.y = Math.max(-0.5, 0 - this.deathTimer);
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.isHit) {
      this.hitTimer -= delta;
      if (this.hitTimer <= 0) this.isHit = false;
    }

    const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    direction.y = 0;
    const distance = direction.length();
    const attackRange = this.type === 'smg' ? 8 : this.type === 'heavy' ? 15 : 12;

    if (distance > attackRange) {
      direction.normalize();
      const moveSpeed = this.isHit ? this.speed * 0.3 : this.speed;
      
      // Calculate new position
      const newX = this.mesh.position.x + direction.x * moveSpeed * delta;
      const newZ = this.mesh.position.z + direction.z * moveSpeed * delta;
      
      // Check for collisions with buildings/obstacles
      const testBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newX, this.mesh.position.y + 1, newZ),
        new THREE.Vector3(1, 2, 1)
      );
      
      let canMove = true;
      for (const collider of this.colliders) {
        if (testBox.intersectsBox(collider)) {
          canMove = false;
          break;
        }
      }
      
      if (canMove) {
        this.mesh.position.x = newX;
        this.mesh.position.z = newZ;
      } else {
        // Try to move around obstacle - slide along it
        const slideX = this.mesh.position.x + direction.x * moveSpeed * delta;
        const slideZ = this.mesh.position.z;
        const testBoxX = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(slideX, this.mesh.position.y + 1, slideZ),
          new THREE.Vector3(1, 2, 1)
        );
        
        let canSlideX = true;
        for (const collider of this.colliders) {
          if (testBoxX.intersectsBox(collider)) {
            canSlideX = false;
            break;
          }
        }
        
        if (canSlideX) {
          this.mesh.position.x = slideX;
        } else {
          // Try Z slide
          const testBoxZ = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z + direction.z * moveSpeed * delta),
            new THREE.Vector3(1, 2, 1)
          );
          
          let canSlideZ = true;
          for (const collider of this.colliders) {
            if (testBoxZ.intersectsBox(collider)) {
              canSlideZ = false;
              break;
            }
          }
          
          if (canSlideZ) {
            this.mesh.position.z += direction.z * moveSpeed * delta;
          }
        }
      }
      
      // Follow terrain height
      if (this.getTerrainHeight) {
        const groundHeight = this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        this.mesh.position.y = groundHeight;
      }
      
      this.walkCycle += delta * this.speed * 2;
      this.animateWalk();
    } else {
      this.resetPose();
      
      // Still follow terrain when stationary
      if (this.getTerrainHeight) {
        const groundHeight = this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        this.mesh.position.y = groundHeight;
      }
    }

    this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    this.updateHealthBar();
  }

  private animateWalk(): void {
    const leftLeg = this.mesh.getObjectByName('leftLeg') as THREE.Mesh;
    const rightLeg = this.mesh.getObjectByName('rightLeg') as THREE.Mesh;
    const leftArm = this.mesh.getObjectByName('leftArm') as THREE.Mesh;
    const rightArm = this.mesh.getObjectByName('rightArm') as THREE.Mesh;
    if (leftLeg && rightLeg) {
      leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.5;
      rightLeg.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.5;
    }
    if (leftArm && rightArm) {
      leftArm.rotation.x = Math.sin(this.walkCycle + Math.PI) * 0.3;
      rightArm.rotation.x = Math.sin(this.walkCycle) * 0.3;
    }
  }

  private resetPose(): void {
    ['leftLeg', 'rightLeg', 'leftArm', 'rightArm'].forEach(name => {
      const part = this.mesh.getObjectByName(name) as THREE.Mesh;
      if (part) part.rotation.x *= 0.9;
    });
  }

  private updateHealthBar(): void {
    const healthBarFill = this.mesh.getObjectByName('healthBarFill') as THREE.Mesh;
    if (healthBarFill) {
      const healthPercent = this.health / this.maxHealth;
      healthBarFill.scale.x = Math.max(0.01, healthPercent);
      healthBarFill.position.x = -(1 - healthPercent) * 0.4;
      const material = healthBarFill.material as THREE.MeshBasicMaterial;
      if (healthPercent > 0.5) material.color.setHex(0x00ff00);
      else if (healthPercent > 0.25) material.color.setHex(0xffff00);
      else material.color.setHex(0xff0000);
    }
  }

  public takeDamage(amount: number, isHeadshot: boolean = false): void {
    const finalDamage = isHeadshot ? amount * 2 : amount;
    this.health -= finalDamage;
    this.isHit = true;
    this.hitTimer = 0.2;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.name.includes('healthBar')) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          const original = mat.color.getHex();
          mat.color.setHex(0xffffff);
          setTimeout(() => mat.color.setHex(original), 80);
        }
      }
    });
    if (this.health <= 0) this.isDying = true;
  }

  public canAttack(): boolean {
    return this.attackCooldown <= 0 && !this.dead && !this.isDying && !this.isHit;
  }

  public attack(): void {
    this.attackCooldown = 1 / this.attackRate;
  }

  public getDamage(): number {
    return this.damage;
  }

  public getType(): EnemyType {
    return this.type;
  }

  public getHeadPosition(): THREE.Vector3 {
    const head = this.mesh.getObjectByName('head') as THREE.Mesh;
    if (head) {
      const worldPos = new THREE.Vector3();
      head.getWorldPosition(worldPos);
      return worldPos;
    }
    return this.mesh.position.clone().add(new THREE.Vector3(0, 1.85, 0));
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }

  public destroy(): void {
    this.dead = true;
    this.scene.remove(this.mesh);
    
    // Cleanup geometry and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
