import { Game } from './game/Game';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  
  // New landing page
  const landingPage = document.getElementById('landing-page');
  const deployBtn = document.getElementById('deploy-btn');
  
  // Old start screen (fallback)
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  
  // New deploy button handler
  deployBtn?.addEventListener('click', () => {
    // Fade out animation
    if (landingPage) {
      landingPage.style.transition = 'opacity 0.5s ease';
      landingPage.style.opacity = '0';
      setTimeout(() => {
        landingPage.remove();
        startScreen?.remove();
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
