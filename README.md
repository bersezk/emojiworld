# EmojiWorld

An autonomous 2D world simulation featuring emoji AI citizens, symbol-based landmarks, and alphabet resources.

## Overview

EmojiWorld is a console-based and web-based 2D simulation where emoji characters act as autonomous agents with their own needs, behaviors, and decision-making capabilities. Watch as citizens wander, seek resources, socialize, and interact with their environment in real-time!

### 🖥️ Dual Interface Support

- **Console Version**: Terminal-based simulation perfect for servers and CLI enthusiasts
- **Web Version**: Beautiful browser-based interface with real-time visualization and interactive controls

## Features

### 🤖 Autonomous Emoji Citizens
- **AI-Driven Behavior**: Each emoji citizen has autonomous decision-making based on their needs
- **Need System**: Citizens manage hunger, energy, and social needs
- **Multiple Categories**: People (🧑👨👩🧒), Animals (🐕🐈🐦🐰🐻), and Food (🍎🍌🍕🍔)
- **States**: Wandering, seeking resources, seeking shelter, resting, and socializing
- **Inventory System**: Citizens can collect and carry resources

### 🏛️ Symbol-Based Landmarks
- **Home (⌂)**: Resting places where citizens restore energy
- **Market (🏪)**: Gathering points for resources
- **Park (🏞️)**: Social interaction spaces
- **Boundaries (#)**: World borders that define the play area

### 📚 Alphabet Resources
- **A-Z, a-z**: All letters of the alphabet scattered as collectible resources
- **Resource Management**: Resources can be collected, consumed, and respawn over time
- **Strategic Value**: Citizens seek resources when hungry

### 🎮 Real-Time Simulation
- **Live Updates**: World ticks at configurable intervals (default 200ms)
- **Statistics Dashboard**: Track population, resources, and citizen states
- **Sample Citizen View**: Detailed view of a single citizen's status

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/bersezk/emojiworld.git
cd emojiworld
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Running Locally

#### Console Version

Start the console-based simulation:
```bash
npm start
```

Stop the simulation:
- Press `Ctrl+C` to gracefully stop and view final statistics

#### Web Version (Local Development)

You can also run the web version locally using a simple HTTP server:

```bash
npm run build
npx serve public
```

Then open your browser to `http://localhost:3000`

### Deploying to Vercel

The application is configured for easy deployment to Vercel:

1. Install Vercel CLI (if not already installed):
```bash
npm install -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

Or simply push to GitHub and connect your repository to Vercel:
- Go to [Vercel](https://vercel.com)
- Import your GitHub repository
- Vercel will automatically detect the configuration and deploy

The web interface will be available at your Vercel URL (e.g., `https://emojiworld.vercel.app`)

### Quick Development Run

For faster iteration during development:
```bash
npm run dev
```

## Configuration

The simulation is highly configurable through `src/config/world-config.json`:

### World Settings
```json
{
  "world": {
    "width": 80,        // Grid width (characters)
    "height": 24,       // Grid height (characters)
    "tickRate": 200     // Update interval in milliseconds
  }
}
```

### Citizens Settings
```json
{
  "citizens": {
    "initialCount": 10,              // Number of starting citizens
    "emojiCategories": {
      "people": ["🧑", "👨", "👩"],  // Available people emojis
      "animals": ["🐕", "🐈", "🐦"], // Available animal emojis
      "food": ["🍎", "🍌", "🍕"]     // Available food emojis
    },
    "movementSpeed": 1,              // Ticks per movement
    "visionRange": 5,                // Detection range for entities
    "needsDecayRate": 0.1            // How fast needs decrease
  }
}
```

### Landmarks Settings
```json
{
  "landmarks": {
    "types": {
      "home": "⌂",
      "market": "🏪",
      "park": "🏞️",
      "boundary": "#"
    },
    "initialCount": 8                // Number of landmarks (excluding boundaries)
  }
}
```

### Resources Settings
```json
{
  "resources": {
    "types": "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    "initialCount": 30,              // Starting number of resources
    "respawnRate": 0.01,             // Probability of respawn per tick
    "maxPerType": 50                 // Maximum resources per letter
  }
}
```

### Rendering Settings
```json
{
  "rendering": {
    "showStats": true,               // Display statistics panel
    "clearConsole": true,            // Clear console each frame
    "frameSkip": 1                   // Render every N ticks
  }
}
```

## Architecture

The project follows a modular architecture:

```
/src
  /world
    - World.ts          # Main world container and simulation loop
    - Grid.ts           # 2D grid system with spatial queries
  /entities
    - Citizen.ts        # Emoji AI agents with behavior system
    - Landmark.ts       # Symbol-based structures
    - Resource.ts       # Alphabet resource items
  /rendering
    - Renderer.ts       # Console-based visualization
  /config
    - world-config.json # Configuration parameters
  - main.ts             # Entry point and simulation runner
```

## How It Works

### Citizen AI Behavior

Each citizen operates on a simple priority system:

1. **Energy Critical (<20)**: Seek nearest home to rest
2. **Hunger Critical (<30)**: Seek nearest resource to collect
3. **Social Need (<30)**: Seek nearest other citizen to socialize
4. **Otherwise**: Wander randomly around the world

### Movement System

- Citizens use simple pathfinding to reach their targets
- Movement considers obstacles (boundaries)
- Citizens move one grid space per tick (configurable)

### Resource System

- Resources spawn randomly at world initialization
- Citizens automatically collect resources when walking over them
- Collected resources can respawn at new locations
- Each citizen has limited inventory capacity (5 items)

### Need Decay

All citizen needs decay over time:
- Hunger: -0.1 per tick
- Energy: -0.05 per tick
- Social: -0.08 per tick

## Examples

### Customizing World Size

Edit `src/config/world-config.json`:
```json
{
  "world": {
    "width": 120,    // Wider world
    "height": 40,    // Taller world
    "tickRate": 100  // Faster updates
  }
}
```

### Adding More Citizens

```json
{
  "citizens": {
    "initialCount": 50,  // More crowded world
    "emojiCategories": {
      "people": ["🧑", "👨", "👩", "🧒", "👴", "👵", "👶"],
      "animals": ["🐕", "🐈", "🐦", "🐰", "🐻", "🦊", "🐼", "🦁"],
      "food": ["🍎", "🍌", "🍕", "🍔", "🍞", "🥕", "🥗", "🍇"]
    }
  }
}
```

### Slower, More Contemplative World

```json
{
  "world": {
    "tickRate": 500  // Half-second updates
  },
  "citizens": {
    "movementSpeed": 2,      // Move every 2 ticks
    "needsDecayRate": 0.05   // Needs decay slower
  }
}
```

## Observed Behaviors

As the simulation runs, you'll notice emergent behaviors:

- **Resource Clustering**: Citizens tend to gather near resource-rich areas
- **Social Circles**: Citizens with low social needs gravitate toward each other
- **Home-seeking**: As energy depletes, citizens migrate toward homes
- **Wandering Patterns**: Content citizens explore the world randomly

## Technical Details

### Built With
- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment
- **Console/Terminal**: Rendering platform

### Performance
- Optimized grid-based spatial queries
- Efficient entity updates
- Configurable tick rate for performance tuning

## Development

### Building
```bash
npm run build
```

### Project Structure
```
emojiworld/
├── src/              # TypeScript source files
├── dist/             # Compiled JavaScript (generated)
├── node_modules/     # Dependencies (generated)
├── package.json      # Project configuration
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Future Enhancements

Potential additions for the simulation:
- 🔄 Save/load world state
- 🌍 Different biomes or zones with unique properties
- 👶 Citizen reproduction and lifecycle
- 🧠 More complex AI behaviors (learning, memory)
- 🌐 Web-based interactive visualization
- 🔊 Sound effects for actions
- 📊 Advanced statistics and analytics dashboard
- 🎨 Color-coded citizen states
- 💬 Citizen communication system

## License

ISC

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## Acknowledgments

Inspired by artificial life simulations and autonomous agent systems.

---

**Enjoy exploring the autonomous world of emojis! 🌍✨**