import * as THREE from 'three';
import { InputManager } from '../utils/InputManager';

export enum VehicleType {
  CAR = 'car',
  HELICOPTER = 'helicopter',
  PLANE = 'plane'
}

export class Vehicle {
  protected scene: THREE.Scene;
  protected mesh: THREE.Group;
  protected type: VehicleType;
  protected isOccupied = false;
  protected health = 100;
  
  // Physics
  protected velocity = new THREE.Vector3();
  protected angularVelocity = 0;
  protected speed = 0;
  protected maxSpeed: number;
  protected acceleration: number;
  protected turnSpeed: number;
  protected friction: number;

  // Interaction
  protected interactionRadius = 4;
  
  // Terrain
  protected getTerrainHeight: ((x: number, z: number) => number) | null = null;

  constructor(scene: THREE.Scene, type: VehicleType, position: THREE.Vector3) {
    this.scene = scene;
    this.type = type;
    
    // Set vehicle-specific properties
    switch (type) {
      case VehicleType.CAR:
        this.maxSpeed = 40;
        this.acceleration = 20;
        this.turnSpeed = 2;
        this.friction = 0.98;
        break;
      case VehicleType.HELICOPTER:
        this.maxSpeed = 30;
        this.acceleration = 10;
        this.turnSpeed = 1.5;
        this.friction = 0.95;
        break;
      case VehicleType.PLANE:
        this.maxSpeed = 60;
        this.acceleration = 15;
        this.turnSpeed = 1;
        this.friction = 0.99;
        break;
    }

    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    
    // Adjust Y position based on terrain
    if (type !== VehicleType.HELICOPTER) {
      this.mesh.position.y = 0;
    }
    
    scene.add(this.mesh);
  }

  public setTerrainHeightFunction(fn: (x: number, z: number) => number): void {
    this.getTerrainHeight = fn;
    // Set initial height
    const terrainY = fn(this.mesh.position.x, this.mesh.position.z);
    if (this.type === VehicleType.CAR) {
      this.mesh.position.y = terrainY + 0.5;
    } else {
      this.mesh.position.y = terrainY + 0.5;
    }
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();
    
    switch (this.type) {
      case VehicleType.CAR:
        return this.createCarMesh(group);
      case VehicleType.HELICOPTER:
        return this.createHelicopterMesh(group);
      case VehicleType.PLANE:
        return this.createPlaneMesh(group);
    }
    
    return group;
  }

