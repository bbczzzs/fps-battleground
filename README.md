# FPS Game

A high-performance 3D first-person shooter game running in the web browser using Three.js, TypeScript, and Vite.

## Features

- 🎮 Smooth first-person camera controls with mouse look
- 🏃 WASD movement with jumping
- 🔫 Shooting mechanics with recoil and muzzle flash
- 👾 AI enemies that chase and attack
- 💥 Collision detection for obstacles and projectiles
- ❤️ Health and ammo HUD
- ⚡ Optimized performance for browser gaming

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Move left |
| D / → | Move right |
| Space | Jump |
| Left Click | Shoot |
| R | Reload |
| ESC | Pause/Release mouse |

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The game will open automatically at `http://localhost:3000`

### Production Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
fps-game/
├── src/
│   ├── main.ts              # Entry point
│   ├── game/
│   │   └── Game.ts          # Main game class
│   ├── entities/
│   │   ├── Player.ts        # Player controller
│   │   ├── Enemy.ts         # Enemy AI
│   │   └── Projectile.ts    # Bullet physics
│   ├── weapons/
│   │   └── Weapon.ts        # Weapon system
│   └── utils/
│       ├── InputManager.ts  # Keyboard/mouse input
│       └── CollisionManager.ts # Collision detection
├── public/                   # Static assets
├── index.html               # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Tech Stack

- **Three.js** - 3D rendering engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server

## License

MIT
