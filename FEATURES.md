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
5. **Buildings Built**: Total structures constructed by citizens
6. **Total Births**: Number of new citizens born through reproduction
7. **Growth Rate**: Births per tick ratio
8. **Employed Citizens**: Number of citizens with active jobs
9. **Unemployed Citizens**: Number of citizens without jobs
10. **Police Officers**: Number of active law enforcement officers
11. **Prisoners**: Number of detained/imprisoned citizens

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

**Job System Settings**
- Enable/disable job system
- Initial police officers count
- Initial farmers count
- Initial merchants count
- Salary payment interval

**Crime System Settings**
- Enable/disable crime system
- Crime check interval
- Theft probabilities (unemployed vs low satisfaction)
- Vandalism probability
- Assault probability
- Trespassing probability
- Social credit starting value
- Criminal threshold
- Model citizen threshold

**Police System Settings**
- Enable/disable police system
- Detection range
- Arrest range
- Patrol change interval
- Pursuit speed

**Routine System Settings**
- Enable/disable routine system
- Ticks per hour
- Morning start hour
- Work start hour
- Work end hour
- Evening end hour
- Night end hour

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
6. **Crime Waves**: Unemployment and dissatisfaction lead to crime spikes
7. **Police Response**: Officers patrol and respond to criminal activity
8. **Economic Cycles**: Jobs create wealth, crime creates enforcement needs
9. **Daily Rhythms**: Citizens follow work-sleep cycles based on time of day
10. **Social Credit Dynamics**: Behavior affects status and opportunities

## 💼 Job System Details

### Job Types and Characteristics

**👮 Police Officer**
- Salary: 15 resources per payment cycle
- Schedule: 9am-5pm, 7 days/week
- Behavior: Patrols designated routes, detects and pursues criminals
- Workplace: Police Station
- Special: Can arrest criminals within 1 tile range

**👨‍⚕️ Doctor**
- Salary: 20 resources per payment cycle
- Schedule: 8am-6pm, 7 days/week
- Behavior: Stays at hospital, heals nearby citizens
- Workplace: Town Hall (serves as hospital)
- Special: Increases health of nearby citizens

**🧑‍🌾 Farmer**
- Salary: 10 resources per payment cycle
- Schedule: 6am-2pm, 7 days/week
- Behavior: Works at farm, produces food resources
- Workplace: Farm
- Special: Generates resources while working

**🧑‍💼 Merchant**
- Salary: 12 resources per payment cycle
- Schedule: 9am-5pm, 7 days/week
- Behavior: Stays at market, facilitates trade
- Workplace: Market
- Special: Enables resource trading

**🏗️ Builder**
- Salary: 14 resources per payment cycle
- Schedule: 7am-4pm, 7 days/week
- Behavior: Seeks building projects, constructs faster
- Workplace: Public Works or construction sites
- Special: Faster building speed

**🧑‍💻 Government Official**
- Salary: 18 resources per payment cycle
- Schedule: 9am-5pm, 5 days/week (weekdays)
- Behavior: Manages government tasks at government buildings
- Workplace: Any government building
- Special: Boosts government efficiency

### Job Performance System
- **Initial Performance**: 70/100 (average)
- **Performance Effects**: 
  - Affects actual salary (50% to 150% of base)
  - Influences citizen satisfaction
  - Changes slowly based on work quality
- **Performance Factors**:
  - Time spent at work
  - Successful task completion
  - Random events (good and bad days)

## ⚖️ Crime System Details

### Social Credit Mechanics

**Credit Scale**: 0-1000 points
- **0-199**: Criminal (high risk)
- **200-399**: Low credit (watched closely)
- **400-600**: Normal credit (neutral)
- **601-800**: Good credit (trusted)
- **801-1000**: Model citizen (benefits)

**Credit Changes**:
- Start at 500 (neutral)
- Good behavior: +1 per 100 ticks when satisfied
- Model citizens: +1 satisfaction bonus per 100 ticks
- Crimes: -20 to -100 depending on severity
- Arrest: Additional -30 penalty
- Detention: +0.5 per 100 ticks (rehabilitation)

### Crime Triggering

**Theft (💰)**
- Probability: 2% if unemployed, 1% if low satisfaction
- Requirements: Nearby uncollected resources
- Penalty: -50 social credit
- Detention: 100 ticks

