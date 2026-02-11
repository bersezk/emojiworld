# EmojiWorld

An autonomous 2D world simulation featuring emoji AI citizens, symbol-based landmarks, and alphabet resources.

## Overview

EmojiWorld is a console-based and web-based 2D simulation where emoji characters act as autonomous agents with their own needs, behaviors, and decision-making capabilities. Watch as citizens wander, seek resources, socialize, and interact with their environment in real-time!

### 🖥️ Dual Interface Support

- **Console Version**: Terminal-based simulation perfect for servers and CLI enthusiasts
- **Web Version**: Beautiful browser-based interface with:
  - Stunning gradient backgrounds with floating emoji particles
  - Animated stat cards with real-time updates including:
    - Population and resource tracking
    - Building and birth statistics
    - Employment/unemployment rates
    - Police force and detention numbers
  - Glow effects on world entities for enhanced visibility
  - Responsive design that works on mobile and desktop
  - Interactive controls with smooth transitions
  - Welcome screen and loading animations
  - Error notifications for better UX

## Features

### 🤖 Autonomous Emoji Citizens
- **AI-Driven Behavior**: Each emoji citizen has autonomous decision-making based on their needs
- **Need System**: Citizens manage hunger, energy, and social needs
- **Multiple Categories**: People (🧑👨👩🧒), Animals (🐕🐈🐦🐰🐻), and Food (🍎🍌🍕🍔)
- **States**: Wandering, seeking resources, seeking shelter, resting, socializing, and building
- **Inventory System**: Citizens can collect and carry resources (up to 10 items)
- **Breeding System**: Citizens can reproduce when conditions are right

### 🏗️ Building System
- **Citizen-Built Structures**: Citizens collect resources and construct buildings
- **Multiple Building Types**:
  - **Home (⌂)**: Resting places (H+O+M+E resources)
  - **Storage (□)**: Resource storage (S+T+O+R resources)
  - **Meeting (◊)**: Social spaces (M+E+E+T resources)
  - **Farm (⚘)**: Food production (F+A+R+M resources)
  - **Wall (█)**: Barriers and boundaries (W+A+L resources)

### 🛣️ Road Infrastructure
- **Road Network**: Citizens build roads for faster travel
- **Road Types**:
  - **Horizontal Road (=)**: Standard east-west passage
  - **Vertical Road (║)**: Standard north-south passage
  - **Intersection (╬)**: Where roads cross
- **Benefits**:
  - 2x faster movement speed on roads
  - 50% less energy consumption while traveling
  - Citizens prefer to follow existing roads

### 🏛️ Government System
- **Government Formation**: When 5+ citizens gather near a Town Hall, they form a government
- **Government Types**: Democracy, Monarchy, Council, or Anarchy
- **Government Buildings**:
  - **Town Hall (🏛)**: Center of governance (G+O+V+T+H+A+L+L resources)
  - **Courthouse (⚖)**: Law and justice (C+O+U+R+T resources)
  - **Treasury (💰)**: Resource management (T+R+E+A+S+U+R+Y resources)
  - **Police Station (🚓)**: Order and security (P+O+L+I+C+E resources)
  - **Public Works (⚙)**: Infrastructure management (W+O+R+K+S resources)
- **Citizen Roles**: Leader, Official, Citizen, Rebel, or Independent
- **Tax System**: Governments collect resources from citizens (default 15% rate)
- **Satisfaction**: Citizens track happiness with their government
- **Rebellion**: Dissatisfied citizens may rebel and leave government

### 💼 Job System
- **Employment**: Citizens can work various jobs with salaries and schedules
- **Job Types**:
  - **👮 Police Officer**: Patrols areas, detects crimes, arrests criminals
  - **👨‍⚕️ Doctor**: Heals citizens and increases health
  - **🧑‍🌾 Farmer**: Produces food resources at farms
  - **🧑‍💼 Merchant**: Trades resources at markets
  - **🏗️ Builder**: Constructs buildings more efficiently
  - **🧑‍💻 Government Official**: Manages government tasks
- **Work Schedules**: Jobs have specific working hours (e.g., 9am-5pm)
- **Salaries**: Citizens earn resources from their jobs
- **Performance**: Job performance affects satisfaction and earnings

### 🚔 Policing System
- **Law Enforcement**: Police officers actively patrol designated areas
- **Crime Detection**: Police detect crimes within vision range
- **Pursuit**: Officers chase criminals when crimes are detected
- **Arrests**: Police can arrest criminals within range
- **Detention**: Arrested criminals are detained at police stations
- **Release**: Criminals are released after serving time, with partial social credit restoration

### ⚖️ Crime & Social Credit System
- **Social Credit Score**: Each citizen has a score (0-1000, starts at 500)
- **Criminal Status**: Low credit (<200) = criminal, High credit (>800) = model citizen
- **Crime Types**:
  - **💰 Theft**: Stealing resources (-50 credit)
  - **💥 Vandalism**: Destroying buildings (-80 credit)
  - **⚔️ Assault**: Attacking other citizens (-100 credit)
  - **🚫 Trespassing**: Entering restricted areas (-20 credit)
  - **📜 Tax Evasion**: Not paying taxes (-40 credit)
