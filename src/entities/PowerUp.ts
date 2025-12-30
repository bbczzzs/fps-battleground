import * as THREE from 'three';

export type PowerUpType = 'health' | 'ammo' | 'speed' | 'shield' | 'damage';

interface PowerUpConfig {
  color: number;
  emissive: number;
  value: number;
  description: string;
}

const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  health: { color: 0x00ff00, emissive: 0x00ff00, value: 50, description: '+50 Health' },
  ammo: { color: 0xffaa00, emissive: 0xff8800, value: 60, description: '+60 Ammo' },
  speed: { color: 0x00aaff, emissive: 0x0088ff, value: 5, description: 'Speed Boost' },
  shield: { color: 0xaa00ff, emissive: 0x8800ff, value: 50, description: '+50 Shield' },
  damage: { color: 0xff0000, emissive: 0xff0000, value: 2, description: '2x Damage' }
};

export class PowerUp {
  private mesh: THREE.Group;
  private scene: THREE.Scene;
  private type: PowerUpType;
  private rotation = 0;
  private bobOffset = 0;
  private collected = false;
  private collectEffect: THREE.Group | null = null;
  private glowParticles: THREE.Points[] = [];

  constructor(scene: THREE.Scene, position: THREE.Vector3, type: PowerUpType) {
    this.scene = scene;
    this.type = type;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.mesh.position.y += 1.5;
    this.createGlowParticles();
    scene.add(this.mesh);
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    const config = POWERUP_CONFIGS[this.type];

    // Main core
    const coreGeo = new THREE.OctahedronGeometry(0.4, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.emissive,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = true;
    group.add(core);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.emissive,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Add point light
    const light = new THREE.PointLight(config.color, 2, 10);
    light.castShadow = false;
    group.add(light);

    return group;
  }

  private createGlowParticles(): void {
    const config = POWERUP_CONFIGS[this.type];
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: config.color,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    this.mesh.add(particles);
    this.glowParticles.push(particles);
  }

  public update(delta: number): void {
    if (this.collected) {
      this.updateCollectEffect(delta);
      return;
    }

    // Rotate power-up
    this.rotation += delta * 2;
    this.mesh.rotation.y = this.rotation;

    // Bob up and down
    this.bobOffset += delta * 3;
    this.mesh.position.y += Math.sin(this.bobOffset) * 0.01;

    // Animate particles
    this.glowParticles.forEach(particles => {
      particles.rotation.y += delta;
      particles.rotation.x += delta * 0.5;
    });
  }

  private updateCollectEffect(delta: number): void {
    if (this.collectEffect) {
      this.collectEffect.scale.multiplyScalar(1 + delta * 5);
      this.collectEffect.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.opacity -= delta * 2;
        }
      });
    }
  }

  public collect(): void {
    if (this.collected) return;
    
    this.collected = true;
    
    // Create collection effect
    const config = POWERUP_CONFIGS[this.type];
    const effectGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const effectMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8
    });
    this.collectEffect = new THREE.Group();
    const sphere = new THREE.Mesh(effectGeo, effectMat);
    this.collectEffect.add(sphere);
    this.collectEffect.position.copy(this.mesh.position);
    this.scene.add(this.collectEffect);

    // Remove original mesh
    this.scene.remove(this.mesh);

    // Remove effect after animation
    setTimeout(() => {
      if (this.collectEffect) {
        this.scene.remove(this.collectEffect);
      }
    }, 500);
  }

  public checkCollision(position: THREE.Vector3): boolean {
    if (this.collected) return false;
    
    const distance = this.mesh.position.distanceTo(position);
    return distance < 1.5;
  }

  public getType(): PowerUpType {
    return this.type;
  }

  public getValue(): number {
    return POWERUP_CONFIGS[this.type].value;
  }

  public getDescription(): string {
    return POWERUP_CONFIGS[this.type].description;
  }

  public isCollected(): boolean {
    return this.collected;
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
    if (this.collectEffect) {
      this.scene.remove(this.collectEffect);
    }
  }
}
