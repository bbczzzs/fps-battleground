export class AmbientSystem {
  private audioContext: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private isInitialized = false;

  constructor() {
    // Audio will be initialized on first user interaction
    document.addEventListener('click', () => this.initAudio(), { once: true });
    this.createAmbientVisuals();
  }

  private initAudio(): void {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new AudioContext();
      this.createWindSound();
      this.startDistantGunfire();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Audio not supported');
    }
  }

  private createWindSound(): void {
    if (!this.audioContext) return;

    // Create wind using filtered noise
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Low pass filter for wind effect
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.windGain = this.audioContext.createGain();
    this.windGain.gain.value = 0.05;

    whiteNoise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.audioContext.destination);

    whiteNoise.start();

    // Modulate wind intensity
    this.modulateWind();
  }

  private modulateWind(): void {
    if (!this.windGain) return;

    const modulate = () => {
      if (!this.windGain) return;
      const targetGain = 0.03 + Math.random() * 0.04;
      this.windGain.gain.linearRampToValueAtTime(
        targetGain,
        this.audioContext!.currentTime + 2
      );
      setTimeout(modulate, 2000 + Math.random() * 3000);
    };
    modulate();
  }

  private startDistantGunfire(): void {
    if (!this.audioContext) return;

    const playGunshot = () => {
      if (!this.audioContext) return;

      // Create gunshot sound
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = 100 + Math.random() * 50;

      filter.type = 'lowpass';
      filter.frequency.value = 500;

      // Very quiet for distant effect
      gain.gain.value = 0.02 + Math.random() * 0.02;
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.3);

      // Random delay for next gunshot
      setTimeout(playGunshot, 3000 + Math.random() * 8000);
    };

    // Start after a delay
    setTimeout(playGunshot, 5000);
  }

  private createAmbientVisuals(): void {
    // Create birds in the sky
    this.createBirds();
  }

  private createBirds(): void {
    const birdsContainer = document.createElement('div');
    birdsContainer.id = 'birds-container';
    birdsContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 30%;
      pointer-events: none;
      z-index: 5;
      overflow: hidden;
    `;
    document.body.appendChild(birdsContainer);

    // Add bird animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flyBird {
        0% { transform: translateX(-50px) translateY(0); }
        25% { transform: translateX(25vw) translateY(-20px); }
        50% { transform: translateX(50vw) translateY(10px); }
        75% { transform: translateX(75vw) translateY(-15px); }
        100% { transform: translateX(110vw) translateY(0); }
      }
      @keyframes flapWings {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(0.3); }
      }
      .bird {
        position: absolute;
        width: 8px;
        height: 3px;
        background: #333;
        border-radius: 50%;
      }
      .bird::before, .bird::after {
        content: '';
        position: absolute;
        width: 10px;
        height: 2px;
        background: #333;
        top: 0;
        animation: flapWings 0.3s ease-in-out infinite;
      }
      .bird::before { left: -8px; transform-origin: right; }
      .bird::after { right: -8px; transform-origin: left; }
    `;
    document.head.appendChild(style);

    // Spawn birds periodically
    const spawnBird = () => {
      const bird = document.createElement('div');
      bird.className = 'bird';
      bird.style.top = `${10 + Math.random() * 15}%`;
      bird.style.animation = `flyBird ${15 + Math.random() * 10}s linear`;
      birdsContainer.appendChild(bird);

      setTimeout(() => bird.remove(), 25000);
      setTimeout(spawnBird, 5000 + Math.random() * 10000);
    };

    // Start spawning after delay
    setTimeout(spawnBird, 3000);
  }

  public playShootSound(): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = 150;

    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  public playHitSound(isHeadshot: boolean = false): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = isHeadshot ? 800 : 500;

    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  public playReloadSound(): void {
    if (!this.audioContext) return;

    // Click sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 200;

    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  public destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
    document.getElementById('birds-container')?.remove();
  }
}
