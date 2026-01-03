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

    // Sky gradient from palette
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#CFE9FF');    // Sky from palette
    gradient.addColorStop(0.3, '#DAF0FF');  // Lighter sky
    gradient.addColorStop(0.6, '#E8F6FF');  // Very light
    gradient.addColorStop(0.85, '#FFF8F0'); // Warm hint
    gradient.addColorStop(1, '#FFEDDC');    // Warm horizon
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

    // Warm directional light (off-white)
    this.sun = new THREE.DirectionalLight(0xFFF8E8, 1.2);
    this.sun.position.copy(pos);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.radius = 4; // Soft shadow edges
    this.scene.add(this.sun);

    // Strong ambient for even lighting (soft off-white)
    this.scene.add(new THREE.AmbientLight(0xFFF8F0, 0.7));
    
    // Hemisphere: sky color to ground color from palette
    this.scene.add(new THREE.HemisphereLight(0xCFE9FF, 0xB7D3A8, 0.5));
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
