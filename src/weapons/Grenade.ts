import * as THREE from 'three';
import { ParticleSystem } from '../effects/ParticleSystem';

export class Grenade {
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  private velocity: THREE.Vector3;
  private position: THREE.Vector3;
  private rotation = new THREE.Vector3();
  private fuseTime = 3.0;
  private timer = 0;
  private exploded = false;
  private gravity = 20;
  private bounceCount = 0;
  private maxBounces = 3;
  private bounceDamping = 0.6;
  private particleSystem: ParticleSystem;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    throwForce: number,
    particleSystem: ParticleSystem
  ) {
    this.scene = scene;
    this.position = position.clone();
    this.velocity = direction.clone().multiplyScalar(throwForce);
    this.particleSystem = particleSystem;

    // Create grenade mesh
    this.mesh = this.createGrenadeMesh();
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  private createGrenadeMesh(): THREE.Mesh {
    // Cute cartoon bomb - using accent color from palette!
    const geometry = new THREE.SphereGeometry(0.18, 16, 12);
    const material = new THREE.MeshStandardMaterial({
      color: 0xE76F51,  // Accent from palette
      metalness: 0,
      roughness: 0.9
    });

    const grenade = new THREE.Mesh(geometry, material);
    grenade.castShadow = true;

    // Add cute fuse/sparkle on top
    const fuseGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8);
    const fuseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD166,  // Building yellow from palette
      roughness: 0.9,
      metalness: 0
    });
    const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
    fuse.position.y = 0.2;
    grenade.add(fuse);
    
    // Sparkle tip - soft off-white (no pure white)
    const sparkleGeometry = new THREE.SphereGeometry(0.04, 8, 6);
    const sparkleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFF8F0,
      emissive: 0xFFD166,
      emissiveIntensity: 0.5,
      roughness: 0.8,
      metalness: 0
    });
    const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
    sparkle.position.y = 0.26;
    grenade.add(sparkle);

    return grenade;
  }

  public update(delta: number, getTerrainHeight: (x: number, z: number) => number): boolean {
    if (this.exploded) return true;

    this.timer += delta;

    // Check fuse time
    if (this.timer >= this.fuseTime) {
      this.explode();
      return true;
    }

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(delta));

    // Check ground collision
    const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= terrainHeight + 0.15) {
      this.position.y = terrainHeight + 0.15;

      // Bounce
      if (this.bounceCount < this.maxBounces) {
        this.velocity.y = Math.abs(this.velocity.y) * this.bounceDamping;
        this.velocity.x *= 0.8;
        this.velocity.z *= 0.8;
        this.bounceCount++;
      } else {
        // Stop bouncing
        this.velocity.y = 0;
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
      }
    }

    // Update rotation for visual effect
    this.rotation.x += delta * 5;
    this.rotation.z += delta * 3;
    this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Flash red when about to explode
    if (this.timer > this.fuseTime - 1) {
      const flashIntensity = Math.sin(this.timer * 20) * 0.5 + 0.5;
      const material = this.mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0xff0000);
      material.emissiveIntensity = flashIntensity;
    }

    return false;
  }

  private explode(): void {
    this.exploded = true;

    // Create explosion effect
    this.particleSystem.createExplosion(this.position);

    // Create explosion light
    const explosionLight = new THREE.PointLight(0xff6600, 10, 30);
    explosionLight.position.copy(this.position);
    this.scene.add(explosionLight);

    // Fade out light
    let lightIntensity = 10;
    const fadeInterval = setInterval(() => {
      lightIntensity -= 0.5;
      explosionLight.intensity = lightIntensity;
      if (lightIntensity <= 0) {
        this.scene.remove(explosionLight);
        clearInterval(fadeInterval);
      }
    }, 50);

    // Remove grenade mesh
    this.scene.remove(this.mesh);
  }

  public getPosition(): THREE.Vector3 {
    return this.position;
  }

  public hasExploded(): boolean {
    return this.exploded;
  }

  public getExplosionRadius(): number {
    return 8; // Damage radius
  }

  public getExplosionDamage(): number {
    return 75; // Base damage at center
  }

  public destroy(): void {
    if (this.mesh.parent) {
      this.scene.remove(this.mesh);
    }
  }
}

export class GrenadeSystem {
  private grenades: Grenade[] = [];
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private grenadeCount = 3;
  private maxGrenades = 5;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
  }

  public throwGrenade(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    throwForce: number = 15
  ): boolean {
    if (this.grenadeCount <= 0) return false;

    const grenade = new Grenade(
      this.scene,
      position,
      direction,
      throwForce,
      this.particleSystem
    );

    this.grenades.push(grenade);
    this.grenadeCount--;
    return true;
  }

  public update(delta: number, getTerrainHeight: (x: number, z: number) => number): void {
    // Update all grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const exploded = this.grenades[i].update(delta, getTerrainHeight);
      if (exploded) {
        this.grenades[i].destroy();
        this.grenades.splice(i, 1);
      }
    }
  }

  public getActiveGrenades(): Grenade[] {
    return this.grenades.filter(g => g.hasExploded());
  }

  public getAllGrenades(): Grenade[] {
    return this.grenades;
  }

  public addGrenade(count: number = 1): void {
    this.grenadeCount = Math.min(this.grenadeCount + count, this.maxGrenades);
  }

  public getGrenadeCount(): number {
    return this.grenadeCount;
  }

  public setMaxGrenades(max: number): void {
    this.maxGrenades = max;
  }
}
