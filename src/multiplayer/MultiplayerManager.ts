import Peer, { DataConnection } from 'peerjs';
import * as THREE from 'three';

export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  isShooting: boolean;
  weaponType: string;
}

export interface GameMessage {
  type: 'state' | 'shoot' | 'hit' | 'death' | 'respawn' | 'chat' | 'ready' | 'start' | 'win';
  data: any;
  timestamp: number;
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

  // State sync
  private lastSentState: PlayerState | null = null;
  private sendInterval: number | null = null;
  // Sync rate is 50ms between state updates

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
          this.sendMessage({ type: 'chat', data: { name: this.playerName }, timestamp: Date.now() });
          
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
      this.sendMessage({ type: 'chat', data: { name: this.playerName }, timestamp: Date.now() });

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
    switch (message.type) {
      case 'state':
        if (this.onStateUpdate) {
          this.onStateUpdate(message.data as PlayerState);
        }
        break;
      case 'chat':
        if (message.data.name) {
          this.opponentName = message.data.name;
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
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
    }
  }

  public sendState(state: PlayerState): void {
    if (!this.isConnected || !this.connection) return;

    // Only send if state has changed significantly
    if (this.hasStateChanged(state)) {
      this.sendMessage({
        type: 'state',
        data: state,
        timestamp: Date.now()
      });
      this.lastSentState = { ...state };
    }
  }

  private hasStateChanged(state: PlayerState): boolean {
    if (!this.lastSentState) return true;

    const posChanged = 
      Math.abs(state.position.x - this.lastSentState.position.x) > 0.01 ||
      Math.abs(state.position.y - this.lastSentState.position.y) > 0.01 ||
      Math.abs(state.position.z - this.lastSentState.position.z) > 0.01;

    const rotChanged = 
      Math.abs(state.rotation.y - this.lastSentState.rotation.y) > 0.01;

    const healthChanged = state.health !== this.lastSentState.health;
    const shootingChanged = state.isShooting !== this.lastSentState.isShooting;

    return posChanged || rotChanged || healthChanged || shootingChanged;
  }

  public sendShoot(direction: THREE.Vector3, damage: number): void {
    this.sendMessage({
      type: 'shoot',
      data: { 
        direction: { x: direction.x, y: direction.y, z: direction.z },
        damage 
      },
      timestamp: Date.now()
    });
  }

  public sendHit(damage: number): void {
    this.sendMessage({
      type: 'hit',
      data: { damage },
      timestamp: Date.now()
    });
  }

  public sendDeath(): void {
    this.sendMessage({
      type: 'death',
      data: {},
      timestamp: Date.now()
    });
  }

  public sendRespawn(position: THREE.Vector3): void {
    this.sendMessage({
      type: 'respawn',
      data: { position: { x: position.x, y: position.y, z: position.z } },
      timestamp: Date.now()
    });
  }

  public sendWin(kills: number): void {
    this.sendMessage({
      type: 'win',
      data: { kills },
      timestamp: Date.now()
    });
  }

  public sendReady(): void {
    this.sendMessage({
      type: 'ready',
      data: {},
      timestamp: Date.now()
    });
  }

  public sendStart(): void {
    this.sendMessage({
      type: 'start',
      data: {},
      timestamp: Date.now()
    });
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
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
    }
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
