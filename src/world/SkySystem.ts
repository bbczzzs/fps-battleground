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
    this.createFog();
  }

  private createSky(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Cinematic sunset gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0f1a');
    gradient.addColorStop(0.25, '#1a2d4d');
    gradient.addColorStop(0.45, '#4a5a7a');
    gradient.addColorStop(0.6, '#c97b4a');
    gradient.addColorStop(0.75, '#e8a060');
    gradient.addColorStop(1, '#f4c484');
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
    const pos = new THREE.Vector3(120, 38, 100);

    // Sun core
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe8c0 })
    );
    sun.position.copy(pos);
    this.scene.add(sun);

    // Glow layers
    [{ s: 18, c: 0xffcc70, o: 0.35 }, { s: 28, c: 0xff8840, o: 0.12 }].forEach(g => {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(g.s, 24, 24),
        new THREE.MeshBasicMaterial({ color: g.c, transparent: true, opacity: g.o })
      );
      glow.position.copy(pos);
      this.scene.add(glow);
    });

    // Directional light
    this.sun = new THREE.DirectionalLight(0xffeedd, 1.6);
    this.sun.position.copy(pos);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 350;
    this.sun.shadow.camera.left = -120;
    this.sun.shadow.camera.right = 120;
    this.sun.shadow.camera.top = 120;
    this.sun.shadow.camera.bottom = -120;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);

    // Ambient + hemisphere
    this.scene.add(new THREE.AmbientLight(0xc9a066, 0.35));
    this.scene.add(new THREE.HemisphereLight(0xc9a066, 0x445544, 0.45));
  }

  private createClouds(): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8d8c8, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 25; i++) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(8 + Math.random() * 12, 8, 6), mat);
      cloud.position.set((Math.random() - 0.5) * 500, 70 + Math.random() * 40, (Math.random() - 0.5) * 500);
      cloud.scale.set(1 + Math.random(), 0.4, 1 + Math.random());
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  private createFog(): void {
    this.scene.fog = new THREE.FogExp2(0xc9a66a, 0.006);
  }

  public update(delta: number): void {
    // Drift clouds
    this.clouds.forEach(c => {
      c.position.x += delta * 2;
      if (c.position.x > 250) c.position.x = -250;
    });
  }
}
