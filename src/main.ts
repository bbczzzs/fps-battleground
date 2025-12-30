import { Game } from './game/Game';
import { MobileControls } from './utils/MobileControls';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const isMobile = MobileControls.isMobile();
  
  // New landing page
  const landingPage = document.getElementById('landing-page');
  const deployBtn = document.getElementById('deploy-btn');
  
  // Old start screen (fallback)
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  
  // Update button text for mobile
  if (isMobile && deployBtn) {
    deployBtn.innerHTML = '<span><span class="btn-icon">▶</span>TAP TO PLAY</span>';
  }
  
  // New deploy button handler
  deployBtn?.addEventListener('click', () => {
    // Fade out animation
    if (landingPage) {
      landingPage.style.transition = 'opacity 0.5s ease';
      landingPage.style.opacity = '0';
      setTimeout(() => {
        landingPage.remove();
        startScreen?.remove();
        
        // Show game vignette overlay
        const vignette = document.getElementById('game-vignette');
        if (vignette) vignette.style.display = 'block';
        
        // Request fullscreen on mobile for better experience
        if (isMobile) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
        
        game.start();
      }, 500);
    }
  });
  
  // Old start button handler (fallback)
  startBtn?.addEventListener('click', () => {
    startScreen?.remove();
    landingPage?.remove();
    game.start();
  });
});
