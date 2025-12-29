import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private dustParticles!: THREE.Points;
  private smokeColumns: THREE.Points[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createDustParticles();
    this.createSmokeColumns();
  }

  private createDustParticles(): void {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = Math.random() * 0.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: 0xc9a66a,
      size: 0.3,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  private createSmokeColumns(): void {
    const smokePositions = [
      { x: 45, z: 45 },
      { x: -50, z: 35 },
      { x: 60, z: -45 },
      { x: -70, z: -20 },
    ];

    smokePositions.forEach(pos => {
      const smoke = this.createSmokeColumn(pos.x, pos.z);
      this.smokeColumns.push(smoke);
      this.scene.add(smoke);
    });
  }

  private createSmokeColumn(x: number, z: number): THREE.Points {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const height = (i / particleCount) * 30;
      const spread = height * 0.3;
      
      positions[i * 3] = x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * spread;

      sizes[i] = 1 + (height / 30) * 4;
      alphas[i] = 1 - (height / 30);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0x333333,
      size: 3,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  public update(delta: number): void {
    // Animate dust particles (wind effect)
    const positions = this.dustParticles.geometry.attributes.position.array as Float32Array;
    const velocities = this.dustParticles.geometry.attributes.velocity.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += velocities[i] * delta;
      positions[i + 1] += velocities[i + 1] * delta;
      positions[i + 2] += velocities[i + 2] * delta;

      // Reset particles that go too far
      if (positions[i] > 100) positions[i] = -100;
      if (positions[i] < -100) positions[i] = 100;
      if (positions[i + 1] > 10) positions[i + 1] = 0;
      if (positions[i + 2] > 100) positions[i + 2] = -100;
      if (positions[i + 2] < -100) positions[i + 2] = 100;
    }

    this.dustParticles.geometry.attributes.position.needsUpdate = true;

    // Animate smoke columns
    this.smokeColumns.forEach(smoke => {
      const pos = smoke.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += (Math.random() - 0.5) * 0.1;
        pos[i + 1] += delta * 2;
        pos[i + 2] += (Math.random() - 0.5) * 0.1;

        if (pos[i + 1] > 30) {
          pos[i + 1] = 0;
        }
      }
      smoke.geometry.attributes.position.needsUpdate = true;
    });
  }

  public createExplosion(position: THREE.Vector3): void {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 15,
        (Math.random() - 0.5) * 20
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.5,
      transparent: true,
      opacity: 1
    });

    const explosion = new THREE.Points(geometry, material);
    this.scene.add(explosion);

    // Animate explosion
    let time = 0;
    const animate = () => {
      time += 0.016;
      const pos = explosion.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x * 0.016;
        pos[i * 3 + 1] += velocities[i].y * 0.016;
        pos[i * 3 + 2] += velocities[i].z * 0.016;
        velocities[i].y -= 20 * 0.016; // Gravity
      }

      explosion.geometry.attributes.position.needsUpdate = true;
      (explosion.material as THREE.PointsMaterial).opacity = 1 - time;

      if (time < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(explosion);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  public createMuzzleFlash(position: THREE.Vector3): void {
    const flash = new THREE.PointLight(0xffaa00, 5, 5);
    flash.position.copy(position);
    this.scene.add(flash);

    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
    }, 50);
  }
}
