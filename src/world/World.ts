import { Grid, Position } from './Grid';
import { Citizen, CitizenCategory, BUILDING_RECIPES } from '../entities/Citizen';
import { Resource } from '../entities/Resource';
import { Landmark, LandmarkType } from '../entities/Landmark';
import { Government, GovernmentType, Role } from '../entities/Government';

export interface WorldConfig {
  world: {
    width: number;
    height: number;
    tickRate: number;
  };
  citizens: {
    initialCount: number;
    emojiCategories: Record<CitizenCategory, string[]>;
    movementSpeed: number;
    visionRange: number;
    needsDecayRate: number;
  };
  landmarks: {
    types: Record<string, string>;
    initialCount: number;
  };
  resources: {
    types: string;
    initialCount: number;
    respawnRate: number;
    maxPerType: number;
  };
  rendering: {
    showStats: boolean;
    clearConsole: boolean;
    frameSkip: number;
  };
}

export class World {
  private grid: Grid;
  private citizens: Citizen[];
  private resources: Resource[];
  private landmarks: Landmark[];
  private governments: Government[];
  private config: WorldConfig;
  private tickCount: number;
  private running: boolean;
  private totalBuildings: number;
  private totalBirths: number;

  constructor(config: WorldConfig) {
    this.config = config;
    this.grid = new Grid(config.world.width, config.world.height);
    this.citizens = [];
    this.resources = [];
    this.landmarks = [];
    this.governments = [];
    this.tickCount = 0;
    this.running = false;
    this.totalBuildings = 0;
    this.totalBirths = 0;
  }

  initialize(): void {
    // Create boundaries
    this.createBoundaries();

    // Create landmarks
    this.createLandmarks();

    // Create resources
    this.createResources();

    // Create citizens
    this.createCitizens();
  }

  private createBoundaries(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    // Top and bottom borders
    for (let x = 0; x < width; x++) {
      this.landmarks.push(new Landmark({ x, y: 0 }, 'boundary', '#'));
      this.landmarks.push(new Landmark({ x, y: height - 1 }, 'boundary', '#'));
    }

    // Left and right borders
    for (let y = 1; y < height - 1; y++) {
      this.landmarks.push(new Landmark({ x: 0, y }, 'boundary', '#'));
      this.landmarks.push(new Landmark({ x: width - 1, y }, 'boundary', '#'));
    }
  }

