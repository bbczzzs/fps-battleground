import Peer, { DataConnection } from 'peerjs';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  r: number; // yaw rotation only
  h: number; // health
  s: number; // shooting (0 or 1)
}

export interface GameMessage {
  t: string; // type (shortened)
  d: any; // data
}

export type ConnectionCallback = (connected: boolean, isHost: boolean) => void;
export type StateCallback = (state: PlayerState) => void;
export type EventCallback = (event: GameMessage) => void;

export class MultiplayerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private roomCode: string = '';
  private isHost = false;
  private isConnected = false;
  private playerName: string = 'Player';
  private opponentName: string = 'Opponent';
  
  // Callbacks
  private onConnectionChange: ConnectionCallback | null = null;
  private onStateUpdate: StateCallback | null = null;
  private onGameEvent: EventCallback | null = null;

  // State sync - optimized
  private lastSentState: PlayerState | null = null;
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private lastR = 0;

  constructor() {
    // Generate player name
    this.playerName = 'Player_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  public async createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Generate a room code
      this.roomCode = this.generateRoomCode();
      this.isHost = true;

      // Create peer with room code as ID
      this.peer = new Peer('fps-battle-' + this.roomCode, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        console.log('Room created with ID:', id);
        this.setupHostListeners();
        resolve(this.roomCode);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Room code already taken, generate new one
          this.roomCode = this.generateRoomCode();
          this.peer?.destroy();
          this.createRoom().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  public async joinRoom(roomCode: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode.toUpperCase();
      this.isHost = false;

      // Create peer with random ID
      this.peer = new Peer({
        debug: 1
      });

      this.peer.on('open', () => {
        // Connect to host
        this.connection = this.peer!.connect('fps-battle-' + this.roomCode, {
          reliable: true
        });

        this.connection.on('open', () => {
          console.log('Connected to room:', this.roomCode);
          this.isConnected = true;
          this.setupConnectionListeners();
          this.startStateSync();
          
          // Send player name
          this.sendMessage({ t: 'chat', d: { name: this.playerName } });
          
          if (this.onConnectionChange) {
            this.onConnectionChange(true, false);
          }
          resolve(true);
        });

        this.connection.on('error', (err) => {
          console.error('Connection error:', err);
          reject(err);
        });

        // Timeout if connection takes too long
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout - room may not exist'));
          }
        }, 10000);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        reject(err);
      });
    });
  }

  private setupHostListeners(): void {
    if (!this.peer) return;

    this.peer.on('connection', (conn) => {
      console.log('Player connected!');
      this.connection = conn;
      this.isConnected = true;

      this.setupConnectionListeners();
      this.startStateSync();

      // Send player name
      this.sendMessage({ t: 'chat', d: { name: this.playerName } });

      if (this.onConnectionChange) {
        this.onConnectionChange(true, true);
      }
    });
  }

  private setupConnectionListeners(): void {
    if (!this.connection) return;

    this.connection.on('data', (data: any) => {
      this.handleMessage(data as GameMessage);
    });

    this.connection.on('close', () => {
      console.log('Connection closed');
      this.isConnected = false;
      if (this.onConnectionChange) {
        this.onConnectionChange(false, this.isHost);
      }
    });

    this.connection.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  private handleMessage(message: GameMessage): void {
    switch (message.t) {
      case 's': // state
        if (this.onStateUpdate) {
          this.onStateUpdate(message.d as PlayerState);
        }
        break;
      case 'c': // chat
        if (message.d.name) {
          this.opponentName = message.d.name;
        }
        break;
      default:
        if (this.onGameEvent) {
          this.onGameEvent(message);
        }
        break;
    }
  }

  private startStateSync(): void {
    // No interval needed - we send on demand
  }

  public sendState(state: PlayerState): void {
    if (!this.isConnected || !this.connection) return;

    // Only send if state has changed significantly
    if (this.hasStateChanged(state)) {
      this.sendMessage({
        t: 's',
        d: state
      });
      this.lastSentState = { ...state };
      this.lastX = state.x;
      this.lastY = state.y;
      this.lastZ = state.z;
      this.lastR = state.r;
    }
  }

  private hasStateChanged(state: PlayerState): boolean {
    // Use threshold-based change detection
    const posThreshold = 0.05;
    const rotThreshold = 0.02;
    
    const posChanged = 
      Math.abs(state.x - this.lastX) > posThreshold ||
      Math.abs(state.y - this.lastY) > posThreshold ||
      Math.abs(state.z - this.lastZ) > posThreshold;

    const rotChanged = Math.abs(state.r - this.lastR) > rotThreshold;
    
    const healthChanged = !this.lastSentState || state.h !== this.lastSentState.h;
    const shootingChanged = !this.lastSentState || state.s !== this.lastSentState.s;

    return posChanged || rotChanged || healthChanged || shootingChanged;
  }

  public sendHit(damage: number): void {
    this.sendMessage({ t: 'hit', d: { damage } });
  }

  public sendDeath(): void {
    this.sendMessage({ t: 'death', d: {} });
  }

  public sendRespawn(x: number, y: number, z: number): void {
    this.sendMessage({ t: 'respawn', d: { x, y, z } });
  }

  public sendWin(kills: number): void {
    this.sendMessage({ t: 'win', d: { kills } });
  }

  public sendReady(): void {
    this.sendMessage({ t: 'ready', d: {} });
  }

  public sendStart(): void {
    this.sendMessage({ t: 'start', d: {} });
  }

  private sendMessage(message: GameMessage): void {
    if (this.connection && this.connection.open) {
      this.connection.send(message);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Setters for callbacks
  public onConnection(callback: ConnectionCallback): void {
    this.onConnectionChange = callback;
  }

  public onState(callback: StateCallback): void {
    this.onStateUpdate = callback;
  }

  public onEvent(callback: EventCallback): void {
    this.onGameEvent = callback;
  }

  // Getters
  public getRoomCode(): string {
    return this.roomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getPlayerName(): string {
    return this.playerName;
  }

  public getOpponentName(): string {
    return this.opponentName;
  }

  public setPlayerName(name: string): void {
    this.playerName = name;
  }

  public disconnect(): void {
    if (this.connection) {
      this.connection.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    this.isConnected = false;
    this.connection = null;
    this.peer = null;
  }
}
