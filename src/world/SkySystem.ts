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

    // VIBRANT Fall Guys sky - bright saturated blue!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#22AAFF');    // Top: bright cyan blue
    gradient.addColorStop(0.3, '#44BBFF');  // Upper: saturated sky blue
    gradient.addColorStop(0.6, '#66CCFF');  // Mid: bright blue
    gradient.addColorStop(1, '#99DDFF');    // Horizon: light cyan
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
    const pos = new THREE.Vector3(100, 120, 80); // Higher sun for better highlight angles

    // Cute cartoon sun - bright warm yellow
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(15, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xFFEE55 })
    );
    sun.position.copy(pos);
    this.scene.add(sun);

    // Bright glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(25, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xFFCC33, transparent: true, opacity: 0.4 })
    );
    glow.position.copy(pos);
    this.scene.add(glow);

    // === VIBRANT LIGHTING for Fall Guys look ===
    
    // 1. Bright warm ambient - fills everything with color
    const ambient = new THREE.AmbientLight(0xFFFFEE, 0.8);
    this.scene.add(ambient);

    // 2. Strong warm directional sun
    this.sun = new THREE.DirectionalLight(0xFFFFDD, 1.4);
    this.sun.position.copy(pos);
    this.sun.castShadow = true;
    
    // Soft light gray shadows - not dark, not flat
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.015;
    this.sun.shadow.radius = 5; // Soft but visible shadow edges
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
