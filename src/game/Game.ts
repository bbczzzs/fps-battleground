import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy, EnemyType } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Weapon } from '../weapons/Weapon';
import { InputManager } from '../utils/InputManager';
import { CollisionManager } from '../utils/CollisionManager';
import { Terrain } from '../world/Terrain';
import { SkySystem } from '../world/SkySystem';
import { Helicopter } from '../vehicles/Helicopter';
import { ParticleSystem } from '../effects/ParticleSystem';
import { CombatEffects } from '../effects/CombatEffects';
import { AmbientSystem } from '../effects/AmbientSystem';
import { Vehicle, VehicleType } from '../vehicles/Vehicle';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private weapon: Weapon;
  private inputManager: InputManager;
  private collisionManager: CollisionManager;
  private clock: THREE.Clock;
  private isRunning = false;
  private score = 0;
  private kills = 0;

  // New systems
  private terrain!: Terrain;
  private skySystem!: SkySystem;
  private helicopters: Helicopter[] = [];
  private particleSystem!: ParticleSystem;
  private combatEffects!: CombatEffects;
  private ambientSystem!: AmbientSystem;

  // Drivable vehicles
  private vehicles: Vehicle[] = [];
  private playerVehicle: Vehicle | null = null;
  private nearbyVehicle: Vehicle | null = null;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer setup with optimizations
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    document.body.appendChild(this.renderer.domElement);

    // Initialize managers
    this.inputManager = new InputManager();
    this.collisionManager = new CollisionManager();
    this.clock = new THREE.Clock();

    // Initialize player
    this.player = new Player(this.camera);
    
    // Initialize weapon
    this.weapon = new Weapon(this.camera, this.scene);

    // Setup world
    this.skySystem = new SkySystem(this.scene);
    this.terrain = new Terrain(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.combatEffects = new CombatEffects();
    this.ambientSystem = new AmbientSystem();

    // Add terrain colliders directly to collision manager
    this.terrain.getColliders().forEach(box => {
      this.collisionManager.addCollider(box.clone());
    });

    // Connect player to terrain for ground collision
    this.player.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));

    // Spawn drivable vehicles
    this.spawnVehicles();

    // Spawn helicopters
    this.spawnHelicopters();

    // Spawn enemies
    this.spawnEnemies();

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());
  }

  private spawnHelicopters(): void {
    // Spawn 2 helicopters flying around
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const helicopter = new Helicopter(
        this.scene,
        new THREE.Vector3(Math.cos(angle) * 80, 50, Math.sin(angle) * 80)
      );
      this.helicopters.push(helicopter);
    }
  }

  private spawnVehicles(): void {
    // Spawn a car
    const car = new Vehicle(
      this.scene,
      VehicleType.CAR,
      new THREE.Vector3(-15, 0, 10)
    );
    car.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));
    this.vehicles.push(car);

    // Spawn a helicopter (drivable)
    const heli = new Vehicle(
      this.scene,
      VehicleType.HELICOPTER,
      new THREE.Vector3(20, 0, -15)
    );
    heli.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));
    this.vehicles.push(heli);

    // Spawn a plane
    const plane = new Vehicle(
      this.scene,
      VehicleType.PLANE,
      new THREE.Vector3(-25, 0, -25)
    );
    plane.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));
    this.vehicles.push(plane);
  }

  private spawnEnemies(): void {
    const enemyTypes: EnemyType[] = ['rifle', 'smg', 'heavy'];
    const colliders = this.terrain.getColliders();
    
    // Spawn initial wave of enemies
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 30;
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = this.terrain.getHeightAt(x, z);
      
      const enemy = new Enemy(
        this.scene,
        new THREE.Vector3(x, y, z),
        type
      );
      
      // Give enemy terrain and collision info
      enemy.setTerrainHeightFunction((ex: number, ez: number) => this.terrain.getHeightAt(ex, ez));
      enemy.setColliders(colliders);
      
      this.enemies.push(enemy);
    }
  }

  public start(): void {
    this.isRunning = true;
    
    // Lock pointer for FPS controls (desktop only)
    if (!this.inputManager.isMobile) {
      document.body.requestPointerLock();
      
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== document.body) {
          this.pause();
        }
      });
    }

    // Start game loop
    this.gameLoop();
  }

  private pause(): void {
    // Don't pause on mobile (no pointer lock)
    if (this.inputManager.isMobile) return;
    this.isRunning = false;
  }

  private gameLoop(): void {
    if (!this.isRunning) {
      requestAnimationFrame(() => this.gameLoop());
      return;
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    // Update mobile input each frame
    this.inputManager.updateMobileInput();
    
    // Apply mobile look
    if (this.inputManager.isMobile && !this.playerVehicle) {
      const lookDelta = this.inputManager.getMobileLookDelta();
      this.player.applyMobileLook(lookDelta.x, lookDelta.y);
    }

    // Check for vehicle interaction
    this.handleVehicleInteraction();

    // Update player or vehicle
    if (this.playerVehicle) {
      // Player is in a vehicle - drive it
      this.playerVehicle.drive(delta, this.inputManager, this.camera);
    } else {
      // Normal player movement
      this.player.update(delta, this.inputManager, this.collisionManager);
    }

    // Handle shooting (only when not in vehicle)
    if (!this.playerVehicle && this.inputManager.isMouseDown && this.weapon.canShoot()) {
      const projectile = this.weapon.shoot();
      if (projectile) {
        this.projectiles.push(projectile);
        this.combatEffects.triggerScreenShake(0.3);
        this.ambientSystem.playShootSound();
      }
    }

    // Handle reload
    if (this.inputManager.isReloading) {
      this.weapon.reload();
      this.inputManager.isReloading = false;
      this.ambientSystem.playReloadSound();
    }

    // Update projectiles
    this.updateProjectiles(delta);

    // Update enemies
    this.updateEnemies(delta);

    // Update weapon (hide when in vehicle)
    if (this.playerVehicle) {
      this.weapon.hide();
    } else {
      this.weapon.show();
    }
    this.weapon.update(delta, this.inputManager.isAiming);

    // Update world systems
    this.helicopters.forEach(h => h.update(delta));
    this.vehicles.forEach(v => v.update(delta));
    this.particleSystem.update(delta);
    this.skySystem.update(delta);

    // Update HUD
    this.updateHUD();

    // Render
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.gameLoop());
  }

  private handleVehicleInteraction(): void {
    // Check if player pressed E to enter/exit vehicle
    if (this.inputManager.consumeInteract()) {
      if (this.playerVehicle) {
        // Exit vehicle
        const exitPos = this.playerVehicle.exit();
        this.player.setPosition(exitPos);
        this.playerVehicle = null;
        this.nearbyVehicle = null;
      } else if (this.nearbyVehicle) {
        // Enter vehicle
        this.nearbyVehicle.enter();
        this.playerVehicle = this.nearbyVehicle;
      }
    }

    // Find nearby vehicle if not in one
    if (!this.playerVehicle) {
      this.nearbyVehicle = null;
      const playerPos = this.player.getPosition();
      
      for (const vehicle of this.vehicles) {
        const dist = playerPos.distanceTo(vehicle.getPosition());
        if (dist < 5) {
          this.nearbyVehicle = vehicle;
          break;
        }
      }
    }

    // Update vehicle prompt
    this.updateVehiclePrompt();
  }

  private updateVehiclePrompt(): void {
    let promptEl = document.getElementById('vehicle-prompt');
    
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.id = 'vehicle-prompt';
      promptEl.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 18px;
        border: 1px solid #00ff00;
        border-radius: 5px;
        display: none;
        z-index: 100;
      `;
      document.body.appendChild(promptEl);
    }

    if (this.playerVehicle) {
      promptEl.textContent = `Press E to exit ${this.playerVehicle.getTypeName()} | Q/Z: Up/Down | WASD: Move`;
      promptEl.style.display = 'block';
    } else if (this.nearbyVehicle) {
      promptEl.textContent = `Press E to enter ${this.nearbyVehicle.getTypeName()}`;
      promptEl.style.display = 'block';
    } else {
      promptEl.style.display = 'none';
    }
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);

      if (projectile.isExpired()) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        
        // Check for headshot
        const projectilePos = projectile.getPosition();
        const headPos = enemy.getHeadPosition();
        const isHeadshot = projectilePos.distanceTo(headPos) < 0.4;
        
        if (this.collisionManager.checkProjectileHit(projectile, enemy)) {
          enemy.takeDamage(projectile.damage, isHeadshot);
          projectile.destroy();
          this.projectiles.splice(i, 1);

          // Show hit marker and play sound
          this.combatEffects.showHitMarker(isHeadshot);
          this.ambientSystem.playHitSound(isHeadshot);

          if (enemy.isDead()) {
            const points = isHeadshot ? 150 : 100;
            this.score += points;
            this.kills++;
            
            this.combatEffects.showKillPopup(points, isHeadshot);
            this.particleSystem.createExplosion(enemy.getPosition());
            
            enemy.destroy();
            this.enemies.splice(j, 1);
            
            // Respawn enemy after delay
            setTimeout(() => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 35 + Math.random() * 25;
              const types: EnemyType[] = ['rifle', 'smg', 'heavy'];
              const type = types[Math.floor(Math.random() * types.length)];
              const x = Math.cos(angle) * distance;
              const z = Math.sin(angle) * distance;
              const y = this.terrain.getHeightAt(x, z);
              
              const newEnemy = new Enemy(
                this.scene,
                new THREE.Vector3(x, y, z),
                type
              );
              
              // Give new enemy terrain and collision info
              newEnemy.setTerrainHeightFunction((ex: number, ez: number) => this.terrain.getHeightAt(ex, ez));
              newEnemy.setColliders(this.terrain.getColliders());
              
              this.enemies.push(newEnemy);
            }, 2000 + Math.random() * 2000);
          }
          break;
        }
      }
    }
  }

  private updateEnemies(delta: number): void {
    this.enemies.forEach(enemy => {
      enemy.update(delta, this.player.getPosition());

      const distance = enemy.getPosition().distanceTo(this.player.getPosition());
      if (distance < 2 && enemy.canAttack()) {
        this.player.takeDamage(enemy.getDamage());
        enemy.attack();
        this.combatEffects.flashDamageOverlay();
        this.combatEffects.triggerScreenShake(0.5);
      }
    });
  }

  private updateHUD(): void {
    // Health circle
    const healthCircle = document.getElementById('health-circle-fill');
    if (healthCircle) {
      const health = this.player.getHealth();
      const circumference = 2 * Math.PI * 36;
      const offset = circumference - (health / 100) * circumference;
      healthCircle.style.strokeDashoffset = offset.toString();
      
      // Color based on health
      if (health > 60) healthCircle.style.stroke = '#00ff00';
      else if (health > 30) healthCircle.style.stroke = '#ffff00';
      else healthCircle.style.stroke = '#ff0000';
    }

    const healthText = document.getElementById('health-text');
    if (healthText) {
      healthText.textContent = Math.ceil(this.player.getHealth()).toString();
    }

    const ammoCurrent = document.getElementById('ammo-current');
    const ammoReserve = document.getElementById('ammo-reserve');
    if (ammoCurrent) ammoCurrent.textContent = this.weapon.getCurrentAmmo().toString();
    if (ammoReserve) ammoReserve.textContent = this.weapon.getReserveAmmo().toString();

    const scoreValue = document.getElementById('score-value');
    if (scoreValue) scoreValue.textContent = this.score.toString();

    const killsValue = document.getElementById('kills-value');
    if (killsValue) killsValue.textContent = this.kills.toString();
    
    // Update compass
    this.updateCompass();
  }
  
  private updateCompass(): void {
    const compassInner = document.getElementById('compass-inner');
    const compassDegree = document.getElementById('compass-degree');
    const playerCoords = document.getElementById('player-coords');
    
    if (!compassInner || !compassDegree || !playerCoords) return;
    
    // Get player rotation (yaw)
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    let angle = Math.atan2(direction.x, direction.z);
    let degrees = THREE.MathUtils.radToDeg(angle);
    if (degrees < 0) degrees += 360;
    
    // Update degree display
    compassDegree.textContent = Math.round(degrees) + '°';
    
    // Update coordinates
    const pos = this.camera.position;
    playerCoords.textContent = `X: ${Math.round(pos.x)} | Z: ${Math.round(pos.z)}`;
    
    // Generate compass ticks if not already done
    if (compassInner.children.length === 0) {
      const labels = ['N', '15', '30', '45', 'NE', '60', '75', '90', 'E', '105', '120', '135', 'SE', '150', '165', '180', 
                      'S', '195', '210', '225', 'SW', '240', '255', '270', 'W', '285', '300', '315', 'NW', '330', '345', '360'];
      
      // Create double set for seamless scrolling
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < labels.length; i++) {
          const tick = document.createElement('div');
          tick.className = 'compass-tick';
          const label = labels[i];
          
          if (['N', 'E', 'S', 'W'].includes(label)) {
            tick.classList.add('cardinal');
          } else if (['NE', 'SE', 'SW', 'NW'].includes(label)) {
            tick.classList.add('major');
          }
          
          tick.textContent = label;
          compassInner.appendChild(tick);
        }
      }
    }
    
    // Calculate offset (40px per 15 degrees = tick width)
    const ticksPerDegree = 40 / 15;
    const offset = degrees * ticksPerDegree;
    const stripWidth = 400;
    
    // Center the compass and apply offset
    const centerOffset = stripWidth / 2;
    compassInner.style.transform = `translateX(${centerOffset - offset}px)`;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
