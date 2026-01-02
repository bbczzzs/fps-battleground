import * as THREE from 'three';

export class Terrain {
  private scene: THREE.Scene;
  private ground!: THREE.Mesh;
  private colliders: THREE.Box3[] = [];
  private heightData: number[][] = [];
  private terrainSize = 400;
  private segments = 150;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createTerrain();
    this.createMainRoads();
    this.createMilitaryBase();
    this.createUrbanArea();
    this.createIndustrialZone();
    this.createForest();
    this.createLake();
    this.createRiver();
    this.createMountains();
    this.createScatteredCover();
    this.createAmbientDetails();
    this.createBillboards();
  }

  private createTerrain(): void {
    const size = this.terrainSize;
    const segments = this.segments;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Initialize height data
    for (let i = 0; i <= segments; i++) {
      this.heightData[i] = [];
      for (let j = 0; j <= segments; j++) {
        this.heightData[i][j] = 0;
      }
    }
    
    const vertices = geometry.attributes.position.array;
    let vertexIndex = 0;
    
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const idx = vertexIndex * 3;
        const x = vertices[idx];
        const y = vertices[idx + 1];
        
        // Natural terrain with varied heights
        let height = 
          Math.sin(x * 0.015) * 4 + 
          Math.cos(y * 0.015) * 4 +
          Math.sin(x * 0.03 + y * 0.02) * 2 +
          Math.sin(x * 0.008) * Math.cos(y * 0.008) * 6;
        
        // Flatten center spawn area
        const distFromCenter = Math.sqrt(x * x + y * y);
        if (distFromCenter < 30) {
          height *= (distFromCenter / 30) * 0.3;
        }
        
        // Flatten road areas
        if (Math.abs(x) < 8 || Math.abs(y) < 8) {
          height *= 0.15;
        }
        
        // Create a depression for lake area
        const lakeCenter = { x: -80, z: 80 };
        const distFromLake = Math.sqrt((x - lakeCenter.x) ** 2 + (y - lakeCenter.z) ** 2);
        if (distFromLake < 35) {
          height = -2 - (1 - distFromLake / 35) * 3;
        }
        
        // Flatten military base area
        if (x > 50 && x < 130 && y > -30 && y < 50) {
          height *= 0.1;
        }
        
        // Flatten urban area
        if (x < -30 && x > -120 && y < -30 && y > -100) {
          height *= 0.1;
        }
        
        vertices[idx + 2] = height;
        this.heightData[i][j] = height;
        vertexIndex++;
      }
    }
    
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a6741,
      roughness: 0.95,
      metalness: 0.0
    });

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    
    this.addGroundDetails();
  }
  
  private addGroundDetails(): void {
    const dirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4a3d,
      roughness: 1
    });
    
    for (let i = 0; i < 40; i++) {
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(3 + Math.random() * 8, 8),
        dirtMaterial
      );
      patch.rotation.x = -Math.PI / 2;
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      patch.position.set(x, this.getHeightAt(x, z) + 0.02, z);
      this.scene.add(patch);
    }
  }

  public getHeightAt(x: number, z: number): number {
    const halfSize = this.terrainSize / 2;
    const segmentSize = this.terrainSize / this.segments;
    
    const gridX = Math.floor((x + halfSize) / segmentSize);
    const gridZ = Math.floor((z + halfSize) / segmentSize);
    
    const clampedX = Math.max(0, Math.min(this.segments, gridX));
    const clampedZ = Math.max(0, Math.min(this.segments, gridZ));
    
    if (this.heightData[clampedZ] && this.heightData[clampedZ][clampedX] !== undefined) {
      return this.heightData[clampedZ][clampedX];
    }
    return 0;
  }

  private createMainRoads(): void {
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    
    for (let x = -150; x < 150; x += 12) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 10), asphalt);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x + 6, this.getHeightAt(x, 0) + 0.12, 0);
      road.receiveShadow = true;
      this.scene.add(road);
    }
    
    for (let z = -150; z < 150; z += 12) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 12.5), asphalt);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, this.getHeightAt(0, z) + 0.12, z + 6);
      road.receiveShadow = true;
      this.scene.add(road);
    }
    
    for (let i = -140; i < 140; i += 8) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.2), yellow);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(i + 2, this.getHeightAt(i, 0) + 0.15, 0);
      this.scene.add(mark);
    }
  }

  private createMilitaryBase(): void {
    const baseX = 90, baseZ = 10;
    this.createBuilding(baseX, baseZ, 20, 8, 15, 0x5a5a5a);
    this.createBuilding(baseX - 25, baseZ + 15, 15, 5, 8, 0x6b6b5a);
    this.createBuilding(baseX - 25, baseZ - 15, 15, 5, 8, 0x6b6b5a);
    this.createGuardTower(baseX - 35, baseZ - 35);
    this.createGuardTower(baseX + 35, baseZ + 35);
    
    for (let i = 0; i < 4; i++) {
      this.createSandbagWall(baseX - 30 + i * 15, baseZ, 6);
    }
  }
  
  private createBuilding(x: number, z: number, w: number, h: number, d: number, color: number): void {
    const groundY = this.getHeightAt(x, z);
    const group = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    building.position.y = h / 2;
    building.castShadow = true;
    group.add(building);
    
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
    roof.position.y = h + 0.15;
    group.add(roof);
    
    for (let i = 0; i < Math.floor(w / 4); i++) {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), new THREE.MeshBasicMaterial({ color: 0x1a3a5a }));
      window.position.set(-w/2 + 2 + i * 4, h/2, d/2 + 0.01);
      group.add(window);
    }
    
    group.position.set(x, groundY, z);
    this.scene.add(group);
    
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, groundY + h/2, z),
      new THREE.Vector3(w + 1, h + 1, d + 1)
    ));
  }
  
  private createGuardTower(x: number, z: number): void {
    const groundY = this.getHeightAt(x, z);
    const group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    
    [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 8, 6), metal);
      leg.position.set(lx, 4, lz);
      leg.castShadow = true;
      group.add(leg);
    });
    
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 5), metal);
    platform.position.y = 8;
    group.add(platform);
    
    group.position.set(x, groundY, z);
    this.scene.add(group);
    
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, groundY + 5, z),
      new THREE.Vector3(5, 10, 5)
    ));
  }
  
  private createSandbagWall(x: number, z: number, length: number): void {
    const groundY = this.getHeightAt(x, z);
    const group = new THREE.Group();
    const bag = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 });
    
    for (let i = 0; i < length; i++) {
      for (let row = 0; row < 3; row++) {
        const sandbag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.5), bag);
        sandbag.position.set(i * 1.3 - length * 0.65, row * 0.35 + 0.175, 0);
        sandbag.castShadow = true;
        group.add(sandbag);
      }
    }
    
    group.position.set(x, groundY, z);
    group.rotation.y = Math.random() * Math.PI;
    this.scene.add(group);
    
    this.colliders.push(new THREE.Box3().setFromObject(group));
  }

  private createUrbanArea(): void {
    const baseX = -70, baseZ = -60;
    this.createBuilding(baseX, baseZ, 12, 15, 12, 0x8a7a6a);
    this.createBuilding(baseX + 20, baseZ, 15, 20, 10, 0x7a7a7a);
    this.createBuilding(baseX, baseZ + 25, 10, 12, 15, 0x6a6a6a);
    this.createBuilding(baseX + 25, baseZ + 25, 18, 8, 18, 0x8a8a7a);
    this.createBuilding(baseX - 25, baseZ + 10, 14, 18, 12, 0x6a7a6a);
    
    for (let i = 0; i < 3; i++) {
      this.createCar(baseX + i * 12, baseZ + 40);
    }
  }
  
  private createCar(x: number, z: number): void {
    const groundY = this.getHeightAt(x, z);
    const group = new THREE.Group();
    const colors = [0x8a2a2a, 0x2a4a6a, 0x3a3a3a];
    const body = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], metalness: 0.6, roughness: 0.4 });
    
    const car = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), body);
    car.position.y = 0.7;
    car.castShadow = true;
    group.add(car);
    
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2), body);
    roof.position.set(0, 1.5, -0.3);
    group.add(roof);
    
    const wheel = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    [[0.9, 0.35, 1.2], [-0.9, 0.35, 1.2], [0.9, 0.35, -1.2], [-0.9, 0.35, -1.2]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), wheel);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      group.add(w);
    });
    
    group.position.set(x, groundY, z);
    group.rotation.y = Math.random() * Math.PI;
    this.scene.add(group);
    
    this.colliders.push(new THREE.Box3().setFromObject(group));
  }

  private createIndustrialZone(): void {
    const baseX = -90, baseZ = 60;
    this.createBuilding(baseX, baseZ, 30, 10, 20, 0x6a6a6a);
    
    this.createTank(baseX + 35, baseZ + 5, 5, 8);
    this.createTank(baseX + 35, baseZ - 10, 4, 6);
    
    for (let i = 0; i < 4; i++) {
      this.createContainer(baseX - 25 + (i % 2) * 14, baseZ - 20 + Math.floor(i / 2) * 5, [0x2a4a6a, 0x6a2a2a][i % 2]);
    }
  }
  
  private createTank(x: number, z: number, r: number, h: number): void {
    const groundY = this.getHeightAt(x, z);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), new THREE.MeshStandardMaterial({ color: 0x7a7a7a, metalness: 0.3 }));
    tank.position.set(x, groundY + h / 2, z);
    tank.castShadow = true;
    this.scene.add(tank);
    
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, groundY + h / 2, z),
      new THREE.Vector3(r * 2 + 1, h + 1, r * 2 + 1)
    ));
  }
  
  private createContainer(x: number, z: number, color: number): void {
    const groundY = this.getHeightAt(x, z);
    const container = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 3), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    container.position.set(x, groundY + 1.5, z);
    container.castShadow = true;
    this.scene.add(container);
    
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, groundY + 1.5, z),
      new THREE.Vector3(13, 4, 4)
    ));
  }

  private createForest(): void {
    const areas = [{ cx: 120, cz: 100, r: 40 }, { cx: -120, cz: -120, r: 50 }];
    areas.forEach(area => {
      for (let i = 0; i < area.r; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * area.r;
        const tx = area.cx + Math.cos(angle) * dist;
        const tz = area.cz + Math.sin(angle) * dist;
        if (Math.sqrt(tx * tx + tz * tz) > 40) this.createTree(tx, tz);
      }
    });
  }
  
  private createTree(x: number, z: number): void {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 4, 6), new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 }));
    trunk.position.y = 2;
    trunk.castShadow = true;
    group.add(trunk);
    
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 6), new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.8 }));
    foliage.position.y = 4;
    foliage.castShadow = true;
    group.add(foliage);
    
    group.position.set(x, this.getHeightAt(x, z), z);
    group.scale.setScalar(0.7 + Math.random() * 0.6);
    this.scene.add(group);
  }

  private createLake(): void {
    const water = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: 0x1a4a6a, metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(-80, -1.5, 80);
    this.scene.add(water);
    
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random(), 0), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 }));
      rock.position.set(-80 + Math.cos(angle) * dist, this.getHeightAt(-80 + Math.cos(angle) * dist, 80 + Math.sin(angle) * dist) + 0.3, 80 + Math.sin(angle) * dist);
      rock.castShadow = true;
      this.scene.add(rock);
    }
  }

  private createRiver(): void {
    const waterMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a6a9a, 
      metalness: 0.9, 
      roughness: 0.1, 
      transparent: true, 
      opacity: 0.8 
    });

    // Create winding river using multiple segments
    const riverPoints = [
      { x: 100, z: -150 },
      { x: 90, z: -100 },
      { x: 80, z: -50 },
      { x: 95, z: 0 },
      { x: 85, z: 50 },
      { x: 100, z: 100 },
      { x: 90, z: 150 }
    ];

    // Create river segments
    for (let i = 0; i < riverPoints.length - 1; i++) {
      const p1 = riverPoints[i];
      const p2 = riverPoints[i + 1];
      
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      
      const riverSegment = new THREE.Mesh(
        new THREE.PlaneGeometry(20, length + 10),
        waterMaterial
      );
      riverSegment.rotation.x = -Math.PI / 2;
      riverSegment.rotation.z = angle;
      riverSegment.position.set(
        (p1.x + p2.x) / 2,
        -0.5,
        (p1.z + p2.z) / 2
      );
      this.scene.add(riverSegment);
    }

    // Create pond connected to river
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(25, 32),
      waterMaterial
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(95, -0.5, 0);
    this.scene.add(pond);

    // Add river banks with rocks
    for (let i = 0; i < 40; i++) {
      const t = Math.random();
      const idx = Math.floor(t * (riverPoints.length - 1));
      const p1 = riverPoints[idx];
      const p2 = riverPoints[Math.min(idx + 1, riverPoints.length - 1)];
      
      const x = p1.x + (p2.x - p1.x) * (t * (riverPoints.length - 1) - idx);
      const z = p1.z + (p2.z - p1.z) * (t * (riverPoints.length - 1) - idx);
      const side = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 5);
      
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.5, 0),
        new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.9 })
      );
      rock.position.set(x + side * 0.3, 0, z + side);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      this.scene.add(rock);
    }

    // Add wooden dock
    this.createDock(85, 0);
  }

  private createDock(x: number, z: number): void {
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
    const dock = new THREE.Group();

    // Dock platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 15), woodMaterial);
    platform.position.set(0, 0.5, 0);
    platform.castShadow = true;
    dock.add(platform);

    // Support posts
    for (let px = -3; px <= 3; px += 2) {
      for (let pz = -6; pz <= 6; pz += 4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2, 8), woodMaterial);
        post.position.set(px, -0.5, pz);
        post.castShadow = true;
        dock.add(post);
      }
    }

    // Rope cleats
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8 });
    [-5, 5].forEach(pz => {
      const cleat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8), metalMaterial);
      cleat.position.set(3.5, 0.8, pz);
      dock.add(cleat);
    });

    dock.position.set(x, 0, z);
    dock.rotation.y = -Math.PI / 2;
    this.scene.add(dock);
  }

  private createMountains(): void {
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6a6a6a, 
      roughness: 0.95,
      metalness: 0.1
    });
    const snowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      roughness: 0.8 
    });
    const grassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a6a3a, 
      roughness: 0.9 
    });

    // Mountain range in the back
    const mountainPositions = [
      { x: -120, z: -140, height: 60, radius: 35 },
      { x: -80, z: -160, height: 80, radius: 40 },
      { x: -40, z: -150, height: 50, radius: 30 },
      { x: 0, z: -170, height: 70, radius: 38 },
      { x: 50, z: -155, height: 55, radius: 32 },
      { x: -150, z: -100, height: 45, radius: 28 },
      { x: 150, z: -130, height: 65, radius: 35 }
    ];

    mountainPositions.forEach(mountain => {
      this.createMountain(mountain.x, mountain.z, mountain.height, mountain.radius, rockMaterial, snowMaterial, grassMaterial);
    });

    // Add climbable hill near spawn
    this.createClimbableHill(50, 60);
    this.createClimbableHill(-60, 100);
  }

  private createMountain(x: number, z: number, height: number, radius: number, rockMat: THREE.Material, snowMat: THREE.Material, grassMat: THREE.Material): void {
    const group = new THREE.Group();

    // Main mountain cone
    const coneGeo = new THREE.ConeGeometry(radius, height, 8, 4);
    const vertices = coneGeo.attributes.position.array as Float32Array;
    
    // Add noise to make it look natural
    for (let i = 0; i < vertices.length; i += 3) {
      const y = vertices[i + 1];
      if (y < height * 0.9) {
        vertices[i] += (Math.random() - 0.5) * radius * 0.3;
        vertices[i + 2] += (Math.random() - 0.5) * radius * 0.3;
      }
    }
    coneGeo.computeVertexNormals();

    const mountain = new THREE.Mesh(coneGeo, rockMat);
    mountain.position.y = height / 2 - 5;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    group.add(mountain);

    // Snow cap
    const snowCapGeo = new THREE.ConeGeometry(radius * 0.3, height * 0.25, 8);
    const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
    snowCap.position.y = height - height * 0.125 - 5;
    snowCap.castShadow = true;
    group.add(snowCap);

    // Grass at base
    const grassRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.8, radius * 1.2, 16),
      grassMat
    );
    grassRing.rotation.x = -Math.PI / 2;
    grassRing.position.y = 0.1;
    group.add(grassRing);

    // Add some rocks around base
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = radius * (0.8 + Math.random() * 0.4);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2 + Math.random() * 3, 0),
        rockMat
      );
      rock.position.set(
        Math.cos(angle) * dist,
        1 + Math.random() * 2,
        Math.sin(angle) * dist
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      group.add(rock);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createClimbableHill(x: number, z: number): void {
    const group = new THREE.Group();
    const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.9 });
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85 });

    // Create stepped hill that can be climbed
    const levels = 5;
    const baseRadius = 20;
    const heightPerLevel = 4;

    for (let i = 0; i < levels; i++) {
      const levelRadius = baseRadius - i * 3;
      const levelHeight = heightPerLevel;
      
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(levelRadius, levelRadius + 2, levelHeight, 12),
        hillMaterial
      );
      platform.position.y = i * heightPerLevel + heightPerLevel / 2;
      platform.castShadow = true;
      platform.receiveShadow = true;
      group.add(platform);

      // Add rocks as steps
      for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI * 2 + i * 0.5;
        const rock = new THREE.Mesh(
          new THREE.BoxGeometry(3, 1.5, 3),
          rockMaterial
        );
        rock.position.set(
          Math.cos(angle) * (levelRadius + 1),
          i * heightPerLevel + 0.75,
          Math.sin(angle) * (levelRadius + 1)
        );
        rock.rotation.y = angle;
        rock.castShadow = true;
        group.add(rock);

        // Add collision for climbing
        this.colliders.push(new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(
            x + Math.cos(angle) * (levelRadius + 1),
            i * heightPerLevel + 0.75,
            z + Math.sin(angle) * (levelRadius + 1)
          ),
          new THREE.Vector3(3, 1.5, 3)
        ));
      }
    }

    // Top platform with flag
    const topPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 8, 2, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a5a3a })
    );
    topPlatform.position.y = levels * heightPerLevel + 1;
    topPlatform.castShadow = true;
    group.add(topPlatform);

    // Flag pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
    );
    pole.position.y = levels * heightPerLevel + 6;
    group.add(pole);

    // Flag
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xff4444, side: THREE.DoubleSide })
    );
    flag.position.set(2, levels * heightPerLevel + 8, 0);
    group.add(flag);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createScatteredCover(): void {
    const covers = [
      { x: 15, z: 5 }, { x: -12, z: 8 }, { x: 25, z: -20 }, { x: -20, z: -15 },
      { x: 10, z: 30 }, { x: -30, z: 25 }, { x: 40, z: -30 }, { x: -45, z: -35 }
    ];
    
    covers.forEach((pos, i) => {
      if (i % 3 === 0) this.createSandbagWall(pos.x, pos.z, 4);
      else if (i % 3 === 1) this.createBarrier(pos.x, pos.z);
      else this.createCrate(pos.x, pos.z);
    });
  }
  
  private createBarrier(x: number, z: number): void {
    const groundY = this.getHeightAt(x, z);
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7 }));
    barrier.position.set(x, groundY + 0.75, z);
    barrier.rotation.y = Math.random() * Math.PI;
    barrier.castShadow = true;
    this.scene.add(barrier);
    
    this.colliders.push(new THREE.Box3().setFromObject(barrier));
  }
  
  private createCrate(x: number, z: number): void {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.9 }));
    crate.position.set(x, this.getHeightAt(x, z) + 1, z);
    crate.rotation.y = Math.random() * 0.5;
    crate.castShadow = true;
    this.scene.add(crate);
    
    this.colliders.push(new THREE.Box3().setFromObject(crate));
  }

  private createAmbientDetails(): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 130;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 1.2, 0), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.95 }));
      rock.position.set(x, this.getHeightAt(x, z) + 0.3, z);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1 + Math.random() * 0.5);
      rock.castShadow = true;
      this.scene.add(rock);
      
      if (rock.scale.x > 1.3) this.colliders.push(new THREE.Box3().setFromObject(rock));
    }
  }

  private createBillboards(): void {
    // Billboard 1 - Left side of gap (facing spawn)
    this.createBillboard(-35, 25, Math.PI, '/images/billboard1.jpg');
    // Billboard 2 - Right side of gap (facing spawn)
    this.createBillboard(40, 25, Math.PI, '/images/billboard2.jpg');
    // Billboard 3 - Left rubble area (blank for now)
    this.createBillboard(-70, 15, Math.PI * 0.8, '/images/billboard3.jpg');
    // Billboard 4 - Right rubble area (blank for now)
    this.createBillboard(75, 15, Math.PI * 1.2, '/images/billboard4.jpg');
  }
  
  private createBillboard(x: number, z: number, rotation: number, imagePath: string): void {
    const groundY = this.getHeightAt(x, z);
    const group = new THREE.Group();
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.5, roughness: 0.5 });
    
    // Support poles
    const poleHeight = 12;
    [[-4, 0], [4, 0]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, poleHeight, 8), metalMaterial);
      pole.position.set(px, poleHeight / 2, pz);
      pole.castShadow = true;
      group.add(pole);
    });
    
    // Cross beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 0.4), metalMaterial);
    beam.position.set(0, poleHeight - 1, 0);
    group.add(beam);
    
    // Billboard frame
    const frameWidth = 12;
    const frameHeight = 6;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth + 0.5, frameHeight + 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    frame.position.set(0, poleHeight + frameHeight / 2, 0);
    group.add(frame);
    
    // Billboard surface with texture
    const textureLoader = new THREE.TextureLoader();
    const billboardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const billboard = new THREE.Mesh(
      new THREE.PlaneGeometry(frameWidth, frameHeight),
      billboardMaterial
    );
    billboard.position.set(0, poleHeight + frameHeight / 2, 0.2);
    group.add(billboard);
    
    // Load texture asynchronously
    textureLoader.load(imagePath, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      billboardMaterial.map = texture;
      billboardMaterial.needsUpdate = true;
    });
    
    // Back of billboard
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(frameWidth, frameHeight),
      new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide })
    );
    back.position.set(0, poleHeight + frameHeight / 2, -0.2);
    group.add(back);
    
    group.position.set(x, groundY, z);
    group.rotation.y = rotation;
    this.scene.add(group);
    
    // Collision for poles
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, groundY + poleHeight / 2, z),
      new THREE.Vector3(10, poleHeight, 2)
    ));
  }

  public getColliders(): THREE.Box3[] {
    return this.colliders;
  }
}
