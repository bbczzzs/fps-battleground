import * as THREE from 'three';

export class Helicopter {
  private scene: THREE.Scene;
  private mesh: THREE.Group;
  private rotor!: THREE.Mesh;
  private tailRotor!: THREE.Mesh;
  private shadow!: THREE.Mesh;
  private path: THREE.Vector3[];
  private pathIndex = 0;
  private speed = 15;
  private rotorSpeed = 20;
  private time = 0;

  constructor(scene: THREE.Scene, startPosition: THREE.Vector3) {
    this.scene = scene;
    this.mesh = this.createHelicopter();
    this.mesh.position.copy(startPosition);
    this.mesh.position.y = 40 + Math.random() * 20;
    
    // Create flight path
    this.path = this.generatePath();
    
    // Create ground shadow
    this.createShadow();
    
    scene.add(this.mesh);
  }

  private createHelicopter(): THREE.Group {
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3f2a,
      roughness: 0.6,
      metalness: 0.3
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.5, 4, 8, 16),
      bodyMaterial
    );
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // Cockpit (glass)
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.5
      })
    );
    cockpit.position.set(2.5, 0.3, 0);
    cockpit.rotation.z = -Math.PI / 2;
    group.add(cockpit);

    // Tail boom
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 5, 8),
      bodyMaterial
    );
    tail.position.set(-4, 0.5, 0);
    tail.rotation.z = Math.PI / 2;
    tail.castShadow = true;
    group.add(tail);

    // Tail fin
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2, 0.2),
      bodyMaterial
    );
    fin.position.set(-6, 1, 0);
    group.add(fin);

    // Main rotor hub
    const rotorHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    rotorHub.position.y = 1.8;
    group.add(rotorHub);

    // Main rotor blades
    this.rotor = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
    );
    this.rotor.position.y = 2;
    group.add(this.rotor);

    // Second rotor blade
    const rotor2 = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.1, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
    );
    rotor2.rotation.y = Math.PI / 2;
    this.rotor.add(rotor2);

    // Tail rotor
    this.tailRotor = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    this.tailRotor.position.set(-6.5, 1, 0.3);
    this.tailRotor.rotation.x = Math.PI / 2;
    group.add(this.tailRotor);

    // Landing skids
    const skidMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    [-1, 1].forEach(side => {
      const skid = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.15, 0.15),
        skidMaterial
      );
      skid.position.set(0, -1.5, side * 1.2);
      group.add(skid);

      // Skid struts
      [-1, 1].forEach(strut => {
        const strutMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
          skidMaterial
        );
        strutMesh.position.set(strut * 1.2, -1, side * 1.2);
        strutMesh.rotation.z = strut * 0.2;
        group.add(strutMesh);
      });
    });

    // Scale helicopter
    group.scale.setScalar(2);

    return group;
  }

  private createShadow(): void {
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3
      })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.1;
    this.scene.add(this.shadow);
  }

  private generatePath(): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const numPoints = 8;
    const radius = 80 + Math.random() * 40;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        40 + Math.random() * 20,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 30
      ));
    }

    return points;
  }

  public update(delta: number): void {
    this.time += delta;

    // Rotate rotors
    this.rotor.rotation.y += this.rotorSpeed * delta;
    this.tailRotor.rotation.y += this.rotorSpeed * 1.5 * delta;

    // Follow path
    const target = this.path[this.pathIndex];
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    const distance = direction.length();

    if (distance < 5) {
      this.pathIndex = (this.pathIndex + 1) % this.path.length;
    } else {
      direction.normalize();
      this.mesh.position.add(direction.multiplyScalar(this.speed * delta));

      // Bank into turns
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        targetRotation,
        delta * 2
      );

      // Tilt based on movement
      this.mesh.rotation.z = direction.x * 0.2;
      this.mesh.rotation.x = -direction.z * 0.1;
    }

    // Subtle hover motion
    this.mesh.position.y += Math.sin(this.time * 2) * 0.02;

    // Update shadow position
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.position.z = this.mesh.position.z;
    
    // Scale shadow based on height
    const heightScale = 1 - (this.mesh.position.y - 30) / 50;
    this.shadow.scale.setScalar(Math.max(0.5, heightScale));
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
    this.scene.remove(this.shadow);
  }
}
