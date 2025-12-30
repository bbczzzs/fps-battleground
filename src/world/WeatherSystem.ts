import * as THREE from 'three';

export enum WeatherType {
  CLEAR = 'clear',
  RAIN = 'rain',
  SNOW = 'snow',
  FOG = 'fog',
  STORM = 'storm'
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points | null = null;
  private currentWeather: WeatherType = WeatherType.CLEAR;
  private fogDensity = 0;
  private targetFogDensity = 0;
  private lightning: THREE.PointLight | null = null;
  private lightningTimer = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0);
  }

  public setWeather(type: WeatherType): void {
    this.clearCurrentWeather();
    this.currentWeather = type;

    switch (type) {
      case WeatherType.RAIN:
        this.createRain();
        this.targetFogDensity = 0.003;
        break;
      case WeatherType.SNOW:
        this.createSnow();
        this.targetFogDensity = 0.002;
        break;
      case WeatherType.FOG:
        this.targetFogDensity = 0.015;
        break;
      case WeatherType.STORM:
        this.createRain(true);
        this.targetFogDensity = 0.008;
        this.createLightning();
        break;
      case WeatherType.CLEAR:
        this.targetFogDensity = 0;
        break;
    }
  }

  private clearCurrentWeather(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem = null;
    }
    if (this.lightning) {
      this.scene.remove(this.lightning);
      this.lightning = null;
    }
  }

  private createRain(heavy: boolean = false): void {
    const particleCount = heavy ? 3000 : 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = Math.random() * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 200;
      velocities[i] = 30 + Math.random() * (heavy ? 40 : 20);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const material = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private createSnow(): void {
    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = Math.random() * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 200;
      velocities[i] = 3 + Math.random() * 3; // Slower fall
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private createLightning(): void {
    this.lightning = new THREE.PointLight(0xaaaaff, 0, 200);
    this.lightning.position.set(0, 50, 0);
    this.scene.add(this.lightning);
  }

  public update(delta: number, cameraPosition: THREE.Vector3): void {
    // Update fog density
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      const fogDiff = this.targetFogDensity - this.fogDensity;
      this.fogDensity += fogDiff * delta * 2;
      this.scene.fog.density = this.fogDensity;
    }

    // Update particles
    if (this.particleSystem) {
      const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
      const velocities = this.particleSystem.geometry.attributes.velocity.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        // Update Y position
        positions[i + 1] -= velocities[i / 3] * delta;

        // Reset when particle hits ground
        if (positions[i + 1] < 0) {
          positions[i + 1] = 100;
        }

        // Keep particles around camera
        const dx = positions[i] - cameraPosition.x;
        const dz = positions[i + 2] - cameraPosition.z;
        
        if (Math.abs(dx) > 100) {
          positions[i] = cameraPosition.x + (Math.random() - 0.5) * 200;
        }
        if (Math.abs(dz) > 100) {
          positions[i + 2] = cameraPosition.z + (Math.random() - 0.5) * 200;
        }

        // Snow drift effect
        if (this.currentWeather === WeatherType.SNOW) {
          positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.02;
          positions[i + 2] += Math.cos(Date.now() * 0.001 + i) * 0.02;
        }
      }

      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Update lightning for storm
    if (this.currentWeather === WeatherType.STORM && this.lightning) {
      this.lightningTimer += delta;
      
      // Random lightning strikes
      if (this.lightningTimer > 2 + Math.random() * 5) {
        this.lightningTimer = 0;
        this.triggerLightning(cameraPosition);
      }
    }
  }

  private triggerLightning(cameraPosition: THREE.Vector3): void {
    if (!this.lightning) return;

    // Position lightning near camera
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 70;
    this.lightning.position.set(
      cameraPosition.x + Math.cos(angle) * distance,
      30 + Math.random() * 40,
      cameraPosition.z + Math.sin(angle) * distance
    );

    // Flash
    this.lightning.intensity = 15;
    
    // Fade out
    let intensity = 15;
    const fadeInterval = setInterval(() => {
      intensity -= 1;
      if (this.lightning) {
        this.lightning.intensity = Math.max(0, intensity);
      }
      if (intensity <= 0) {
        clearInterval(fadeInterval);
      }
    }, 50);

    // Thunder sound (simple beep)
    this.playThunder();
  }

  private playThunder(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 50;
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.5);
    } catch (e) {
      // Audio not supported
    }
  }

  public getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  public cycleWeather(): void {
    const weathers = [
      WeatherType.CLEAR,
      WeatherType.FOG,
      WeatherType.RAIN,
      WeatherType.SNOW,
      WeatherType.STORM
    ];
    const currentIndex = weathers.indexOf(this.currentWeather);
    const nextIndex = (currentIndex + 1) % weathers.length;
    this.setWeather(weathers[nextIndex]);
  }

  public destroy(): void {
    this.clearCurrentWeather();
  }
}