**Vandalism (💥)**
- Probability: 0.5% when satisfaction < 20
- Requirements: Nearby buildings
- Penalty: -80 social credit
- Detention: 150 ticks

**Assault (⚔️)**
- Probability: 0.3% when satisfaction < 15
- Requirements: Nearby citizens
- Penalty: -100 social credit
- Detention: 200 ticks
- Effect: Victim loses 10 satisfaction

**Trespassing (🚫)**
- Probability: 1% with low credit
- Requirements: At government building, not a member
- Penalty: -20 social credit
- Detention: 50 ticks

**Tax Evasion (📜)**
- Automatic: When citizen refuses to pay taxes
- Penalty: -40 social credit
- Detention: 80 ticks

### Criminal Behavior

**When citizen becomes criminal (credit < 200)**:
- Actively avoids police officers
- May flee when police approach
- Higher chance of committing more crimes
- Cannot work certain jobs
- Reduced satisfaction

**Police Detection**:
- Police detect crimes within 8 tiles
- Detection marks crime as "detected"
- Police pursue nearest detected criminal
- Pursuit speed: faster than normal movement

**Arrest Process**:
1. Police officer within 1 tile of criminal
2. Arrest occurs automatically
3. Criminal enters "detained" state
4. Criminal teleported to police station
5. Detention timer starts
6. Additional social credit penalty (-30)

**Release Process**:
1. Detention timer expires
2. Criminal status: depends on social credit
3. Small credit restoration (+10)
4. Released to wander
5. May rehabilitate with good behavior

## 🕐 Routine System Details

### Time Mechanics

**Time Scale**:
- 1 tick ≈ 1 minute of simulation time
- 60 ticks = 1 hour
- 1440 ticks = 1 full day cycle

**Time Periods**:
- **Night (8pm-6am)**: Sleep at home, restore energy
- **Morning (6am-9am)**: Wake up, breakfast, prepare
- **Work (9am-5pm)**: At job location, working
- **Evening (5pm-8pm)**: Return home, socialize, relax

### Daily Schedule Examples

**Employed Citizen (Farmer)**:
- 6:00am - Wake up at home
- 6:30am - Seek food (breakfast)
- 7:00am - Commute to farm
- 7:00am-2:00pm - Work at farm
- 2:00pm - Commute home
- 3:00pm - Socialize at park
- 5:00pm - Dinner at home
- 8:00pm - Sleep

**Unemployed Citizen**:
- 6:00am - Wake up
- 8:00am - Wander/seek resources
- 12:00pm - Socialize if needs allow
- 3:00pm - More wandering
- 8:00pm - Return home to sleep

**Police Officer**:
- 6:00am - Wake up at home
- 8:00am - Breakfast
- 9:00am - Report to police station
- 9:00am-5:00pm - Patrol routes, respond to crimes
- 5:00pm - Off duty, return home
- 6:00pm - Evening activities
- 8:00pm - Sleep

### Emergency Overrides

Routines can be interrupted by:
- **Low Hunger (<20)**: Immediately seek food
- **Low Energy (<20)**: Immediately seek shelter
- **Crime Detection** (police): Pursue criminal
- **Being Criminal**: Flee from police
- **Detention**: Stay in cell

## 🚔 Policing System Details

### Patrol Mechanics

**Patrol Routes**:
- Circular pattern around police station
- Radius: 10 tiles
- 8 waypoints around center
- Changes every 50 ticks

**Officer Behavior**:
1. **On Patrol** (no crimes):
   - Follow patrol route
   - Check for crimes within detection range
   - State: "working"

2. **Crime Detected**:
   - Identify nearest criminal
   - Set as target
   - Begin pursuit
   - State: "commuting" (pursuing)

3. **In Pursuit**:
   - Move toward criminal
   - Criminal flees in opposite direction
   - Arrest if within 1 tile
   - Give up if distance > 16 tiles

4. **After Arrest**:
   - Return to patrol route
   - Look for next criminal
   - Resume normal patrol

### Police Station Requirements

- Must have at least one Police Station built
- Officers use nearest station as base
- Patrol routes centered on station
- Can have multiple officers per station

## 📊 Configuration Options

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
