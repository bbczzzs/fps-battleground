import * as THREE from 'three';

export type PowerUpType = 'health' | 'ammo' | 'speed' | 'shield' | 'damage';

interface PowerUpConfig {
  color: number;
  emissive: number;
  value: number;
  description: string;
}

// Cute cartoon pastel colors for powerups
const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  health: { color: 0xFF6B6B, emissive: 0xFF6B6B, value: 50, description: '+50 Health' },
  ammo: { color: 0xFFE66D, emissive: 0xFFE66D, value: 60, description: '+60 Ammo' },
  speed: { color: 0x4ECDC4, emissive: 0x4ECDC4, value: 5, description: 'Speed Boost' },
  shield: { color: 0x9B59B6, emissive: 0x9B59B6, value: 50, description: '+50 Shield' },
  damage: { color: 0xFF6B6B, emissive: 0xFF6B6B, value: 2, description: '2x Damage' }
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

    // Cute cartoon star/candy shape
    const coreGeo = new THREE.SphereGeometry(0.5, 12, 8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.emissive,
      emissiveIntensity: 0.4,
      metalness: 0,
      roughness: 0.8
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = true;
    group.add(core);

    // Cute puffy ring
    const ringGeo = new THREE.TorusGeometry(0.7, 0.12, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      emissive: config.emissive,
      emissiveIntensity: 0.2,
      metalness: 0,
      roughness: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Add soft glow light
    const light = new THREE.PointLight(config.color, 1.5, 8);
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
