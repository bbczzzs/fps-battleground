import * as THREE from 'three';

export class SkySystem {
  private scene: THREE.Scene;
  private sun!: THREE.DirectionalLight;
  private sky!: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSky();
    this.createSun();
    this.createClouds();
    this.createFog();
  }

  private createSky(): void {
    // Gradient sky dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    
    // Create gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Evening/war sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a1a2e');    // Top - dark blue
    gradient.addColorStop(0.3, '#4a4a6a');  // Upper - purple gray
    gradient.addColorStop(0.5, '#d4a574');  // Middle - dusty orange
    gradient.addColorStop(0.7, '#e8b87a');  // Lower - warm orange
    gradient.addColorStop(1, '#c9a66a');    // Horizon - golden
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);
    
    const skyTexture = new THREE.CanvasTexture(canvas);
    
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide
    });
    
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
  }

  private createSun(): void {
    // Sun position for evening look
    const sunPosition = new THREE.Vector3(100, 30, 80);

    // Sun visual
    const sunGeo = new THREE.SphereGeometry(8, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd88
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPosition);
    this.scene.add(sunMesh);

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(12, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(sunPosition);
    this.scene.add(glowMesh);

    // Main directional light (sun)
    this.sun = new THREE.DirectionalLight(0xffdd99, 1.2);
    this.sun.position.copy(sunPosition);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 4096;
    this.sun.shadow.mapSize.height = 4096;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.sun.shadow.bias = -0.0001;
    this.scene.add(this.sun);

    // Ambient light with warm tint
    const ambient = new THREE.AmbientLight(0xd4a574, 0.4);
    this.scene.add(ambient);

    // Hemisphere light (sky/ground colors)
    const hemi = new THREE.HemisphereLight(0xd4a574, 0x3d4a3d, 0.5);
    this.scene.add(hemi);
  }

  private createClouds(): void {
    for (let i = 0; i < 20; i++) {
      const cloud = this.createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 400,
        60 + Math.random() * 40,
        (Math.random() - 0.5) * 400
      );
      cloud.scale.setScalar(2 + Math.random() * 3);
      this.scene.add(cloud);
    }
  }

  private createCloud(): THREE.Group {
    const cloud = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xeeddcc,
      transparent: true,
      opacity: 0.7
    });

    // Create cloud from multiple spheres
    const numPuffs = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numPuffs; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(3 + Math.random() * 2, 8, 8),
        cloudMat
      );
      puff.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 10
      );
      puff.scale.y = 0.6;
      cloud.add(puff);
    }

    return cloud;
  }

  private createFog(): void {
    // Distance fog for battlefield atmosphere
    this.scene.fog = new THREE.Fog(0xc9a66a, 30, 200);
  }

  public update(_delta: number): void {
    // Could add cloud movement here
  }
}