- **Motivation**: Low satisfaction and unemployment increase crime likelihood
- **Consequences**: Criminals avoid police and may be arrested
- **Rehabilitation**: Detention and good behavior slowly restore social credit

### 🕐 Daily Routine System
- **Time-Based Activities**: Citizens follow daily schedules based on time of day
- **Schedule Phases**:
  - **Morning (6am-9am)**: Wake up, eat breakfast, prepare for work
  - **Work Hours (9am-5pm)**: At job location, perform job tasks
  - **Evening (5pm-8pm)**: Return home, socialize, relax
  - **Night (8pm-6am)**: Sleep at home, restore energy
- **Job-Specific Routines**: Different jobs have unique behaviors during work hours
- **Emergency Override**: Critical needs (hunger/energy) take priority over routines

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
- **Statistics Dashboard**: Track population, resources, buildings, employment, and crime statistics in real-time
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

## Known Issues

### Node.js Deprecation Warning

You may see this warning during local development:

```
(node:XXXX) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized...
```

**This is harmless.** The warning comes from Vercel's internal routing system, not the application code. 

To suppress it during local development:

```bash
# Use the dev script (warnings suppressed)
npm run dev

# Or for Vercel local dev
npm run vercel-dev

# Or manually run with the flag
NODE_OPTIONS='--no-deprecation' node dist/main.js
```

The warning does not affect production deployments on Vercel.

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
    - Landmark.ts       # Symbol-based structures and roads
    - Resource.ts       # Alphabet resource items
    - Government.ts     # Government system and management
  /rendering
    - Renderer.ts       # Console-based visualization
  /config
    - world-config.json # Configuration parameters
  - main.ts             # Entry point and simulation runner
```

## Documentation

- **[GOVERNMENT_SYSTEM.md](GOVERNMENT_SYSTEM.md)**: Comprehensive guide to roads and government features
- Covers road mechanics, government buildings, formation, taxation, and more

## How It Works

### Citizen AI Behavior

Each citizen operates on a priority system:

1. **Energy Critical (<20)**: Seek nearest home to rest
2. **Hunger Critical (<30)**: Seek nearest resource to collect
3. **Breeding Ready**: Seek mate if conditions are right (age>100, energy>60)
4. **Building Ready**: Collect resources and construct buildings (random 5% chance)
5. **Social Need (<30)**: Seek nearest other citizen to socialize
6. **Otherwise**: Wander randomly around the world

### Building System

Citizens autonomously collect resources and build structures:
- When ready to build, citizens select a random building type
- They collect the required letter resources (e.g., H+O+M+E for a home)
- Once resources are gathered, they spend build time constructing
- Buildings appear on the map with their unique symbols
- Roads (70% of buildings) provide speed and energy bonuses
- Government buildings (5% chance) enable government formation

### Government System

Governments form organically when conditions are met:
- A Town Hall must be built by citizens
- 5 or more independent citizens gather nearby (within 5 tiles)
- Government automatically forms with randomly assigned type
- First citizen becomes Leader, next two become Officials
- Governments collect taxes every 100 ticks
- Citizen satisfaction affects loyalty and potential rebellion
- Multiple governments can coexist and recruit citizens

### Road Benefits

Roads transform citizen movement:
- **Speed**: Citizens move 2x faster on roads (half the normal time)
- **Efficiency**: 50% reduced energy consumption while on roads
- **Network**: Roads connect buildings and create efficient pathways
- **Walkable**: Roads don't block movement - citizens walk across them

### Movement System

- Citizens use simple pathfinding to reach their targets
- Movement considers obstacles (boundaries)
- Citizens move one grid space per tick (configurable)

### Resource System

- Resources spawn randomly at world initialization
- Citizens automatically collect resources when walking over them
- Collected resources go into citizen inventory (10 item capacity)
- Resources are used for building structures
- Collected resources can respawn at new locations
- Governments collect resources through taxation

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
- **Building Clusters**: Citizens build near existing structures, creating towns
- **Road Networks**: Roads naturally connect important buildings
- **Government Formation**: Communities form around Town Halls
- **Tax Collection**: Governments accumulate resources from citizens
- **Satisfaction Cycles**: Happy citizens stay loyal; unhappy ones may rebel

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
- 👶 Advanced lifecycle with aging and natural death
- 🧠 More complex AI behaviors (learning, memory)
- 🌐 Enhanced web-based interactive visualization
- 🔊 Sound effects for actions
- 📊 Advanced statistics and analytics dashboard
- 🎨 Color-coded citizen states and territories
- 💬 Citizen communication system
- 🗳️ Elections in democratic governments
- 🤝 Inter-government trade and alliances
- 🗺️ Territory expansion and border conflicts
- 🛣️ Smart road pathfinding and optimization

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