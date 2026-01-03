import * as THREE from 'three';
import { InputManager } from '../utils/InputManager';

export enum VehicleType {
  CAR = 'car',
  HELICOPTER = 'helicopter',
  PLANE = 'plane',
  BOAT = 'boat'
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
      case VehicleType.BOAT:
        this.maxSpeed = 25;
        this.acceleration = 12;
        this.turnSpeed = 1.8;
        this.friction = 0.96;
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
      case VehicleType.BOAT:
        return this.createBoatMesh(group);
    }
    
    return group;
  }

  private createCarMesh(group: THREE.Group): THREE.Group {
    // Cute cartoon car - using palette colors!
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xE76F51, roughness: 0.9, metalness: 0 });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x5C5C68, roughness: 0.9, metalness: 0 });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCFE9FF, 
      transparent: true, 
      opacity: 0.7,
      roughness: 0.3,
      metalness: 0
    });

    // Chunky rounded body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 5.2), bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    // Cute bubble cabin - rounded
    const cabinGeo = new THREE.SphereGeometry(1.4, 12, 10);
    cabinGeo.scale(1.4, 0.8, 1.2);
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({ color: 0xF4A261, roughness: 0.9, metalness: 0 }));
    cabin.position.set(0, 1.9, -0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Big cute windows
    const frontWindow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), glassMaterial);
    frontWindow.position.set(0, 1.8, 1.1);
    frontWindow.rotation.x = -0.3;
    group.add(frontWindow);

    // Big chunky wheels with cute hubcaps
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
    const hubCapMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 });
    const wheelPositions = [
      { x: 1.4, z: 1.6 }, { x: -1.4, z: 1.6 },
      { x: 1.4, z: -1.6 }, { x: -1.4, z: -1.6 }
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
      wheel.position.set(pos.x, 0.55, pos.z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheel.name = 'wheel';
      group.add(wheel);
      
      // Cute hubcap
      const hubcap = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), hubCapMaterial);
      hubcap.position.set(pos.x > 0 ? pos.x + 0.21 : pos.x - 0.21, 0.55, pos.z);
      hubcap.rotation.y = pos.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(hubcap);
    });

    // Cute big headlights - soft warm yellow
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xFFF5D0 });
    [-0.9, 0.9].forEach(x => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), lightMaterial);
      light.position.set(x, 1, 2.6);
      group.add(light);
    });

    return group;
  }

  private createHelicopterMesh(group: THREE.Group): THREE.Group {
    // Cute cartoon helicopter!
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xB7D3A8, roughness: 0.9, metalness: 0 });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCFE9FF, 
      transparent: true, 
      opacity: 0.7,
      roughness: 0.3,
      metalness: 0
    });

    // Chunky round body
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 3, 8, 16), bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Big cute cockpit bubble
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI),
      glassMaterial
    );
    cockpit.position.set(1.8, 1.5, 0);
    cockpit.rotation.z = -Math.PI / 2;
    group.add(cockpit);

    // Cute tail boom
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 8), bodyMaterial);
    tail.position.set(-3.5, 1.5, 0);
    tail.rotation.z = Math.PI / 2;
    tail.castShadow = true;
    group.add(tail);

    // Cute tail fin - using character color
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xF4A261, roughness: 0.9, metalness: 0 })
    );
    fin.position.set(-5, 2, 0);
    group.add(fin);

    // Main rotor - accent color
    const rotorHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xE76F51, roughness: 0.9, metalness: 0 })
    );
    rotorHub.position.y = 2.8;
    group.add(rotorHub);

    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 })
    );
    rotor.position.y = 3;
    rotor.name = 'mainRotor';
    group.add(rotor);

    // Second blade
    const rotor2 = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 })
    );
    rotor2.rotation.y = Math.PI / 2;
    rotor.add(rotor2);

    // Tail rotor - character color
    const tailRotor = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xF4A261, roughness: 0.9, metalness: 0 })
    );
    tailRotor.position.set(-5.2, 2, 0.3);
    tailRotor.rotation.x = Math.PI / 2;
    tailRotor.name = 'tailRotor';
    group.add(tailRotor);

    // Cute landing skids - soft gray-blue
    const skidMaterial = new THREE.MeshStandardMaterial({ color: 0x7A8A9A, roughness: 0.9, metalness: 0 });
    [-1, 1].forEach(side => {
      const skid = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 2.5, 6, 8), skidMaterial);
      skid.rotation.z = Math.PI / 2;
      skid.position.set(0, 0.2, side * 1);
      group.add(skid);

      // Chunky struts
      [-0.8, 0.8].forEach(strut => {
        const strutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), skidMaterial);
        strutMesh.position.set(strut, 0.6, side * 1);
        group.add(strutMesh);
      });
    });

    return group;
  }

  private createPlaneMesh(group: THREE.Group): THREE.Group {
    // Cute cartoon plane using palette!
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xF4A261, roughness: 0.9, metalness: 0 });
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xCFE9FF, roughness: 0.9, metalness: 0 });

    // Chunky round fuselage
    const fuselage = new THREE.Mesh(
      new THREE.CapsuleGeometry(1, 6, 8, 16),
      bodyMaterial
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.4;
    fuselage.castShadow = true;
    group.add(fuselage);

    // Cute round nose - accent color
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xE76F51, roughness: 0.9, metalness: 0 })
    );
    nose.position.set(0, 1.4, 4);
    nose.castShadow = true;
    group.add(nose);

    // Big cute cockpit bubble - sky color
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xCFE9FF, transparent: true, opacity: 0.7, roughness: 0.3, metalness: 0 })
    );
    cockpit.position.set(0, 2.2, 2);
    cockpit.rotation.x = Math.PI;
    group.add(cockpit);

    // Chunky cartoon wings
    const wingGeo = new THREE.BoxGeometry(14, 0.3, 2.5);
    const wings = new THREE.Mesh(wingGeo, wingMaterial);
    wings.position.set(0, 1.4, 0);
    wings.castShadow = true;
    group.add(wings);

    // Cute tail wing - building yellow
    const tailWing = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 })
    );
    tailWing.position.set(0, 1.7, -4);
    group.add(tailWing);

    // Cute vertical tail - ground color
    const vertStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xB7D3A8, roughness: 0.9, metalness: 0 })
    );
    vertStab.position.set(0, 2.7, -4);
    group.add(vertStab);

    // Cute propeller hub - soft gray-blue
    const propHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x7A8A9A, roughness: 0.9, metalness: 0 })
    );
    propHub.position.set(0, 1.4, 5);
    group.add(propHub);

    // Colorful propeller - building yellow
    const propeller = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 3.5, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 })
    );
    propeller.position.set(0, 1.4, 5.3);
    propeller.name = 'propeller';
    group.add(propeller);

    // Cute chunky landing gear - soft gray-blue
    const gearMaterial = new THREE.MeshStandardMaterial({ color: 0x7A8A9A, roughness: 0.9, metalness: 0 });
    
    // Front gear
    const frontGear = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), gearMaterial);
    frontGear.position.set(0, 0.5, 3);
    group.add(frontGear);
    const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), gearMaterial);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.3, 3);
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

  private createBoatMesh(group: THREE.Group): THREE.Group {
    // Cute cartoon boat using palette!
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0xE76F51, roughness: 0.9, metalness: 0 });
    const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xE8DCC8, roughness: 0.9, metalness: 0 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xB7D3A8, roughness: 0.9, metalness: 0 });
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0xF4A261, roughness: 0.9, metalness: 0 });
    
    // Use accent for railing detail
    void accentMaterial;

    // Chunky rounded hull
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-1.8, 0);
    hullShape.quadraticCurveTo(-2.2, 2.5, 0, 4.5);
    hullShape.quadraticCurveTo(2.2, 2.5, 1.8, 0);
    hullShape.lineTo(-1.8, 0);

    const extrudeSettings = {
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelSegments: 4
    };

    const hull = new THREE.Mesh(
      new THREE.ExtrudeGeometry(hullShape, extrudeSettings),
      hullMaterial
    );
    hull.rotation.x = -Math.PI / 2;
    hull.rotation.z = Math.PI;
    hull.position.set(0, 0.4, 2);
    hull.castShadow = true;
    group.add(hull);

    // Chunky hull bottom
    const hullBottom = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 5.5),
      hullMaterial
    );
    hullBottom.position.set(0, 0.1, 0);
    hullBottom.castShadow = true;
    group.add(hullBottom);

    // Colorful hull stripe - building yellow from palette
    [-1.4, 1.4].forEach(x => {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.8, 5.5),
        new THREE.MeshStandardMaterial({ color: 0xFFD166, roughness: 0.9, metalness: 0 })
      );
      side.position.set(x, 0.6, 0);
      side.castShadow = true;
      group.add(side);
    });

    // Cute rounded bow
    const bow = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 12, 10),
      hullMaterial
    );
    bow.scale.set(1, 0.6, 1.2);
    bow.position.set(0, 0.4, 3.5);
    bow.castShadow = true;
    group.add(bow);

    // Cute wooden deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.15, 4.5),
      deckMaterial
    );
    deck.position.set(0, 0.4, 0);
    group.add(deck);

    // Cute puffy seats
    [-0.7, 0.7].forEach(x => {
      const seat = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 10, 8),
        seatMaterial
      );
      seat.scale.set(1.2, 0.8, 1);
      seat.position.set(x, 0.7, -0.5);
      seat.castShadow = true;
      group.add(seat);
    });

    // Cute accent material for steering and motor
    const cuteMetalMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE66D, roughness: 0.9, metalness: 0 });

    // Driver seat back
    const seatBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 0.15),
      seatMaterial
    );
    seatBack.position.set(0, 0.8, -0.85);
    seatBack.castShadow = true;
    group.add(seatBack);

    // Steering wheel
    const wheelBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8),
      cuteMetalMaterial
    );
    wheelBase.position.set(0, 0.9, 0.2);
    wheelBase.rotation.x = -0.4;
    group.add(wheelBase);

    const steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.03, 8, 16),
      cuteMetalMaterial
    );
    steeringWheel.position.set(0, 1.2, 0.35);
    steeringWheel.rotation.x = -0.4;
    group.add(steeringWheel);

    // Outboard motor
    const motor = new THREE.Group();
    
    const motorBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.6),
      cuteMetalMaterial
    );
    motorBody.position.y = 0.2;
    motor.add(motorBody);

    const motorCowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x9B59B6, roughness: 0.9, metalness: 0 })
    );
    motorCowl.position.y = 0.7;
    motor.add(motorCowl);

    const motorShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8),
      cuteMetalMaterial
    );
    motorShaft.position.y = -0.4;
    motor.add(motorShaft);

    const propeller = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.1, 0.15),
      cuteMetalMaterial
    );
    propeller.position.y = -1;
    propeller.name = 'boatPropeller';
    motor.add(propeller);

    motor.position.set(0, 0.3, -2.3);
    group.add(motor);

    // Cleat (rope tie) - cute colorful
    [{ x: -0.9, z: 1.5 }, { x: 0.9, z: 1.5 }, { x: -0.9, z: -1.5 }, { x: 0.9, z: -1.5 }].forEach(pos => {
      const cleat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6),
        cuteMetalMaterial
      );
      cleat.position.set(pos.x, 0.85, pos.z);
      group.add(cleat);
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
    } else if (this.type === VehicleType.BOAT && this.isOccupied && Math.abs(this.speed) > 0.1) {
      const boatProp = this.mesh.getObjectByName('boatPropeller');
      if (boatProp) boatProp.rotation.y += this.speed * delta * 5;
      // Slight bobbing motion
      this.mesh.position.y = -0.3 + Math.sin(Date.now() * 0.003) * 0.1;
      this.mesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.03;
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
    } else if (this.type === VehicleType.BOAT) {
      // Boat stays at water level with bobbing
      this.mesh.position.y = -0.3;
      // Lean into turns
      this.mesh.rotation.z = ((keys.left ? 0.15 : 0) - (keys.right ? 0.15 : 0)) * Math.min(1, Math.abs(this.speed) / 10);
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
      case VehicleType.BOAT: return 'Boat';
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
        return new THREE.Vector3(0, 2, -4);
      case VehicleType.HELICOPTER:
        return new THREE.Vector3(0, 2.5, -5);
      case VehicleType.PLANE:
        return new THREE.Vector3(0, 2, -6);
      case VehicleType.BOAT:
        return new THREE.Vector3(0, 2, -5);
    }
  }

  public destroy(): void {
    this.scene.remove(this.mesh);
  }
}
