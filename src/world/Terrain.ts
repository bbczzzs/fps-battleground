import * as THREE from 'three';

export class Terrain {
  private scene: THREE.Scene;
  private ground!: THREE.Mesh;
  private colliders: THREE.Box3[] = [];
  private heightData: number[][] = [];
  private terrainSize = 300;
  private segments = 100;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createTerrain();
    this.createRoads();
    this.createBuildings();
    this.createCover();
    this.createTrees();
    this.createRocks();
  }

  private createTerrain(): void {
    // Create terrain with height variation
    const size = this.terrainSize;
    const segments = this.segments;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Initialize height data array
    for (let i = 0; i <= segments; i++) {
      this.heightData[i] = [];
      for (let j = 0; j <= segments; j++) {
        this.heightData[i][j] = 0;
      }
    }
    
    // Add height variation
    const vertices = geometry.attributes.position.array;
    let vertexIndex = 0;
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const idx = vertexIndex * 3;
        const x = vertices[idx];
        const y = vertices[idx + 1];
        
        // Create gentle hills
        let height = 
          Math.sin(x * 0.02) * 3 + 
          Math.cos(y * 0.02) * 3 +
          Math.sin(x * 0.05 + y * 0.05) * 1.5;
        
        // Flatten center area for gameplay
        const distFromCenter = Math.sqrt(x * x + y * y);
        if (distFromCenter < 60) {
          height *= distFromCenter / 60;
        }
        
        // Flatten road areas
        if (Math.abs(x) < 6 || Math.abs(y) < 6) {
          height *= 0.1;
        }
        
        vertices[idx + 2] = height;
        this.heightData[i][j] = height;
        vertexIndex++;
      }
    }
    
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3d5c3d,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  // Get terrain height at any world position
  public getHeightAt(x: number, z: number): number {
    const halfSize = this.terrainSize / 2;
    const segmentSize = this.terrainSize / this.segments;
    
    // Convert world coords to grid coords
    const gridX = Math.floor((x + halfSize) / segmentSize);
    const gridZ = Math.floor((z + halfSize) / segmentSize);
    
    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(this.segments, gridX));
    const clampedZ = Math.max(0, Math.min(this.segments, gridZ));
    
    if (this.heightData[clampedZ] && this.heightData[clampedZ][clampedX] !== undefined) {
      return this.heightData[clampedZ][clampedX];
    }
    return 0;
  }

  private createRoads(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // Create road segments that follow terrain
    const segmentLength = 10;
    const roadWidth = 8;

    // Horizontal road (along X axis)
    for (let x = -95; x < 95; x += segmentLength) {
      const segment = new THREE.Mesh(
        new THREE.PlaneGeometry(segmentLength, roadWidth),
        roadMaterial
      );
      segment.rotation.x = -Math.PI / 2;
      const height = this.getHeightAt(x + segmentLength / 2, 0);
      segment.position.set(x + segmentLength / 2, height + 0.1, 0);
      segment.receiveShadow = true;
      this.scene.add(segment);
    }

    // Vertical road (along Z axis)
    for (let z = -95; z < 95; z += segmentLength) {
      const segment = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, segmentLength),
        roadMaterial
      );
      segment.rotation.x = -Math.PI / 2;
      const height = this.getHeightAt(0, z + segmentLength / 2);
      segment.position.set(0, height + 0.1, z + segmentLength / 2);
      segment.receiveShadow = true;
      this.scene.add(segment);
    }

    // Road markings
    const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = -90; i < 90; i += 10) {
      const marking = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 0.3),
        markingMaterial
      );
      marking.rotation.x = -Math.PI / 2;
      const height = this.getHeightAt(i, 0);
      marking.position.set(i, height + 0.15, 0);
      this.scene.add(marking);
    }
  }

  private createBuildings(): void {
    const buildingPositions = [
      { x: 40, z: 40, w: 15, h: 12, d: 15 },
      { x: -45, z: 35, w: 20, h: 8, d: 12 },
      { x: 50, z: -40, w: 12, h: 15, d: 12 },
      { x: -40, z: -45, w: 18, h: 10, d: 18 },
      { x: 70, z: 10, w: 10, h: 20, d: 10 },
      { x: -70, z: -10, w: 14, h: 14, d: 14 },
    ];

    buildingPositions.forEach(pos => {
      this.createRuinedBuilding(pos.x, pos.z, pos.w, pos.h, pos.d);
    });

    // Watchtowers
    this.createWatchtower(60, -60);
    this.createWatchtower(-60, 60);
  }

  private createRuinedBuilding(x: number, z: number, w: number, h: number, d: number): void {
    const group = new THREE.Group();

    // Main structure
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9
    });

    // Walls with holes
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const building = new THREE.Mesh(wallGeo, wallMaterial);
    building.position.y = h / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    // Damage holes (dark boxes to simulate destruction)
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const numHoles = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numHoles; i++) {
      const holeSize = 2 + Math.random() * 3;
      const hole = new THREE.Mesh(
        new THREE.BoxGeometry(holeSize, holeSize, 0.5),
        holeMaterial
      );
      hole.position.set(
        (Math.random() - 0.5) * (w - 4),
        2 + Math.random() * (h - 4),
        d / 2 + 0.1
      );
      group.add(hole);
    }

    // Rubble around building
    for (let i = 0; i < 5; i++) {
      const rubble = new THREE.Mesh(
        new THREE.BoxGeometry(
          1 + Math.random() * 2,
          0.5 + Math.random(),
          1 + Math.random() * 2
        ),
        wallMaterial
      );
      rubble.position.set(
        (Math.random() - 0.5) * (w + 8),
        0.3,
        (Math.random() - 0.5) * (d + 8)
      );
      rubble.rotation.y = Math.random() * Math.PI;
      rubble.castShadow = true;
      group.add(rubble);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    // Add collider
    const box = new THREE.Box3().setFromObject(building);
    box.translate(new THREE.Vector3(x, 0, z));
    this.colliders.push(box);
  }

  private createWatchtower(x: number, z: number): void {
    const group = new THREE.Group();
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9
    });

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.3, 0.4, 12, 6);
    const positions = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
    positions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMaterial);
      leg.position.set(lx, 6, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.5, 6),
      woodMaterial
    );
    platform.position.y = 10;
    platform.castShadow = true;
    group.add(platform);

    // Railings
    const railGeo = new THREE.BoxGeometry(6, 1, 0.2);
    [[-3, 0], [3, 0]].forEach(([rz], i) => {
      const rail = new THREE.Mesh(railGeo, woodMaterial);
      rail.position.set(0, 11, rz);
      if (i === 0) rail.rotation.y = Math.PI / 2;
      group.add(rail);
    });

    // Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
    );
    roof.position.y = 13;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  private createCover(): void {
    const coverPositions = [
      { x: 15, z: 5, type: 'sandbag' },
      { x: -12, z: 8, type: 'sandbag' },
      { x: 20, z: -15, type: 'barrier' },
      { x: -18, z: -12, type: 'barrier' },
      { x: 8, z: 20, type: 'crate' },
      { x: -8, z: -20, type: 'crate' },
      { x: 25, z: 25, type: 'sandbag' },
      { x: -25, z: 25, type: 'barrier' },
      { x: 30, z: -10, type: 'crate' },
      { x: -30, z: 10, type: 'sandbag' },
    ];

    coverPositions.forEach(pos => {
      if (pos.type === 'sandbag') this.createSandbags(pos.x, pos.z);
      else if (pos.type === 'barrier') this.createBarrier(pos.x, pos.z);
      else this.createCrate(pos.x, pos.z);
    });
  }

  private createSandbags(x: number, z: number): void {
    const group = new THREE.Group();
    const bagMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 1
    });

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4 - row; col++) {
        const bag = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.4, 0.6),
          bagMaterial
        );
        bag.position.set(
          col * 1.3 - (3 - row) * 0.65 + 0.65,
          row * 0.4 + 0.2,
          0
        );
        bag.castShadow = true;
        group.add(bag);
      }
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.colliders.push(box);
  }

  private createBarrier(x: number, z: number): void {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.7 })
    );
    barrier.position.set(x, 0.75, z);
    barrier.rotation.y = Math.random() * Math.PI;
    barrier.castShadow = true;
    this.scene.add(barrier);

    // Stripes
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.4, 0.52),
        stripeMaterial
      );
      stripe.position.set(x + (i - 1) * 1.2, 0.75, z);
      stripe.rotation.y = barrier.rotation.y;
      this.scene.add(stripe);
    }

    const box = new THREE.Box3().setFromObject(barrier);
    this.colliders.push(box);
  }

  private createCrate(x: number, z: number): void {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
    );
    crate.position.set(x, 1, z);
    crate.rotation.y = Math.random() * 0.5;
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);

    const box = new THREE.Box3().setFromObject(crate);
    this.colliders.push(box);
  }

  private createTrees(): void {
    const treePositions: { x: number; z: number }[] = [];
    
    // Generate tree positions around the map edges
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      treePositions.push({
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance
      });
    }

    treePositions.forEach(pos => this.createTree(pos.x, pos.z));
  }

  private createTree(x: number, z: number): void {
    const group = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d,
      roughness: 0.8
    });

    const sizes = [3, 2.5, 1.8];
    const heights = [4, 5.5, 7];
    sizes.forEach((size, i) => {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(size, 2.5, 6),
        foliageMaterial
      );
      foliage.position.y = heights[i];
      foliage.castShadow = true;
      group.add(foliage);
    });

    group.position.set(x, 0, z);
    group.scale.setScalar(0.8 + Math.random() * 0.4);
    this.scene.add(group);
  }

  private createRocks(): void {
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9
    });

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 60;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 0),
        rockMaterial
      );
      rock.position.set(x, 0.5, z);
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.set(
        1 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        1 + Math.random() * 0.5
      );
      rock.castShadow = true;
      this.scene.add(rock);

      if (rock.scale.x > 1.2) {
        const box = new THREE.Box3().setFromObject(rock);
        this.colliders.push(box);
      }
    }
  }

  public getColliders(): THREE.Box3[] {
    return this.colliders;
  }
}
