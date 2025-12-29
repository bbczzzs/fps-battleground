import * as THREE from 'three';

export type EnemyType = 'rifle' | 'smg' | 'heavy';

interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  attackRate: number;
  color: number;
  scale: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  rifle: { health: 80, speed: 2.5, damage: 15, attackRate: 0.8, color: 0x4a5568, scale: 1 },
  smg: { health: 60, speed: 5, damage: 8, attackRate: 2, color: 0x744210, scale: 0.9 },
  heavy: { health: 200, speed: 1.5, damage: 25, attackRate: 0.5, color: 0x1a202c, scale: 1.3 }
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
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.7 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), bodyMaterial);
    torso.position.y = 1.2;
    torso.castShadow = true;
    torso.name = 'torso';
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skinMaterial);
    head.position.y = 1.85;
    head.castShadow = true;
    head.name = 'head';
    group.add(head);

    // Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.5 })
    );
    helmet.position.y = 1.9;
    helmet.castShadow = true;
    group.add(helmet);

    // Eyes (glowing red)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    [-0.08, 0.08].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMaterial);
      eye.position.set(x, 1.88, 0.18);
      group.add(eye);
    });

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.5, 4, 8);
    const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
    leftArm.position.set(-0.45, 1.1, 0);
    leftArm.rotation.z = 0.2;
    leftArm.castShadow = true;
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
    rightArm.position.set(0.45, 1.1, 0);
    rightArm.rotation.z = -0.2;
    rightArm.castShadow = true;
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, bodyMaterial);
    leftLeg.position.set(-0.18, 0.4, 0);
    leftLeg.castShadow = true;
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMaterial);
    rightLeg.position.set(0.18, 0.4, 0);
    rightLeg.castShadow = true;
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    // Weapon
    const weapon = this.createWeaponMesh();
    weapon.position.set(0.5, 1.1, 0.3);
    weapon.name = 'weapon';
    group.add(weapon);

    // Health bar
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    healthBarBg.position.y = 2.3;
    healthBarBg.name = 'healthBarBg';
    group.add(healthBarBg);

    const healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    healthBarFill.position.y = 2.3;
    healthBarFill.position.z = 0.01;
    healthBarFill.name = 'healthBarFill';
    group.add(healthBarFill);

    return group;
  }

  private createWeaponMesh(): THREE.Group {
    const weapon = new THREE.Group();
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.5 });
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
      this.mesh.position.x += direction.x * moveSpeed * delta;
      this.mesh.position.z += direction.z * moveSpeed * delta;
      this.walkCycle += delta * this.speed * 2;
      this.animateWalk();
    } else {
      this.resetPose();
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
