import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';

interface StaticObject {
  mesh: THREE.Mesh;
  type: string;
  boundingBox: THREE.Box3;
}

export class CollisionManager {
  private staticObjects: StaticObject[] = [];
  private playerRadius = 0.5;

  public addStaticObject(mesh: THREE.Mesh, type: string): void {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    this.staticObjects.push({ mesh, type, boundingBox });
  }

  public checkPlayerCollision(
    position: THREE.Vector3, 
    movement: THREE.Vector3
  ): boolean {
    const newPosition = position.clone().add(movement);
    
    // Create player bounding sphere at new position
    const playerSphere = new THREE.Sphere(newPosition, this.playerRadius);

    for (const obj of this.staticObjects) {
      if (obj.type === 'ground') continue;
      
      // Check intersection with bounding box
      if (this.sphereIntersectsBox(playerSphere, obj.boundingBox)) {
        return true;
      }
    }

    return false;
  }

  private sphereIntersectsBox(sphere: THREE.Sphere, box: THREE.Box3): boolean {
    // Find closest point on box to sphere center
    const closestPoint = new THREE.Vector3();
    box.clampPoint(sphere.center, closestPoint);
    
    // Check if closest point is within sphere radius
    return closestPoint.distanceToSquared(sphere.center) <= sphere.radius * sphere.radius;
  }

  public checkProjectileHit(projectile: Projectile, enemy: Enemy): boolean {
    const projectilePos = projectile.getPosition();
    const enemyBox = enemy.getBoundingBox();
    
    // Expand bounding box slightly for better hit detection
    enemyBox.expandByScalar(0.1);
    
    return enemyBox.containsPoint(projectilePos);
  }

  public raycast(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    maxDistance: number = 100
  ): { point: THREE.Vector3; distance: number; object: THREE.Mesh } | null {
    const ray = new THREE.Ray(origin, direction.normalize());
    let closestHit: { point: THREE.Vector3; distance: number; object: THREE.Mesh } | null = null;

    for (const obj of this.staticObjects) {
      const intersection = ray.intersectBox(obj.boundingBox, new THREE.Vector3());
      
      if (intersection) {
        const distance = origin.distanceTo(intersection);
        
        if (distance <= maxDistance && (!closestHit || distance < closestHit.distance)) {
          closestHit = {
            point: intersection,
            distance: distance,
            object: obj.mesh
          };
        }
      }
    }

    return closestHit;
  }
}
