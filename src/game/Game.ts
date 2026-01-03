import * as THREE from 'three';
import { Player } from '../entities/Player';
import { Enemy, EnemyType } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Weapon } from '../weapons/Weapon';
import { MultiWeapon, WeaponType } from '../weapons/WeaponTypes';
import { GrenadeSystem } from '../weapons/Grenade';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { InputManager } from '../utils/InputManager';
import { CollisionManager } from '../utils/CollisionManager';
import { Minimap } from '../utils/Minimap';
import { KillstreakSystem } from '../utils/KillstreakSystem';
import { Terrain } from '../world/Terrain';
import { SkySystem } from '../world/SkySystem';
import { WeatherSystem } from '../world/WeatherSystem';
import { Helicopter } from '../vehicles/Helicopter';
import { ParticleSystem } from '../effects/ParticleSystem';
import { CombatEffects } from '../effects/CombatEffects';
import { AmbientSystem } from '../effects/AmbientSystem';
import { Vehicle, VehicleType } from '../vehicles/Vehicle';
import { MultiplayerManager, PlayerState, GameMessage } from '../multiplayer/MultiplayerManager';
import { NetworkPlayer } from '../multiplayer/NetworkPlayer';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private weapon: Weapon;
  private multiWeapon: MultiWeapon;
  private useMultiWeapon = true; // Use enhanced weapon system
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
  
  // Enhanced systems
  private minimap!: Minimap;
  private killstreakSystem!: KillstreakSystem;
  private grenadeSystem!: GrenadeSystem;
  private weatherSystem!: WeatherSystem;
  private powerUps: PowerUp[] = [];
  private waveNumber = 1;
  private bossSpawned = false;

  // Drivable vehicles
  private vehicles: Vehicle[] = [];
  private playerVehicle: Vehicle | null = null;
  private nearbyVehicle: Vehicle | null = null;

  // Multiplayer
  private isMultiplayer = false;
  private multiplayerManager: MultiplayerManager | null = null;
  private networkPlayer: NetworkPlayer | null = null;
  private myKills = 0;
  private enemyKills = 0;
  private readonly KILLS_TO_WIN = 5;
  private lastStateSent = 0;
  private readonly STATE_SEND_RATE = 50; // ms

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xCFE9FF); // Sky color from palette

    // Camera setup - narrower FOV for cartoon feel
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer setup - bright cartoon style
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3; // Brighter exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    // Initialize managers
    this.inputManager = new InputManager();
    this.collisionManager = new CollisionManager();
    this.clock = new THREE.Clock();

    // Initialize player
    this.player = new Player(this.camera);
    
    // Initialize weapon
    this.weapon = new Weapon(this.camera, this.scene);
    this.multiWeapon = new MultiWeapon(this.camera, this.scene);

    // Setup world
    this.skySystem = new SkySystem(this.scene);
    this.terrain = new Terrain(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.combatEffects = new CombatEffects();
    this.ambientSystem = new AmbientSystem();
    
    // Initialize enhanced systems
    this.minimap = new Minimap();
    this.killstreakSystem = new KillstreakSystem();
    this.grenadeSystem = new GrenadeSystem(this.scene, this.particleSystem);
    this.weatherSystem = new WeatherSystem(this.scene);

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
    
    // Power-ups disabled
    // this.spawnPowerUps();
    
    // Setup weapon switching
    this.setupWeaponSwitching();

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

    // Spawn boats near the dock/river
    const boat1 = new Vehicle(
      this.scene,
      VehicleType.BOAT,
      new THREE.Vector3(80, -0.3, 5)
    );
    boat1.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));
    this.vehicles.push(boat1);

    const boat2 = new Vehicle(
      this.scene,
      VehicleType.BOAT,
      new THREE.Vector3(90, -0.3, -40)
    );
    boat2.setTerrainHeightFunction((x: number, z: number) => this.terrain.getHeightAt(x, z));
    this.vehicles.push(boat2);
  }

  private spawnEnemies(): void {
    const enemyTypes: EnemyType[] = ['rifle', 'smg', 'heavy'];
    const colliders = this.terrain.getColliders();
    
    // Spawn initial wave of enemies
    const enemyCount = 8 + Math.floor(this.waveNumber * 1.5);
    for (let i = 0; i < enemyCount; i++) {
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
  
  private setupWeaponSwitching(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      
      // Number keys for weapon switching
      switch (e.key) {
        case '1':
          this.multiWeapon.switchWeapon(WeaponType.RIFLE);
          this.showWeaponNotification('Assault Rifle');
          break;
        case '2':
          this.multiWeapon.switchWeapon(WeaponType.SHOTGUN);
          this.showWeaponNotification('Shotgun');
          break;
        case '3':
          this.multiWeapon.switchWeapon(WeaponType.SNIPER);
          this.showWeaponNotification('Sniper Rifle');
          break;
        case '4':
          this.multiWeapon.switchWeapon(WeaponType.SMG);
          this.showWeaponNotification('SMG');
          break;
        case 'g':
        case 'G':
          this.throwGrenade();
          break;
        case 'b':
        case 'B':
          this.weatherSystem.cycleWeather();
          this.showWeatherNotification();
          break;
      }
    });
  }
  
  private showWeaponNotification(name: string): void {
    let notification = document.getElementById('weapon-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'weapon-notification';
      notification.style.cssText = `
        position: fixed; bottom: 200px; left: 50%;
        transform: translateX(-50%); padding: 10px 25px;
        background: rgba(0, 0, 0, 0.8); color: #00ff00;
        font-family: 'Rajdhani', sans-serif; font-size: 24px;
        border: 1px solid #00ff00; border-radius: 5px;
        z-index: 100; opacity: 0; transition: opacity 0.3s ease;
      `;
      document.body.appendChild(notification);
    }
    
    notification.textContent = name;
    notification.style.opacity = '1';
    
    setTimeout(() => {
      if (notification) notification.style.opacity = '0';
    }, 1500);
  }
  
  private showWeatherNotification(): void {
    const weatherNames: Record<string, string> = {
      clear: '☀️ Clear',
      fog: '🌫️ Fog',
      rain: '🌧️ Rain',
      snow: '❄️ Snow',
      storm: '⛈️ Storm'
    };
    
    let notification = document.getElementById('weather-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'weather-notification';
      notification.style.cssText = `
        position: fixed; top: 100px; left: 50%;
        transform: translateX(-50%); padding: 10px 25px;
        background: rgba(0, 0, 0, 0.8); color: #aaddff;
        font-family: 'Rajdhani', sans-serif; font-size: 24px;
        border: 1px solid #aaddff; border-radius: 5px;
        z-index: 100; opacity: 0; transition: opacity 0.3s ease;
      `;
      document.body.appendChild(notification);
    }
    
    notification.textContent = weatherNames[this.weatherSystem.getCurrentWeather()] || 'Weather Changed';
    notification.style.opacity = '1';
    
    setTimeout(() => {
      if (notification) notification.style.opacity = '0';
    }, 2000);
  }
  
  private throwGrenade(): void {
    if (this.playerVehicle) return;
    
    const position = this.camera.position.clone();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y += 0.3; // Arc upward
    direction.normalize();
    
    if (this.grenadeSystem.throwGrenade(position, direction, 20)) {
      this.updateGrenadeHUD();
    }
  }
  
  private updateGrenadeHUD(): void {
    let grenadeEl = document.getElementById('grenade-count');
    if (!grenadeEl) {
      grenadeEl = document.createElement('div');
      grenadeEl.id = 'grenade-count';
      grenadeEl.style.cssText = `
        position: fixed; bottom: 100px; left: 40px;
        padding: 8px 15px; background: rgba(0, 0, 0, 0.7);
        color: #00ff00; font-family: 'Rajdhani', sans-serif;
        font-size: 18px; border-radius: 5px; z-index: 100;
      `;
      document.body.appendChild(grenadeEl);
    }
    
    grenadeEl.textContent = `🔴 x${this.grenadeSystem.getGrenadeCount()}`;
  }
  
  private spawnBoss(): void {
    if (this.bossSpawned) return;
    
    this.bossSpawned = true;
    const angle = Math.random() * Math.PI * 2;
    const distance = 50;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = this.terrain.getHeightAt(x, z);
    
    const boss = new Enemy(
      this.scene,
      new THREE.Vector3(x, y, z),
      'boss'
    );
    
    boss.setTerrainHeightFunction((ex: number, ez: number) => this.terrain.getHeightAt(ex, ez));
    boss.setColliders(this.terrain.getColliders());
    
    this.enemies.push(boss);
    
    // Show boss warning
    this.showBossWarning();
  }
  
  private showBossWarning(): void {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed; top: 40%; left: 50%;
      transform: translate(-50%, -50%); padding: 20px 50px;
      background: rgba(100, 0, 0, 0.9); color: #ff0000;
      font-family: 'Impact', sans-serif; font-size: 48px;
      text-shadow: 0 0 20px #ff0000; border: 3px solid #ff0000;
      z-index: 200; animation: pulse 0.5s ease infinite alternate;
    `;
    warning.textContent = '⚠️ BOSS INCOMING ⚠️';
    document.body.appendChild(warning);
    
    setTimeout(() => warning.remove(), 3000);
  }

  public start(): void {
    this.isRunning = true;
    this.isMultiplayer = false;
    
    // Setup pointer lock change listener (pointer lock already requested on click)
    if (!this.inputManager.isMobile) {
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== document.body) {
          this.pause();
        }
      });
      
      // Re-lock on click if lost
      document.addEventListener('click', () => {
        if (!document.pointerLockElement && this.isRunning) {
          document.body.requestPointerLock();
        }
      });
    }

    // Start game loop
    this.gameLoop();
  }

  public startMultiplayer(manager: MultiplayerManager): void {
    this.isRunning = true;
    this.isMultiplayer = true;
    this.multiplayerManager = manager;
    this.myKills = 0;
    this.enemyKills = 0;
    
    // Hide solo-mode HUD elements
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) statsContainer.style.display = 'none';
    
    // Show multiplayer score display
    const mpScore = document.getElementById('mp-score-display');
    if (mpScore) mpScore.style.display = 'flex';
    
    // Set names in HUD
    const mpYourName = document.getElementById('mp-your-name');
    const mpEnemyName = document.getElementById('mp-enemy-name');
    if (mpYourName) mpYourName.textContent = manager.getPlayerName();
    if (mpEnemyName) mpEnemyName.textContent = manager.getOpponentName();
    
    // Remove AI enemies for 1v1
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    
    // Create network player (opponent)
    this.networkPlayer = new NetworkPlayer(this.scene, manager.getOpponentName());
    
    // Spawn at different positions based on host/client
    const spawnPos = manager.getIsHost() 
      ? new THREE.Vector3(-20, 2, -20)
      : new THREE.Vector3(20, 2, 20);
    this.player.setPosition(spawnPos);
    
    // Setup multiplayer callbacks
    this.setupMultiplayerCallbacks();
    
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

  private setupMultiplayerCallbacks(): void {
    if (!this.multiplayerManager) return;
    
    // Receive opponent state updates (compact format)
    this.multiplayerManager.onState((state: PlayerState) => {
      if (this.networkPlayer) {
        this.networkPlayer.setTargetState(
          new THREE.Vector3(state.x, state.y, state.z),
          new THREE.Euler(0, state.r, 0)
        );
        this.networkPlayer.setHealth(state.h);
        
        if (state.s === 1) {
          this.networkPlayer.shoot();
        }
      }
    });
    
    // Receive game events (compact format)
    this.multiplayerManager.onEvent((event: GameMessage) => {
      switch (event.t) {
        case 'hit':
          // I got hit by opponent
          this.player.takeDamage(event.d.damage);
          // Visual damage feedback
          
          if (this.player.getHealth() <= 0) {
            this.handleMyDeath();
          }
          break;
          
        case 'death':
          // Opponent died (I killed them)
          this.myKills++;
          this.updateMultiplayerScore();
          this.checkWinCondition();
          break;
          
        case 'respawn':
          // Opponent respawned
          if (this.networkPlayer) {
            this.networkPlayer.respawn(new THREE.Vector3(
              event.d.x,
              event.d.y,
              event.d.z
            ));
          }
          break;
          
        case 'win':
          // Opponent won
          this.showMatchResult(false);
          break;
      }
    });
  }

  private handleMyDeath(): void {
    // Notify opponent
    this.multiplayerManager?.sendDeath();
    
    // Respawn after delay
    setTimeout(() => {
      const spawnPos = this.multiplayerManager?.getIsHost()
        ? new THREE.Vector3(-20 + Math.random() * 10, 2, -20 + Math.random() * 10)
        : new THREE.Vector3(20 + Math.random() * 10, 2, 20 + Math.random() * 10);
      
      this.player.setPosition(spawnPos);
      this.player.heal(100);
      
      // Notify opponent of respawn
      this.multiplayerManager?.sendRespawn(spawnPos.x, spawnPos.y, spawnPos.z);
    }, 2000);
  }

  private updateMultiplayerScore(): void {
    const myScoreEl = document.getElementById('mp-your-score');
    const enemyScoreEl = document.getElementById('mp-enemy-score');
    
    if (myScoreEl) myScoreEl.textContent = this.myKills.toString();
    if (enemyScoreEl) enemyScoreEl.textContent = this.enemyKills.toString();
  }

  private checkWinCondition(): void {
    if (this.myKills >= this.KILLS_TO_WIN) {
      this.multiplayerManager?.sendWin(this.myKills);
      this.showMatchResult(true);
    }
  }

  private showMatchResult(won: boolean): void {
    this.isRunning = false;
    
    const resultEl = document.getElementById('match-result');
    const titleEl = document.getElementById('result-title');
    const myScoreEl = document.getElementById('final-your-score');
    const enemyScoreEl = document.getElementById('final-enemy-score');
    const rematchBtn = document.getElementById('rematch-btn');
    
    if (resultEl) resultEl.style.display = 'flex';
    if (titleEl) {
      titleEl.textContent = won ? 'VICTORY' : 'DEFEAT';
      titleEl.className = 'result-title ' + (won ? 'victory' : 'defeat');
    }
    if (myScoreEl) myScoreEl.textContent = this.myKills.toString();
    if (enemyScoreEl) enemyScoreEl.textContent = this.enemyKills.toString();
    
    rematchBtn?.addEventListener('click', () => {
      location.reload();
    });
  }

  private sendPlayerState(): void {
    if (!this.multiplayerManager || !this.isMultiplayer) return;
    
    const now = Date.now();
    if (now - this.lastStateSent < this.STATE_SEND_RATE) return;
    
    const pos = this.player.getPosition();
    const dir = this.player.getDirection();
    const yaw = Math.atan2(dir.x, dir.z);
    
    // Compact state format for less network overhead
    const state: PlayerState = {
      x: Math.round(pos.x * 100) / 100,
      y: Math.round(pos.y * 100) / 100,
      z: Math.round(pos.z * 100) / 100,
      r: Math.round(yaw * 100) / 100,
      h: Math.round(this.player.getHealth()),
      s: this.inputManager.isMouseDown ? 1 : 0
    };
    
    this.multiplayerManager.sendState(state);
    this.lastStateSent = now;
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
    
    // Apply mobile look (works in and out of vehicle)
    if (this.inputManager.isMobile) {
      const lookDelta = this.inputManager.getMobileLookDelta();
      this.player.applyMobileLook(lookDelta.x, lookDelta.y);
    }

    // Check for vehicle interaction
    this.handleVehicleInteraction();

    // Update player or vehicle
    if (this.playerVehicle) {
      // Player is in a vehicle - drive it (camera follows but look is free)
      this.playerVehicle.drive(delta, this.inputManager, this.camera);
    } else {
      // Normal player movement
      this.player.update(delta, this.inputManager, this.collisionManager);
    }

    // Handle shooting (only when not in vehicle)
    if (!this.playerVehicle && this.inputManager.isMouseDown) {
      const canShoot = this.useMultiWeapon ? this.multiWeapon.canShoot() : this.weapon.canShoot();
      
      if (canShoot) {
        if (this.useMultiWeapon) {
          const projectileArray = this.multiWeapon.shoot();
          projectileArray.forEach(p => this.projectiles.push(p));
          if (projectileArray.length > 0) {
            this.combatEffects.triggerScreenShake(0.3);
            this.ambientSystem.playShootSound();
          }
        } else {
          const projectile = this.weapon.shoot();
          if (projectile) {
            this.projectiles.push(projectile);
            this.combatEffects.triggerScreenShake(0.3);
            this.ambientSystem.playShootSound();
          }
        }
      }
    }

    // Handle reload
    if (this.inputManager.isReloading) {
      if (this.useMultiWeapon) {
        this.multiWeapon.reload();
      } else {
        this.weapon.reload();
      }
      this.inputManager.isReloading = false;
      this.ambientSystem.playReloadSound();
    }

    // Update projectiles
    this.updateProjectiles(delta);

    // Update enemies (solo mode only)
    if (!this.isMultiplayer) {
      this.updateEnemies(delta);
    }
    
    // Update network player in multiplayer
    if (this.isMultiplayer && this.networkPlayer) {
      this.networkPlayer.update(delta, this.camera.position);
      this.checkMultiplayerHits();
      this.sendPlayerState();
    }
    
    // Update grenades
    this.grenadeSystem.update(delta, (x, z) => this.terrain.getHeightAt(x, z));
    this.checkGrenadeExplosions();
    
    // Update power-ups
    this.updatePowerUps();
    
    // Update enhanced systems
    this.killstreakSystem.update(delta);
    this.minimap.update(this.camera, this.enemies);
    this.weatherSystem.update(delta, this.camera.position);

    // Update weapon (hide when in vehicle)
    if (this.playerVehicle) {
      this.weapon.hide();
      this.multiWeapon.hide();
    } else {
      if (this.useMultiWeapon) {
        this.multiWeapon.show();
        this.multiWeapon.update(delta, this.inputManager.isAiming);
      } else {
        this.weapon.show();
        this.weapon.update(delta, this.inputManager.isAiming);
      }
    }

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

  private checkMultiplayerHits(): void {
    if (!this.networkPlayer || !this.isMultiplayer) return;
    
    const networkPos = this.networkPlayer.getPosition();
    
    // Check projectiles against network player
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const projPos = proj.getPosition();
      
      // Simple distance check (hit radius)
      const dist = projPos.distanceTo(networkPos);
      if (dist < 1.5) { // Hit radius for player
        // Send hit to opponent
        this.multiplayerManager?.sendHit(proj.getDamage());
        
        // Remove projectile
        proj.destroy();
        this.projectiles.splice(i, 1);
        
        // Visual feedback
        this.particleSystem.createExplosion(projPos);
      }
    }
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
            const multiplier = this.killstreakSystem.getScoreMultiplier();
            this.score += Math.floor(points * multiplier);
            this.kills++;
            
            // Register kill for killstreak
            this.killstreakSystem.registerKill();
            
            this.combatEffects.showKillPopup(Math.floor(points * multiplier), isHeadshot);
            this.particleSystem.createExplosion(enemy.getPosition());
            
            // Check if boss was killed
            const wasBoss = enemy.getType() === 'boss';
            if (wasBoss) {
              this.bossSpawned = false;
              this.score += 500;
              this.waveNumber++;
            }
            
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
              
              // Spawn boss every 10 kills
              if (this.kills > 0 && this.kills % 10 === 0 && !this.bossSpawned) {
                this.spawnBoss();
              }
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
  
  private updatePowerUps(): void {
    const playerPos = this.player.getPosition();
    
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.update(0.016);
      
      if (powerUp.checkCollision(playerPos)) {
        this.collectPowerUp(powerUp);
        powerUp.collect();
        
        // Respawn after delay
        setTimeout(() => {
          const angle = Math.random() * Math.PI * 2;
          const distance = 25 + Math.random() * 40;
          const types: PowerUpType[] = ['health', 'ammo', 'speed', 'shield', 'damage'];
          const type = types[Math.floor(Math.random() * types.length)];
          const x = Math.cos(angle) * distance;
          const z = Math.sin(angle) * distance;
          const y = this.terrain.getHeightAt(x, z);
          
          const newPowerUp = new PowerUp(this.scene, new THREE.Vector3(x, y, z), type);
          this.powerUps.push(newPowerUp);
        }, 15000);
        
        this.powerUps.splice(i, 1);
      }
    }
  }
  
  private collectPowerUp(powerUp: PowerUp): void {
    const type = powerUp.getType();
    const value = powerUp.getValue();
    
    switch (type) {
      case 'health':
        this.player.heal(value);
        break;
      case 'ammo':
        if (this.useMultiWeapon) {
          this.multiWeapon.addAmmo(value);
        }
        break;
      case 'speed':
        this.player.applySpeedBoost(value);
        break;
      case 'shield':
        this.player.addShield(value);
        break;
      case 'damage':
        // Could apply damage boost
        break;
    }
    
    this.showPowerUpNotification(powerUp.getDescription());
    this.ambientSystem.playPowerUpSound?.();
  }
  
  private showPowerUpNotification(description: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 60%; left: 50%;
      transform: translate(-50%, -50%); padding: 10px 25px;
      background: rgba(0, 50, 0, 0.9); color: #00ff00;
      font-family: 'Rajdhani', sans-serif; font-size: 28px;
      border: 2px solid #00ff00; border-radius: 5px;
      z-index: 150; animation: fadeUp 1s ease forwards;
    `;
    notification.textContent = description;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 1000);
  }
  
  private checkGrenadeExplosions(): void {
    // Check if any grenades exploded and apply damage
    const explodedGrenades = this.grenadeSystem.getActiveGrenades();
    
    explodedGrenades.forEach(grenade => {
      const explosionPos = grenade.getPosition();
      const radius = grenade.getExplosionRadius();
      const baseDamage = grenade.getExplosionDamage();
      
      // Damage enemies in radius
      this.enemies.forEach(enemy => {
        const distance = enemy.getPosition().distanceTo(explosionPos);
        if (distance < radius) {
          const damage = baseDamage * (1 - distance / radius);
          enemy.takeDamage(Math.floor(damage), false);
          
          if (enemy.isDead()) {
            this.score += 75;
            this.kills++;
            this.killstreakSystem.registerKill();
            this.combatEffects.showKillPopup(75, false);
            this.particleSystem.createExplosion(enemy.getPosition());
          }
        }
      });
      
      // Damage player if too close
      const playerDist = this.player.getPosition().distanceTo(explosionPos);
      if (playerDist < radius) {
        const damage = baseDamage * 0.5 * (1 - playerDist / radius);
        this.player.takeDamage(Math.floor(damage));
        this.combatEffects.flashDamageOverlay();
        this.combatEffects.triggerScreenShake(1);
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

    // Stamina bar
    const staminaBar = document.getElementById('stamina-bar');
    if (staminaBar) {
      const staminaPercent = (this.player.getStamina() / this.player.getMaxStamina()) * 100;
      staminaBar.style.width = `${staminaPercent}%`;
      
      // Color based on stamina level
      if (staminaPercent > 50) {
        staminaBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd00)';
      } else if (staminaPercent > 25) {
        staminaBar.style.background = 'linear-gradient(90deg, #ff8800, #ffaa00)';
      } else {
        staminaBar.style.background = 'linear-gradient(90deg, #ff4400, #ff6600)';
      }
    }

    // Ammo (use multi-weapon if enabled)
    const ammoCurrent = document.getElementById('ammo-current');
    const ammoReserve = document.getElementById('ammo-reserve');
    if (this.useMultiWeapon) {
      if (ammoCurrent) ammoCurrent.textContent = this.multiWeapon.getCurrentAmmo().toString();
      if (ammoReserve) ammoReserve.textContent = this.multiWeapon.getReserveAmmo().toString();
    } else {
      if (ammoCurrent) ammoCurrent.textContent = this.weapon.getCurrentAmmo().toString();
      if (ammoReserve) ammoReserve.textContent = this.weapon.getReserveAmmo().toString();
    }

    const scoreValue = document.getElementById('score-value');
    if (scoreValue) scoreValue.textContent = this.score.toString();

    const killsValue = document.getElementById('kills-value');
    if (killsValue) killsValue.textContent = this.kills.toString();
    
    // Update weapon name display
    this.updateWeaponDisplay();
    
    // Update grenade count
    this.updateGrenadeHUD();
    
    // Update compass
    this.updateCompass();
  }
  
  private updateWeaponDisplay(): void {
    let weaponEl = document.getElementById('weapon-name-display');
    if (!weaponEl) {
      weaponEl = document.createElement('div');
      weaponEl.id = 'weapon-name-display';
      weaponEl.style.cssText = `
        position: fixed; bottom: 30px; right: 180px;
        padding: 5px 15px; background: rgba(0, 0, 0, 0.6);
        color: #aaddff; font-family: 'Rajdhani', sans-serif;
        font-size: 16px; border-radius: 3px; z-index: 100;
      `;
      document.body.appendChild(weaponEl);
    }
    
    if (this.useMultiWeapon) {
      weaponEl.textContent = this.multiWeapon.getCurrentWeaponName();
    }
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
