import * as THREE from 'three';

export class Projectile {
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  private velocity: THREE.Vector3;
  private lifeTime = 0;
  private maxLifeTime = 3;
  public damage = 25;

  constructor(
    scene: THREE.Scene, 
    position: THREE.Vector3, 
    direction: THREE.Vector3,
    speed: number = 50
  ) {
    this.scene = scene;
    this.velocity = direction.normalize().multiplyScalar(speed);

    // Create bullet mesh
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffff00
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // Add trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00,
      transparent: true,
      opacity: 0.5
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -0.15;
    this.mesh.add(trail);

    // Orient bullet in direction of travel
    this.mesh.lookAt(position.clone().add(direction));

    scene.add(this.mesh);
  }

  public update(delta: number): void {
    this.lifeTime += delta;
    
    // Move projectile
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;
    this.mesh.position.z += this.velocity.z * delta;
  }

  public isExpired(): boolean {
    return this.lifeTime >= this.maxLifeTime || 
           this.mesh.position.y < 0 ||
           Math.abs(this.mesh.position.x) > 100 ||
           Math.abs(this.mesh.position.z) > 100;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getDamage(): number {
    return this.damage;
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
