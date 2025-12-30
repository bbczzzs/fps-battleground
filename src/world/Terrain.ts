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
    this.createScatteredCover();
    this.createAmbientDetails();
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
      metalness: 0.0,
      flatShading: false
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

  public getColliders(): THREE.Box3[] {
    return this.colliders;
  }
}
