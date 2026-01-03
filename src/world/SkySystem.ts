import * as THREE from 'three';

export class SkySystem {
  private scene: THREE.Scene;
  private sun!: THREE.DirectionalLight;
  private clouds: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSky();
    this.createSun();
    this.createClouds();
  }

  private createSky(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Soft pastel sky gradient - airy and colorful, not white or foggy
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#CFE9FF');    // Top: soft sky blue
    gradient.addColorStop(0.4, '#D8EFFF');  // Mid-upper: slightly lighter
    gradient.addColorStop(0.7, '#E2F3FF');  // Mid-lower: pastel
    gradient.addColorStop(1, '#EAF6FF');    // Horizon: very light blue (no white)
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 32),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
    );
    this.scene.add(sky);
  }

  private createSun(): void {
    const pos = new THREE.Vector3(100, 80, 60);

    // Cute cartoon sun - warm off-white (no pure white)
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(15, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xFFE8B8 })
    );
    sun.position.copy(pos);
    this.scene.add(sun);

    // Soft glow using character color
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(25, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xF4A261, transparent: true, opacity: 0.35 })
    );
    glow.position.copy(pos);
    this.scene.add(glow);

    // === BRIGHT LIGHTING SETUP - Scene must never appear dark ===
    
    // 1. Bright ambient light - ensures no dark areas
    const ambient = new THREE.AmbientLight(0xFFF8F0, 1.0);
    this.scene.add(ambient);

    // 2. Warm directional sun light with soft shadows
    this.sun = new THREE.DirectionalLight(0xFFF5E0, 0.8);
    this.sun.position.copy(pos);
    this.sun.castShadow = true;
    
    // Soft PCF shadow settings
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 8; // Very soft shadow edges
    this.scene.add(this.sun);
  }

  private createClouds(): void {
    // Puffy cartoon clouds
    const cloudMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF, 
      roughness: 1,
      metalness: 0
    });
    
    for (let i = 0; i < 30; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 4);
      
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(6 + Math.random() * 8, 16, 16),
          cloudMat
        );
        puff.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 10
        );
        puff.scale.y = 0.6;
        cloud.add(puff);
      }
      
      cloud.position.set(
        (Math.random() - 0.5) * 600,
        80 + Math.random() * 50,
        (Math.random() - 0.5) * 600
      );
      this.clouds.push(cloud as unknown as THREE.Mesh);
      this.scene.add(cloud);
    }
  }

  public update(delta: number): void {
    this.clouds.forEach(c => {
      c.position.x += delta * 3;
      if (c.position.x > 300) c.position.x = -300;
    });
  }
}