  private createLandmarks(): void {
    const count = this.config.landmarks.initialCount;
    const types: LandmarkType[] = ['home', 'market', 'park'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        const char = this.config.landmarks.types[type] || '⌂';
        this.landmarks.push(new Landmark(pos, type, char));
      }
    }
  }

  private createResources(): void {
    const count = this.config.resources.initialCount;
    const types = this.config.resources.types;

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        this.resources.push(new Resource(pos, type));
      }
    }
  }

  private createCitizens(): void {
    const count = this.config.citizens.initialCount;
    const categories = Object.entries(this.config.citizens.emojiCategories);

    for (let i = 0; i < count; i++) {
      const [category, emojis] = categories[i % categories.length];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const pos = this.getRandomEmptyPosition();
      
      if (pos) {
        const citizen = new Citizen(
          `citizen-${i}`,
          emoji,
          pos,
          category as CitizenCategory,
          this.config.citizens.movementSpeed,
          this.config.citizens.visionRange
        );
        this.citizens.push(citizen);
      }
    }
  }

  private getRandomEmptyPosition(): Position | null {
    const maxAttempts = 100;
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.floor(Math.random() * (width - 2)) + 1;
      const y = Math.floor(Math.random() * (height - 2)) + 1;
      const pos = { x, y };

      // Check if position is already occupied
      const occupied = this.landmarks.some(l => l.position.x === x && l.position.y === y) ||
                       this.resources.some(r => r.position.x === x && r.position.y === y && !r.collected) ||
                       this.citizens.some(c => c.position.x === x && c.position.y === y);

      if (!occupied) {
        return pos;
      }
    }

    return null;
  }

  tick(): void {
    this.tickCount++;

    // Update citizens
    for (const citizen of this.citizens) {
      citizen.update(this.grid, {
        citizens: this.citizens,
        resources: this.resources,
        landmarks: this.landmarks
      }, this.tickCount);

      // Check for resource collection
      const resourcesAtPos = this.resources.filter(
        r => !r.collected && r.position.x === citizen.position.x && r.position.y === citizen.position.y
      );

      for (const resource of resourcesAtPos) {
        citizen.collectResource(resource);
      }

      // Check for completed building
      if (citizen.buildingTarget && !citizen.isBuilding && citizen.buildingProgress === 0) {
        // Citizen just finished building in previous tick
        const recipe = BUILDING_RECIPES[citizen.buildingTarget];
        if (this.canBuildAt(citizen.position.x, citizen.position.y)) {
          this.addLandmark(new Landmark(
            { x: citizen.position.x, y: citizen.position.y },
            citizen.buildingTarget.toLowerCase() as LandmarkType,
            recipe.symbol
          ));
          this.totalBuildings++;
        }
        citizen.buildingTarget = null;
      }

      // Check for breeding opportunity
      if (citizen.state === 'seeking_mate' && citizen.breedingPartner) {
        const partner = citizen.breedingPartner;
        if (citizen.isNearby(partner) && partner.breedingPartner === citizen) {
          // Both want to breed with each other and are nearby
          const offspring = this.createOffspring(citizen, partner);
          if (offspring) {
            this.citizens.push(offspring);
            citizen.breed(partner, this.tickCount);
            this.totalBirths++;
          }
        }
      }
    }

    // Check for government formation near Town Halls
    this.checkGovernmentFormation();

    // Process governments
    this.processGovernments();

    // Respawn resources
    if (Math.random() < this.config.resources.respawnRate) {
      const collected = this.resources.filter(r => r.collected);
      if (collected.length > 0) {
        const resource = collected[Math.floor(Math.random() * collected.length)];
        const newPos = this.getRandomEmptyPosition();
        if (newPos) {
          resource.respawn(newPos);
        }
      }
    }
  }

  getGrid(): Grid {
    return this.grid;
  }

  getCitizens(): Citizen[] {
    return this.citizens;
  }

  getResources(): Resource[] {
    return this.resources;
  }

  getLandmarks(): Landmark[] {
    return this.landmarks;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  isRunning(): boolean {
    return this.running;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  getStats(): {
    tick: number;
    citizens: number;
    resources: number;
    resourcesCollected: number;
    buildings: number;
    births: number;
    growthRate: number;
  } {
    return {
      tick: this.tickCount,
      citizens: this.citizens.length,
      resources: this.resources.filter(r => !r.collected).length,
      resourcesCollected: this.resources.filter(r => r.collected).length,
      buildings: this.totalBuildings,
      births: this.totalBirths,
      growthRate: this.tickCount > 0 ? this.totalBirths / this.tickCount : 0
    };
  }

  canBuildAt(x: number, y: number): boolean {
    const pos = { x, y };
    
    // Check if position is valid
    if (!this.grid.isValidPosition(pos)) return false;
    
    // Check if position is already occupied by a landmark
    const occupied = this.landmarks.some(l => 
      l.position.x === x && l.position.y === y
    );
    
    return !occupied;
  }

  addLandmark(landmark: Landmark): void {
    this.landmarks.push(landmark);
  }

  createOffspring(parent1: Citizen, parent2: Citizen): Citizen | null {
    // Find empty adjacent cell
    const offspringPos = this.findEmptyAdjacentCell(parent1.position);
    if (!offspringPos) return null;
    
    // Choose emoji from one of the parents randomly
    const emoji = Math.random() < 0.5 ? parent1.emoji : parent2.emoji;
    
    // Choose category from parents
    const category = Math.random() < 0.5 ? parent1.category : parent2.category;
    
    // Create offspring
    const offspring = new Citizen(
      `citizen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      emoji,
      offspringPos,
      category,
      this.config.citizens.movementSpeed,
      this.config.citizens.visionRange
    );
    
    // Offspring starts with lower energy and higher needs
    offspring.energy = 50;
    offspring.needs.hunger = 30;
    offspring.needs.energy = 50;
    offspring.needs.social = 40;
    offspring.age = 0;
    
    return offspring;
  }

  findEmptyAdjacentCell(position: Position): Position | null {
    const offsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                    { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
    ];
    
    for (const offset of offsets) {
      const pos = { x: position.x + offset.x, y: position.y + offset.y };
      
      if (!this.grid.isValidPosition(pos)) continue;
      
      // Check if position is already occupied
      const occupied = this.landmarks.some(l => l.position.x === pos.x && l.position.y === pos.y && !l.isWalkable()) ||
                       this.citizens.some(c => c.position.x === pos.x && c.position.y === pos.y);
      
      if (!occupied) {
        return pos;
      }
    }
    
    return null;
  }

  findNearbyMates(citizen: Citizen, range: number): Citizen[] {
    return this.citizens.filter(c => 
      c.id !== citizen.id && 
      Grid.distance(citizen.position, c.position) <= range
    );
  }

  getPopulationCount(): number {
    return this.citizens.length;
  }

  getGovernments(): Government[] {
    return this.governments;
  }

  // Government formation check
  private checkGovernmentFormation(): void {
    const townHalls = this.landmarks.filter(l => l.type === 'town_hall');
    
    for (const townHall of townHalls) {
      // Check if this town hall already has a government
      const existingGov = this.governments.find(g => 
        g.governmentBuildings.some(b => b.position.x === townHall.position.x && b.position.y === townHall.position.y)
      );
      
      if (existingGov) continue;
      
      // Find nearby citizens (within 5 tiles)
      const nearbyCitizens = this.citizens.filter(c => {
        const dist = Grid.distance(c.position, townHall.position);
        return dist <= 5 && c.governmentId === null;
      });
      
      // Need at least 5 citizens to form a government
      if (nearbyCitizens.length >= 5) {
        this.formGovernment(townHall, nearbyCitizens);
      }
    }
  }

  private formGovernment(townHall: Landmark, citizens: Citizen[]): void {
    const govId = `gov_${this.governments.length + 1}`;
    const govName = `Government ${this.governments.length + 1}`;
    
    // Randomly choose government type
    const types = [GovernmentType.DEMOCRACY, GovernmentType.MONARCHY, GovernmentType.COUNCIL];
    const govType = types[Math.floor(Math.random() * types.length)];
    
    const government = new Government(govId, govName, govType, this.tickCount);
    government.addBuilding(townHall);
    
    // Select first 5 citizens to join
    for (let i = 0; i < Math.min(5, citizens.length); i++) {
      const citizen = citizens[i];
      if (i === 0) {
        // First citizen becomes leader
        government.setLeader(citizen);
        citizen.joinGovernment(govId, Role.LEADER);
      } else if (i < 3) {
        // Next two become officials
        government.addOfficial(citizen.id);
        citizen.joinGovernment(govId, Role.OFFICIAL);
      } else {
        // Rest are regular citizens
        government.addCitizen(citizen.id);
        citizen.joinGovernment(govId, Role.CITIZEN);
      }
    }
    
    this.governments.push(government);
  }

  private processGovernments(): void {
    for (const government of this.governments) {
      // Collect taxes every 100 ticks
      if (this.tickCount % 100 === 0) {
        this.collectTaxes(government);
      }
      
      // Update satisfaction based on services
      if (this.tickCount % 50 === 0) {
        this.updateGovernmentSatisfaction(government);
      }
      
      // Recruit new citizens nearby government buildings
      if (this.tickCount % 200 === 0) {
        this.recruitCitizens(government);
      }
    }
  }

  private collectTaxes(government: Government): void {
    for (const citizenId of government.citizens) {
      const citizen = this.citizens.find(c => c.id === citizenId);
      if (!citizen) continue;
      
      const taxes = citizen.payTax(government.taxRate, this.tickCount);
      for (const resource of taxes) {
        government.addToTreasury(resource, 1);
      }
    }
  }

  private updateGovernmentSatisfaction(government: Government): void {
    const treasurySize = government.getTreasuryTotal();
    const citizenCount = government.getCitizenCount();
    
    // More resources per citizen = better satisfaction
    const resourcesPerCitizen = citizenCount > 0 ? treasurySize / citizenCount : 0;
    
    if (resourcesPerCitizen > 5) {
      government.updateSatisfaction(2);
    } else if (resourcesPerCitizen < 1) {
      government.updateSatisfaction(-2);
    }
    
    // Update individual citizen satisfaction
    for (const citizenId of government.citizens) {
      const citizen = this.citizens.find(c => c.id === citizenId);
      if (!citizen) continue;
      
      // Roads provide satisfaction
      const onRoad = this.landmarks.some(l => 
        l.isRoad() && l.position.x === citizen.position.x && l.position.y === citizen.position.y
      );
      
      if (onRoad) {
        citizen.receiveGovernmentService();
      }
      
      // Check for rebellion
      if (citizen.shouldRebel()) {
        citizen.governmentRole = Role.REBEL;
        government.removeCitizen(citizenId);
      }
    }
  }

  private recruitCitizens(government: Government): void {
    // Find independent citizens near government buildings
    for (const building of government.governmentBuildings) {
      const nearbyCitizens = this.citizens.filter(c => {
        const dist = Grid.distance(c.position, building.position);
        return dist <= 3 && c.governmentId === null;
      });
      
      for (const citizen of nearbyCitizens) {
        if (Math.random() < 0.3) { // 30% chance to join
          government.addCitizen(citizen.id);
          citizen.joinGovernment(government.id, Role.CITIZEN);
        }
      }
    }
  }
}
