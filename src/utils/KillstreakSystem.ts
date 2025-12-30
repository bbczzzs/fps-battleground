export class KillstreakSystem {
  private killStreak = 0;
  private totalKills = 0;
  private comboTimer = 0;
  private comboTimeout = 3.0; // seconds
  private maxCombo = 0;
  private lastKillTime = 0;
  private streakNotification: HTMLDivElement | null = null;
  private comboDisplay: HTMLDivElement | null = null;

  // Killstreak rewards
  private readonly STREAK_REWARDS = {
    3: { name: 'Triple Kill!', color: '#ffaa00' },
    5: { name: 'Killing Spree!', color: '#ff6600' },
    10: { name: 'Rampage!', color: '#ff3300' },
    15: { name: 'Dominating!', color: '#ff0000' },
    20: { name: 'Unstoppable!', color: '#ff00ff' },
    25: { name: 'Godlike!', color: '#00ffff' }
  };

  constructor() {
    this.createUI();
  }

  private createUI(): void {
    // Streak notification
    this.streakNotification = document.createElement('div');
    this.streakNotification.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-size: 48px;
      font-weight: bold;
      color: white;
      text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.6);
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
      font-family: 'Impact', sans-serif;
    `;
    document.body.appendChild(this.streakNotification);

    // Combo display
    this.comboDisplay = document.createElement('div');
    this.comboDisplay.style.cssText = `
      position: fixed;
      top: 50%;
      right: 30px;
      transform: translateY(-50%);
      font-size: 36px;
      font-weight: bold;
      color: #ffaa00;
      text-shadow: 0 0 10px rgba(255, 170, 0, 0.8);
      pointer-events: none;
      z-index: 999;
      opacity: 0;
      font-family: 'Arial Black', sans-serif;
    `;
    document.body.appendChild(this.comboDisplay);
  }

  public registerKill(): void {
    const now = performance.now() / 1000;
    this.totalKills++;
    
    // Check if within combo timeout
    if (now - this.lastKillTime <= this.comboTimeout) {
      this.killStreak++;
      this.comboTimer = this.comboTimeout;
    } else {
      this.killStreak = 1;
      this.comboTimer = this.comboTimeout;
    }

    this.lastKillTime = now;
    this.maxCombo = Math.max(this.maxCombo, this.killStreak);

    // Show combo
    this.showCombo();

    // Check for killstreak rewards
    this.checkStreakReward();
  }

  private showCombo(): void {
    if (!this.comboDisplay) return;

    if (this.killStreak > 1) {
      this.comboDisplay.textContent = `x${this.killStreak} COMBO!`;
      this.comboDisplay.style.opacity = '1';
      this.comboDisplay.style.transform = 'translateY(-50%) scale(1.2)';
      
      setTimeout(() => {
        if (this.comboDisplay) {
          this.comboDisplay.style.transform = 'translateY(-50%) scale(1)';
        }
      }, 100);
    }
  }

  private checkStreakReward(): void {
    const reward = this.STREAK_REWARDS[this.killStreak as keyof typeof this.STREAK_REWARDS];
    
    if (reward && this.streakNotification) {
      this.streakNotification.textContent = reward.name;
      this.streakNotification.style.color = reward.color;
      this.streakNotification.style.textShadow = `
        0 0 10px ${reward.color},
        0 0 20px ${reward.color},
        0 0 30px ${reward.color}
      `;
      
      // Animate in
      this.streakNotification.style.opacity = '1';
      this.streakNotification.style.transform = 'translate(-50%, -50%) scale(1.2)';
      
      // Play sound effect (if audio system exists)
      this.playStreakSound(this.killStreak);
      
      // Animate out
      setTimeout(() => {
        if (this.streakNotification) {
          this.streakNotification.style.opacity = '0';
          this.streakNotification.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }
      }, 2000);
    }
  }

  private playStreakSound(streak: number): void {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Higher pitch for higher streaks
      oscillator.frequency.value = 400 + (streak * 20);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      // Audio not supported, silently fail
    }
  }

  public update(delta: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      
      if (this.comboTimer <= 0) {
        this.resetStreak();
      }
    }

    // Update combo display opacity based on timer
    if (this.comboDisplay) {
      const comboProgress = this.comboTimer / this.comboTimeout;
      if (comboProgress > 0 && this.killStreak > 1) {
        this.comboDisplay.style.opacity = Math.min(1, comboProgress * 2).toString();
        
        // Flash when timer is low
        if (comboProgress < 0.3) {
          const flash = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
          this.comboDisplay.style.color = `rgb(255, ${Math.floor(flash * 170)}, 0)`;
        }
      } else {
        this.comboDisplay.style.opacity = '0';
      }
    }
  }

  private resetStreak(): void {
    this.killStreak = 0;
    if (this.comboDisplay) {
      this.comboDisplay.style.opacity = '0';
    }
  }

  public getKillStreak(): number {
    return this.killStreak;
  }

  public getTotalKills(): number {
    return this.totalKills;
  }

  public getMaxCombo(): number {
    return this.maxCombo;
  }

  public getComboMultiplier(): number {
    // Damage multiplier based on combo
    return 1 + (this.killStreak * 0.1); // +10% damage per kill in streak
  }

  public getScoreMultiplier(): number {
    // Score multiplier based on combo
    return Math.max(1, this.killStreak * 0.5);
  }

  public reset(): void {
    this.killStreak = 0;
    this.totalKills = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.lastKillTime = 0;
  }

  public destroy(): void {
    if (this.streakNotification?.parentElement) {
      this.streakNotification.parentElement.removeChild(this.streakNotification);
    }
    if (this.comboDisplay?.parentElement) {
      this.comboDisplay.parentElement.removeChild(this.comboDisplay);
    }
  }
}
