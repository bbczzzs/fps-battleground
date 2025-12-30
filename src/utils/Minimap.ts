import * as THREE from 'three';
import { Enemy } from '../entities/Enemy';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 200;
  private scale = 2; // meters per pixel
  private radarRadius = 100;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      border: 3px solid rgba(0, 255, 0, 0.6);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.7);
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
      z-index: 100;
    `;
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d')!;
  }

  public update(camera: THREE.Camera, enemies: Enemy[]): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.size, this.size);
    
    // Draw background circle
    this.ctx.fillStyle = 'rgba(10, 30, 10, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(this.size / 2, this.size / 2, this.radarRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    this.ctx.lineWidth = 1;
    
    // Vertical and horizontal center lines
    this.ctx.beginPath();
    this.ctx.moveTo(this.size / 2, this.size / 2 - this.radarRadius);
    this.ctx.lineTo(this.size / 2, this.size / 2 + this.radarRadius);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.size / 2 - this.radarRadius, this.size / 2);
    this.ctx.lineTo(this.size / 2 + this.radarRadius, this.size / 2);
    this.ctx.stroke();
    
    // Draw concentric circles
    for (let r = 25; r < this.radarRadius; r += 25) {
      this.ctx.beginPath();
      this.ctx.arc(this.size / 2, this.size / 2, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    // Get player position and rotation
    const playerPos = camera.position;
    const playerDir = new THREE.Vector3();
    camera.getWorldDirection(playerDir);
    const playerAngle = Math.atan2(playerDir.x, playerDir.z);
    
    // Draw enemies
    enemies.forEach(enemy => {
      if (enemy.isDead()) return;
      
      const enemyPos = enemy.getPosition();
      const relativePos = new THREE.Vector3()
        .subVectors(enemyPos, playerPos);
      
      // Rotate relative to player facing direction
      const rotatedX = relativePos.x * Math.cos(-playerAngle) - relativePos.z * Math.sin(-playerAngle);
      const rotatedZ = relativePos.x * Math.sin(-playerAngle) + relativePos.z * Math.cos(-playerAngle);
      
      // Convert to screen space
      const screenX = this.size / 2 + (rotatedX / this.scale);
      const screenY = this.size / 2 + (rotatedZ / this.scale);
      
      // Only draw if within radar range
      const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
      if (distance < this.radarRadius * this.scale) {
        // Draw enemy dot
        this.ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw enemy direction indicator
        const enemyToPlayer = new THREE.Vector3()
          .subVectors(playerPos, enemyPos)
          .normalize();
        
        const enemyAngle = Math.atan2(enemyToPlayer.x, enemyToPlayer.z) - playerAngle;
        const indicatorLength = 6;
        const endX = screenX + Math.sin(enemyAngle) * indicatorLength;
        const endY = screenY + Math.cos(enemyAngle) * indicatorLength;
        
        this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    });
    
    // Draw player (center) with direction indicator
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    
    // Player dot
    this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Direction arrow
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX, centerY - 15);
    this.ctx.stroke();
    
    // Arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 15);
    this.ctx.lineTo(centerX - 4, centerY - 10);
    this.ctx.moveTo(centerX, centerY - 15);
    this.ctx.lineTo(centerX + 4, centerY - 10);
    this.ctx.stroke();
    
    // Draw border
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.size / 2, this.size / 2, this.radarRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw compass directions
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const compassRadius = this.radarRadius + 15;
    this.ctx.fillText('N', centerX, centerY - compassRadius);
    this.ctx.fillText('S', centerX, centerY + compassRadius);
    this.ctx.fillText('E', centerX + compassRadius, centerY);
    this.ctx.fillText('W', centerX - compassRadius, centerY);
  }

  public destroy(): void {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
