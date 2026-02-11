# Road Infrastructure and Government Systems

This document describes the road infrastructure and government systems added to EmojiWorld.

## Table of Contents

1. [Road System](#road-system)
2. [Government Buildings](#government-buildings)
3. [Government System](#government-system)
4. [Citizen Interactions](#citizen-interactions)
5. [Technical Implementation](#technical-implementation)

---

## Road System

### Overview
Citizens can now build roads to create transportation networks across the world. Roads provide significant benefits to citizens who use them.

### Road Types

| Type | Symbol | Resources | Build Time | Description |
|------|--------|-----------|------------|-------------|
| Horizontal Road | `=` | R, O, A, D | 3 ticks | Standard horizontal road |
| Vertical Road | `║` | R, O, A, D | 3 ticks | Standard vertical road |
| Intersection | `╬` | R, O, A, D, X | 4 ticks | Where roads cross |

### Road Benefits

1. **Movement Speed**: Citizens move 2x faster on roads
   - Normal movement threshold: `movementSpeed`
   - On road: `movementSpeed / 2` (minimum 0.5)

2. **Energy Efficiency**: 50% less energy consumption
   - Normal energy decay: 0.03 per tick
   - On road: 0.015 per tick

3. **Walkability**: Roads don't block movement - citizens can freely walk across them

### How Roads Are Built

Citizens will randomly decide to build roads with a 70% chance when they choose to build something. The process:

1. Citizen decides to build (5% chance per tick when conditions are right)
2. Selects road type (70% regular buildings including roads, 25% intersection, 5% government)
3. Collects required resources (R, O, A, D, and optionally X)
4. Moves to building location
5. Spends 3-4 ticks building
6. Road appears on the map

---

## Government Buildings

### Overview
Special buildings that enable government formation and provide administrative services.

### Building Types

| Building | Symbol | Resources | Build Time | Capacity | Services |
|----------|--------|-----------|------------|----------|----------|
| Town Hall | 🏛 | G,O,V,T,H,A,L,L | 20 ticks | 10 | Tax collection, law enforcement, public works |
| Courthouse | ⚖ | C,O,U,R,T | 15 ticks | 5 | Dispute resolution, law making |
| Treasury | 💰 | T,R,E,A,S,U,R,Y | 12 ticks | 3 | Resource storage, wealth distribution |
| Police Station | 🚓 | P,O,L,I,C,E | 10 ticks | 5 | Security, order maintenance |
| Public Works | ⚙ | W,O,R,K,S | 8 ticks | 8 | Road maintenance, infrastructure |

### Construction
Government buildings are rare (5% chance when building). They require more resources and take longer to build than regular structures.

---

## Government System

### Government Formation

A government forms automatically when:
- A Town Hall exists
- 5 or more independent citizens are within 5 tiles of the Town Hall
- No government already claims that Town Hall

**Formation Process:**
1. First citizen becomes the **Leader**
2. Next two citizens become **Officials**
3. Remaining citizens become regular **Citizens**
4. Government type is randomly assigned (Democracy, Monarchy, or Council)

### Government Types

| Type | Description | Leadership |
|------|-------------|------------|
| Democracy | Citizens elect leaders | Elected by vote |
| Monarchy | Hereditary rule | Inherited |
| Council | Multiple leaders | Committee |
| Anarchy | No formal government | None |

### Government Properties

- **Treasury**: Collected resources from taxes
- **Tax Rate**: Default 15% (adjustable 0-100%)
- **Satisfaction**: 0-100, citizen happiness (starts at 70)
- **Corruption**: 0-100, affects efficiency (starts at 10)
- **Territory**: Area under government control
- **Citizens**: Set of citizen IDs belonging to government
- **Officials**: Set of official citizen IDs

### Government Operations

#### Tax Collection
- Occurs every 100 ticks
- Government collects `taxRate` percentage of each citizen's inventory
- High taxes (>30%) reduce satisfaction by 2 points
- Collected resources go to government treasury

#### Satisfaction Management
- Updated every 50 ticks
- Factors affecting satisfaction:
  - Resources per citizen ratio
  - Tax rate
  - Access to roads (government services)
  - Individual citizen needs

#### Citizen Recruitment
- Occurs every 200 ticks
- Independent citizens within 3 tiles of government buildings have 30% chance to join
- New members automatically become regular citizens

---

## Citizen Interactions

### Citizen Roles

| Role | Description | Special Abilities |
|------|-------------|-------------------|
| Leader | Head of government | Sets policies, represents government |
| Official | Government administrator | Helps run government operations |
| Citizen | Regular government member | Pays taxes, receives services |
| Rebel | Dissatisfied citizen | Left government, may cause unrest |
| Independent | Not in any government | Free from taxes and benefits |

### Citizen Government Properties

```typescript
governmentId: string | null;        // Which government they belong to
governmentRole: Role;                // Their role in government
taxesPaid: number;                   // Lifetime taxes contributed
satisfaction: number;                // 0-100, happiness with government
loyaltyToGov: number;               // 0-100, affects rebellion chance
lastTaxTime: number;                // Last tick when taxes were paid
```

### Tax Payment
- Happens every 100 ticks per citizen
- Citizens lose `taxRate` percentage of inventory
- Example: 15% tax on 10 items = 1-2 items taken
- High taxes reduce satisfaction and loyalty

### Government Services
- Using roads: +1 satisfaction, +0.5 loyalty
- Low satisfaction (<30): -1 loyalty per tick
- High satisfaction (>70): +0.5 loyalty per tick

### Rebellion
Citizens may rebel when:
- `satisfaction < 20`
- `loyaltyToGov < 20`
- 1% chance per tick when conditions met

When rebelling:
- Role changes to `REBEL`
- Removed from government
- Becomes independent

---

## Technical Implementation

### Key Classes

#### `Government` (src/entities/Government.ts)
Main government data structure with methods for:
- Citizen management (`addCitizen`, `removeCitizen`, `addOfficial`)
- Treasury operations (`addToTreasury`, `removeFromTreasury`)
- Statistics (`getCitizenCount`, `getTreasuryTotal`)
- Policy management (`addPolicy`, `addLaw`)

#### `Citizen` Updates (src/entities/Citizen.ts)
New government-related methods:
- `joinGovernment()`: Join a government with specific role
- `leaveGovernment()`: Become independent
- `payTax()`: Pay taxes to government treasury
- `receiveGovernmentService()`: Increase satisfaction from services
- `shouldRebel()`: Check rebellion conditions

#### `World` Updates (src/world/World.ts)
New government processing:
- `checkGovernmentFormation()`: Detect formation conditions
- `formGovernment()`: Create new government
- `processGovernments()`: Handle all government operations
- `collectTaxes()`: Tax collection system
- `updateGovernmentSatisfaction()`: Satisfaction mechanics
- `recruitCitizens()`: Recruit nearby independents

### Constants

```typescript
// Movement
ROAD_SPEED_BOOST_THRESHOLD = 0.5  // Minimum movement speed on roads

// Government
CITIZEN_RECRUITMENT_PROBABILITY = 0.3  // 30% chance to join nearby gov
REBELLION_CHANCE_PER_TICK = 0.01      // 1% when conditions met
```

### Rendering Updates

The `Renderer` class now displays:
- Road symbols (=, ║, ╬) on the map
- Government building emojis (🏛, ⚖, 💰, 🚓, ⚙)
- Infrastructure statistics panel
- Government statistics panel with:
  - Government name and type
  - Leader emoji
  - Population counts
  - Treasury size
  - Tax rate and satisfaction

---

## Example Simulation

After 2000 ticks, a typical simulation shows:

```
Infrastructure:
  Total Roads: 16
  Horizontal: 6
  Vertical: 1
  Intersections: 9
  Government Buildings: 5

Governments:
  Government 1 (council)
    Leader: 👵
    Citizens: 6
    Officials: 3
    Treasury: 12 resources
    Tax Rate: 15%
    Satisfaction: 36%
    Roads Built: 2
```

The simulation demonstrates:
- Successful government formation
- Active road network
- Functioning tax collection
- Dynamic satisfaction tracking
- Citizen recruitment working

---

## Future Enhancements

Potential additions for the system:

1. **Elections**: Democratic governments hold periodic elections
2. **Policies**: Governments can enact policies affecting citizens
3. **Inter-Government Relations**: Trade, alliances, conflicts
4. **Territory System**: Visual borders, expansion mechanics
5. **Public Projects**: Government-funded infrastructure
6. **Law Enforcement**: Police patrol roads, maintain order
7. **Resource Distribution**: Welfare systems for struggling citizens
8. **Corruption Events**: Officials may steal from treasury

---

## Configuration

Roads and government systems use these world config values:

```json
{
  "citizens": {
    "movementSpeed": 1,  // Affects road speed bonus
    "visionRange": 5      // Affects building discovery
  },
  "resources": {
    "initialCount": 30,   // More resources = more building
    "respawnRate": 0.01   // Affects resource availability
  }
}
```

Adjust these to influence how quickly roads and governments develop.
