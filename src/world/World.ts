import { Grid, Position } from './Grid';
import { Citizen, CitizenCategory } from '../entities/Citizen';
import { Resource } from '../entities/Resource';
import { Landmark, LandmarkType } from '../entities/Landmark';

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
        const recipe = require('../entities/Citizen').BUILDING_RECIPES[citizen.buildingTarget];
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
}