  private createCarMesh(group: THREE.Group): THREE.Group {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2e5a1c, roughness: 0.6 });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.5,
      roughness: 0.1 
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 5), bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.5), bodyMaterial);
    cabin.position.set(0, 1.6, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Windows
    const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.1), glassMaterial);
    frontWindow.position.set(0, 1.5, 0.95);
    frontWindow.rotation.x = 0.3;
    group.add(frontWindow);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelPositions = [
      { x: 1.3, z: 1.5 }, { x: -1.3, z: 1.5 },
      { x: 1.3, z: -1.5 }, { x: -1.3, z: -1.5 }
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
      wheel.position.set(pos.x, 0.4, pos.z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheel.name = 'wheel';
      group.add(wheel);
    });

    // Headlights
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    [-0.8, 0.8].forEach(x => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.15), lightMaterial);
      light.position.set(x, 0.8, 2.5);
      group.add(light);
    });

    return group;
  }

  private createHelicopterMesh(group: THREE.Group): THREE.Group {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3a5f3a, roughness: 0.6 });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.5 
    });

    // Main body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 3, 8, 16), bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Cockpit
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16, 0, Math.PI),
      glassMaterial
    );
    cockpit.position.set(1.8, 1.5, 0);
    cockpit.rotation.z = -Math.PI / 2;
    group.add(cockpit);

    // Tail boom
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 8), bodyMaterial);
    tail.position.set(-3.5, 1.5, 0);
    tail.rotation.z = Math.PI / 2;
    tail.castShadow = true;
    group.add(tail);

    // Tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.15), bodyMaterial);
    fin.position.set(-5, 2, 0);
    group.add(fin);

    // Main rotor
    const rotorHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    rotorHub.position.y = 2.8;
    group.add(rotorHub);

    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.08, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    rotor.position.y = 3;
    rotor.name = 'mainRotor';
    group.add(rotor);

    // Second blade
    const rotor2 = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.08, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    rotor2.rotation.y = Math.PI / 2;
    rotor.add(rotor2);

    // Tail rotor
    const tailRotor = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.05, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    tailRotor.position.set(-5.2, 2, 0.3);
    tailRotor.rotation.x = Math.PI / 2;
    tailRotor.name = 'tailRotor';
    group.add(tailRotor);

    // Landing skids
    const skidMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    [-1, 1].forEach(side => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.1), skidMaterial);
      skid.position.set(0, 0.2, side * 1);
      group.add(skid);

      // Struts
      [-0.8, 0.8].forEach(strut => {
        const strutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), skidMaterial);
        strutMesh.position.set(strut, 0.6, side * 1);
        group.add(strutMesh);
      });
    });

    return group;
  }

  private createPlaneMesh(group: THREE.Group): THREE.Group {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.5 });
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4852, roughness: 0.6 });

    // Fuselage
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.6, 8, 16),
      bodyMaterial
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.2;
    fuselage.castShadow = true;
    group.add(fuselage);

    // Nose cone
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 2, 16),
      bodyMaterial
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 1.2, 5);
    nose.castShadow = true;
    group.add(nose);

    // Cockpit
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 })
    );
    cockpit.position.set(0, 1.8, 2);
    cockpit.rotation.x = Math.PI;
    group.add(cockpit);

    // Main wings
    const wingGeo = new THREE.BoxGeometry(12, 0.15, 2);
    const wings = new THREE.Mesh(wingGeo, wingMaterial);
    wings.position.set(0, 1.2, 0);
    wings.castShadow = true;
    group.add(wings);

    // Tail wing (horizontal stabilizer)
    const tailWing = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.1, 1),
      wingMaterial
    );
    tailWing.position.set(0, 1.5, -3.5);
    group.add(tailWing);

    // Vertical stabilizer
    const vertStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.5, 1.2),
      wingMaterial
    );
    vertStab.position.set(0, 2.2, -3.5);
    group.add(vertStab);

    // Propeller hub
    const propHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    propHub.position.set(0, 1.2, 6);
    propHub.rotation.x = Math.PI / 2;
    group.add(propHub);

    // Propeller
    const propeller = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    propeller.position.set(0, 1.2, 6.2);
    propeller.name = 'propeller';
    group.add(propeller);

    // Landing gear
    const gearMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Front gear
    const frontGear = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), gearMaterial);
    frontGear.position.set(0, 0.4, 3);
    group.add(frontGear);
    const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12), gearMaterial);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.2, 3);
    group.add(frontWheel);

    // Rear gear
    [-2, 2].forEach(x => {
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), gearMaterial);
      gear.position.set(x, 0.5, -0.5);
      group.add(gear);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 12), gearMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.25, -0.5);
      group.add(wheel);
    });

    return group;
  }

  public update(delta: number): void {
    // Animate rotating parts
    if (this.type === VehicleType.HELICOPTER) {
      const mainRotor = this.mesh.getObjectByName('mainRotor');
      const tailRotor = this.mesh.getObjectByName('tailRotor');
      if (this.isOccupied) {
        if (mainRotor) mainRotor.rotation.y += 20 * delta;
        if (tailRotor) tailRotor.rotation.y += 25 * delta;
      }
    } else if (this.type === VehicleType.PLANE && this.isOccupied) {
      const propeller = this.mesh.getObjectByName('propeller');
      if (propeller) propeller.rotation.z += 30 * delta;
    } else if (this.type === VehicleType.CAR && this.isOccupied && Math.abs(this.speed) > 0.1) {
      this.mesh.traverse(child => {
        if (child.name === 'wheel') {
          child.rotation.x += this.speed * delta * 2;
        }
      });
    }
  }

  public drive(delta: number, input: InputManager, camera: THREE.PerspectiveCamera): void {
    if (!this.isOccupied) return;

    const keys = input.keys;

    // Acceleration
    if (keys.forward) {
      this.speed += this.acceleration * delta;
    } else if (keys.backward) {
      this.speed -= this.acceleration * delta;
    }

    // Apply friction
    this.speed *= this.friction;

    // Clamp speed
    this.speed = Math.max(-this.maxSpeed / 2, Math.min(this.maxSpeed, this.speed));

    // Turning (only when moving)
    if (Math.abs(this.speed) > 0.5) {
      if (keys.left) this.mesh.rotation.y += this.turnSpeed * delta;
      if (keys.right) this.mesh.rotation.y -= this.turnSpeed * delta;
    }

    // Calculate direction
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    // Move vehicle
    this.mesh.position.x += direction.x * this.speed * delta;
    this.mesh.position.z += direction.z * this.speed * delta;

    // Get terrain height at vehicle position
    let terrainY = 0;
    if (this.getTerrainHeight) {
      terrainY = this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    }

    // Handle vertical movement for aircraft
    if (this.type === VehicleType.HELICOPTER) {
      if (keys.up) this.mesh.position.y += 10 * delta;
      if (keys.down) this.mesh.position.y -= 10 * delta;
      this.mesh.position.y = Math.max(terrainY + 1, this.mesh.position.y);
      
      // Tilt based on movement
      this.mesh.rotation.x = -this.speed * 0.02;
      this.mesh.rotation.z = (keys.left ? 0.2 : 0) - (keys.right ? 0.2 : 0);
    } else if (this.type === VehicleType.PLANE) {
      // Plane needs speed to fly
      if (this.speed > 20) {
        if (keys.up) this.mesh.position.y += 15 * delta;
        this.mesh.rotation.x = -0.1;
      }
      if (keys.down && this.mesh.position.y > terrainY + 2) {
        this.mesh.position.y -= 10 * delta;
      }
      if (this.mesh.position.y > terrainY + 2 && this.speed < 15) {
        this.mesh.position.y -= 5 * delta; // Fall if too slow
      }
      this.mesh.position.y = Math.max(terrainY + 1.5, this.mesh.position.y);
      
      // Bank on turn
      this.mesh.rotation.z = (keys.left ? 0.4 : 0) - (keys.right ? 0.4 : 0);
    } else {
      // Car sticks to terrain
      this.mesh.position.y = terrainY + 0.5;
    }

    // Update camera position but allow free look
    this.updateCameraPosition(camera);
  }

  private updateCameraPosition(camera: THREE.PerspectiveCamera): void {
    const offset = this.getCameraOffset();
    
    // Just update position relative to vehicle, don't change camera rotation
    // This allows player to freely look around while driving
    const vehiclePos = this.mesh.position.clone();
    
    // Apply offset based on vehicle's Y rotation only for position
    const rotatedOffset = offset.clone();
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    
    // Set camera position to follow vehicle
    camera.position.copy(vehiclePos).add(rotatedOffset);
  }

  public enter(): void {
    this.isOccupied = true;
    this.speed = 0;
  }

  public exit(): THREE.Vector3 {
    this.isOccupied = false;
    this.speed = 0;
    
    // Get terrain height for exit position
    let terrainY = 0;
    if (this.getTerrainHeight) {
      terrainY = this.getTerrainHeight(this.mesh.position.x + 3, this.mesh.position.z);
    }
    
    // Return exit position (beside the vehicle)
    const exitPos = this.mesh.position.clone();
    exitPos.x += 3;
    exitPos.y = Math.max(terrainY + 1.7, this.mesh.position.y + 1);
    return exitPos;
  }

  public getTypeName(): string {
    switch (this.type) {
      case VehicleType.CAR: return 'Car';
      case VehicleType.HELICOPTER: return 'Helicopter';
      case VehicleType.PLANE: return 'Plane';
    }
  }

  public isNear(position: THREE.Vector3): boolean {
    return position.distanceTo(this.mesh.position) < this.interactionRadius;
  }

  public isPlayerInside(): boolean {
    return this.isOccupied;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getRotation(): THREE.Euler {
    return this.mesh.rotation.clone();
  }

  public getType(): VehicleType {
    return this.type;
  }

  public getCameraOffset(): THREE.Vector3 {
    switch (this.type) {
      case VehicleType.CAR:
        return new THREE.Vector3(0, 3, -8);
      case VehicleType.HELICOPTER:
        return new THREE.Vector3(0, 5, -12);
      case VehicleType.PLANE:
        return new THREE.Vector3(0, 4, -15);
    }
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
  }
}
