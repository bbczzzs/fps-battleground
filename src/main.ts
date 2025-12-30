import { Game } from './game/Game';
import { MobileControls } from './utils/MobileControls';
import { MultiplayerManager } from './multiplayer/MultiplayerManager';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const isMobile = MobileControls.isMobile();
  const multiplayer = new MultiplayerManager();
  
  // New landing page
  const landingPage = document.getElementById('landing-page');
  const deployBtn = document.getElementById('deploy-btn');
  const multiplayerBtn = document.getElementById('multiplayer-btn');
  
  // Old start screen (fallback)
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  
  // Multiplayer lobby elements
  const lobbyEl = document.getElementById('multiplayer-lobby');
  const lobbyClose = document.getElementById('lobby-close');
  const lobbyMenu = document.getElementById('lobby-menu');
  const lobbyWaiting = document.getElementById('lobby-waiting');
  const lobbyReady = document.getElementById('lobby-ready');
  const lobbyJoining = document.getElementById('lobby-joining');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;
  const displayRoomCode = document.getElementById('display-room-code');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const startBattleBtn = document.getElementById('start-battle-btn');
  const yourNameEl = document.getElementById('your-name');
  const opponentNameEl = document.getElementById('opponent-name');
  
  // Update button text for mobile
  if (isMobile && deployBtn) {
    deployBtn.innerHTML = '<span><span class="btn-icon">▶</span>TAP TO PLAY</span>';
  }
  
  // Start game function
  const startGame = (isMultiplayer: boolean = false) => {
    if (landingPage) {
      landingPage.style.transition = 'opacity 0.5s ease';
      landingPage.style.opacity = '0';
      setTimeout(() => {
        landingPage.remove();
        startScreen?.remove();
        
        const vignette = document.getElementById('game-vignette');
        if (vignette) vignette.style.display = 'block';
        
        if (isMobile) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
        
        if (isMultiplayer) {
          game.startMultiplayer(multiplayer);
        } else {
          game.start();
        }
      }, 500);
    }
  };
  
  // Solo mode button
  deployBtn?.addEventListener('click', () => startGame(false));
  
  // Multiplayer button - show lobby
  multiplayerBtn?.addEventListener('click', () => {
    if (lobbyEl) lobbyEl.style.display = 'flex';
  });
  
  // Close lobby
  lobbyClose?.addEventListener('click', () => {
    if (lobbyEl) lobbyEl.style.display = 'none';
    multiplayer.disconnect();
    showLobbySection('menu');
  });
  
  // Helper to show lobby sections
  const showLobbySection = (section: 'menu' | 'waiting' | 'ready' | 'joining') => {
    if (lobbyMenu) lobbyMenu.style.display = section === 'menu' ? 'block' : 'none';
    if (lobbyWaiting) lobbyWaiting.style.display = section === 'waiting' ? 'block' : 'none';
    if (lobbyReady) lobbyReady.style.display = section === 'ready' ? 'block' : 'none';
    if (lobbyJoining) lobbyJoining.style.display = section === 'joining' ? 'block' : 'none';
  };
  
  // Create room
  createRoomBtn?.addEventListener('click', async () => {
    showLobbySection('waiting');
    try {
      const roomCode = await multiplayer.createRoom();
      if (displayRoomCode) displayRoomCode.textContent = roomCode;
      if (yourNameEl) yourNameEl.textContent = multiplayer.getPlayerName();
    } catch (err) {
      console.error('Failed to create room:', err);
      alert('Failed to create room. Please try again.');
      showLobbySection('menu');
    }
  });
  
  // Join room
  joinRoomBtn?.addEventListener('click', async () => {
    const code = roomCodeInput?.value.trim().toUpperCase();
    if (!code || code.length !== 4) {
      alert('Please enter a 4-character room code');
      return;
    }
    
    showLobbySection('joining');
    try {
      await multiplayer.joinRoom(code);
    } catch (err) {
      console.error('Failed to join room:', err);
      alert('Failed to join room. Check the code and try again.');
      showLobbySection('menu');
    }
  });
  
  // Copy room code
  copyCodeBtn?.addEventListener('click', () => {
    const code = displayRoomCode?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      if (copyCodeBtn) copyCodeBtn.textContent = '✓ COPIED';
      setTimeout(() => {
        if (copyCodeBtn) copyCodeBtn.textContent = '📋 COPY';
      }, 2000);
    });
  });
  
  // Multiplayer connection callback
  multiplayer.onConnection((connected, _isHost) => {
    if (connected) {
      showLobbySection('ready');
      if (yourNameEl) yourNameEl.textContent = multiplayer.getPlayerName();
      
      // Wait for opponent name
      setTimeout(() => {
        if (opponentNameEl) opponentNameEl.textContent = multiplayer.getOpponentName();
      }, 500);
    } else {
      alert('Connection lost');
      showLobbySection('menu');
    }
  });
  
  // Start battle button
  startBattleBtn?.addEventListener('click', () => {
    multiplayer.sendStart();
    if (lobbyEl) lobbyEl.style.display = 'none';
    startGame(true);
  });
  
  // Listen for start from other player
  multiplayer.onEvent((event) => {
    if (event.type === 'start') {
      if (lobbyEl) lobbyEl.style.display = 'none';
      startGame(true);
    }
  });
  
  // Old start button handler (fallback)
  startBtn?.addEventListener('click', () => {
    startScreen?.remove();
    landingPage?.remove();
    game.start();
  });
});
