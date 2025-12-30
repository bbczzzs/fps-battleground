import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';

export class CollisionManager {
  private colliders: THREE.Box3[] = [];
  private playerRadius = 0.5;

  // Add a Box3 collider directly
  public addCollider(box: THREE.Box3): void {
    this.colliders.push(box);
  }
  
  // Add collider from mesh (legacy support)
  public addStaticObject(mesh: THREE.Mesh, type: string): void {
    if (type === 'ground') return;
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(boundingBox);
  }

  public checkPlayerCollision(
    position: THREE.Vector3, 
    movement: THREE.Vector3
  ): boolean {
    const newPosition = position.clone().add(movement);
    
    // Create player bounding box at new position (not sphere - more accurate)
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(newPosition.x, position.y - 0.5, newPosition.z),
      new THREE.Vector3(this.playerRadius * 2, 1.6, this.playerRadius * 2)
    );

    for (const collider of this.colliders) {
      if (playerBox.intersectsBox(collider)) {
        return true;
      }
    }

    return false;
  }
  
  // Check X and Z movement separately for sliding along walls
  public checkPlayerCollisionAxis(
    position: THREE.Vector3,
    movementX: number,
    movementZ: number
  ): { canMoveX: boolean; canMoveZ: boolean } {
    const result = { canMoveX: true, canMoveZ: true };
    
    // Check X movement
    const testBoxX = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x + movementX, position.y - 0.5, position.z),
      new THREE.Vector3(this.playerRadius * 2, 1.6, this.playerRadius * 2)
    );
    
    for (const collider of this.colliders) {
      if (testBoxX.intersectsBox(collider)) {
        result.canMoveX = false;
        break;
      }
    }
    
    // Check Z movement
    const testBoxZ = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, position.y - 0.5, position.z + movementZ),
      new THREE.Vector3(this.playerRadius * 2, 1.6, this.playerRadius * 2)
    );
    
    for (const collider of this.colliders) {
      if (testBoxZ.intersectsBox(collider)) {
        result.canMoveZ = false;
        break;
      }
    }
    
    return result;
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
  ): { point: THREE.Vector3; distance: number } | null {
    const ray = new THREE.Ray(origin, direction.normalize());
    let closestHit: { point: THREE.Vector3; distance: number } | null = null;

    for (const collider of this.colliders) {
      const intersection = ray.intersectBox(collider, new THREE.Vector3());
      
      if (intersection) {
        const distance = origin.distanceTo(intersection);
        
        if (distance <= maxDistance && (!closestHit || distance < closestHit.distance)) {
          closestHit = {
            point: intersection,
            distance: distance
          };
        }
      }
    }

    return closestHit;
  }
  
  public getColliders(): THREE.Box3[] {
    return this.colliders;
  }
}
