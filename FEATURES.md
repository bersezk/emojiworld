# EmojiWorld Features

## 🌍 World Simulation

### Dynamic 2D Grid System
- Configurable world dimensions (default 80x24)
- Efficient spatial queries for entity interactions
- Coordinate-based positioning system
- Boundary walls to define play area

### Tick-Based Time System
- Configurable tick rate (50-500ms)
- Synchronized entity updates
- Real-time state management
- Pause/Resume/Reset controls

## 🤖 Autonomous AI Citizens

### Citizen Types
1. **People** (🧑👨👩🧒👴👵)
   - Social and community-oriented
   - Seek social interactions frequently
   - Moderate movement speed

2. **Animals** (🐕🐈🐦🐰🐻🦊)
   - Quick and curious explorers
   - Active wanderers
   - Higher movement speed

3. **Food** (🍎🍌🍕🍔🍞🥕)
   - Playful and energetic
   - Unique behavior patterns
   - Comic relief in simulation

### AI Behavior System

#### State Machine
Citizens operate in 5 distinct states:
1. **Wandering**: Exploring the world randomly
2. **Seeking Resource**: Hunting for food/items
3. **Seeking Shelter**: Looking for rest locations
4. **Resting**: Recovering energy at home
5. **Socializing**: Interacting with other citizens

#### Need Management
Each citizen tracks three vital needs:

**Hunger (0-100)**
- Decays at 0.1 per tick
- Triggers resource seeking below 30
- Restored by collecting resources (+20)

**Energy (0-100)**
- Decays at 0.05 per tick
- Triggers shelter seeking below 20
- Restored at homes (+30)

**Social (0-100)**
- Decays at 0.08 per tick
- Triggers socializing below 30
- Restored near other citizens (+15)

#### Decision Making
Priority system for autonomous choices:
1. Critical Energy (<20) → Seek Home
2. Critical Hunger (<30) → Seek Resources
3. Low Social (<30) → Seek Citizens
4. Otherwise → Wander

### Movement & Navigation
- Simple pathfinding toward targets
- Obstacle avoidance (boundaries)
- Diagonal movement support
- Configurable movement speed (ticks per move)

### Inventory System
- Carry up to 5 items
- Automatic collection on contact
- Resource consumption mechanics

## 🏛️ Landmarks & Buildings

### Landmark Types

**Home (⌂)**
- Purpose: Rest and restore energy
- Capacity: 5 citizens
- Effect: +30 energy when visited

**Market (🏪)**
- Purpose: Resource gathering hub
- Capacity: 5 citizens
- Effect: Social interaction point

**Park (🏞️)**
- Purpose: Social gathering space
- Capacity: 5 citizens
- Effect: Social need restoration

**Boundary (#)**
- Purpose: World border walls
- Capacity: 0 (not enterable)
- Effect: Defines play area limits

### Landmark Features
- Fixed positions throughout simulation
- Multiple occupants (capacity-based)
- Entry/exit tracking
- Visual distinction from other entities

## 📚 Resource System

### Resource Types
- Full alphabet: A-Z (26 uppercase)
- Full alphabet: a-z (26 lowercase)
- Total: 52 distinct resource types

### Resource Mechanics
- **Initial Spawn**: 30 resources at world start
- **Collection**: Automatic when citizen steps on resource
- **Respawn**: 1% chance per tick to respawn collected resources
- **Max per Type**: 50 resources per letter
- **Visual State**: Visible when available, hidden when collected

### Resource Distribution
- Random spawn locations
- Avoid occupied spaces
- Scattered throughout world
- Creates natural gathering patterns

## 🎮 Interactive Controls

### Simulation Controls
- **Start**: Initialize and begin simulation
- **Pause**: Freeze simulation state
- **Reset**: Clear world and restart
- **Speed Control**: Adjust tick rate (50-500ms slider)

### Visual Feedback
- Button state changes (enabled/disabled)
- Loading overlays during operations
- Error notifications for failures
- Stat animations on updates

## 📊 Statistics Dashboard

### Real-Time Metrics
1. **Tick Count**: Total simulation steps
2. **Active Citizens**: Number of emoji agents
3. **Available Resources**: Collectible items in world
4. **Resources Collected**: Total gathered by citizens

### Citizen State Tracking
- Distribution of citizens across states
- Sample citizen detailed view
- Position tracking
- Need levels display
- Inventory contents

## 🎨 Visualization

### Console Renderer (Terminal)
- ASCII/Unicode character display
- Grid-based layout with borders
- Real-time updates
- Statistics panel
- Color-coded entities (if terminal supports)

### Web Renderer (Browser)
- HTML5 Canvas rendering
- 16x16px cell size
- Entity glow effects
- Grid line visualization
- Smooth animations
- Responsive scaling

### Visual Effects
- **Citizens**: White glow (8px radius)
- **Resources**: Green glow (5px radius)
- **Landmarks**: Gray glow (3px radius)
- **Background**: Dark theme with subtle grid
- **Particles**: Floating emoji in background

## ⚙️ Configuration System

### Configurable Parameters

**World Settings**
- Width, height, tick rate

**Citizens Settings**
- Initial count
- Emoji categories
- Movement speed
- Vision range
- Needs decay rate

**Landmarks Settings**
- Types and characters
- Initial count

**Resources Settings**
- Available types
- Initial count
- Respawn rate
- Max per type

**Rendering Settings**
- Show stats
- Clear console
- Frame skip

### Configuration Files
- Default: `src/config/world-config.json`
- Examples: `examples/small-world-config.json`, `examples/large-world-config.json`

## 🚀 Deployment Options

### Local Console Mode
- Run directly in terminal
- No browser required
- Perfect for servers
- Low resource usage

### Local Web Mode
- Serve static files locally
- Browser-based interface
- Development testing

### Vercel Deployment
- Serverless functions
- Automatic scaling
- Global CDN
- Zero configuration
- Free hosting tier

## 🔧 Technical Features

### Architecture
- **Modular Design**: Separated concerns
- **TypeScript**: Type-safe code
- **Efficient Queries**: Grid-based lookups
- **Stateless API**: Session-based worlds
- **Memory Management**: Auto-cleanup old sessions

### Performance
- O(1) entity lookups by position
- Efficient spatial queries
- Optimized rendering
- Configurable tick rate
- Frame skipping support

### Extensibility
- Easy to add new citizen types
- Simple landmark creation
- Configurable resource types
- Pluggable AI behaviors
- Custom renderers

## 🎯 Emergent Behaviors

Watch these patterns emerge naturally:

1. **Resource Clustering**: Citizens gather near resource-rich areas
2. **Social Circles**: Groups form at parks and markets
3. **Migration Patterns**: Movement toward homes when tired
4. **Exploration Waves**: Wandering citizens explore systematically
5. **Supply and Demand**: Resource depletion creates new search patterns

## 📈 Future Potential

### Planned Enhancements
- Citizen reproduction and lifecycle
- More complex AI (learning, memory)
- Weather and seasons
- Day/night cycle
- Trade between citizens
- Building construction
- Territory control
- Citizen communication
- Achievement system
- Save/load functionality

### Advanced Features
- Multi-world simulation
- Citizen relationships
- Skill development
- Economy system
- Disasters and events
- Evolution mechanisms
- Procedural generation
- Multiplayer interaction

---

**EmojiWorld delivers a rich, autonomous simulation with emergent behaviors, beautiful graphics, and endless possibilities for expansion.**
