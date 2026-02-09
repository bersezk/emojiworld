import { Position, Grid } from '../world/Grid';
import { Resource } from './Resource';
import { Landmark } from './Landmark';
import { Role } from './Government';

export type CitizenState = 'wandering' | 'seeking_resource' | 'seeking_shelter' | 'resting' | 'socializing' | 'building' | 'seeking_mate';
export type CitizenCategory = 'people' | 'animals' | 'food';
export type BuildingType = 'HOME' | 'STORAGE' | 'MEETING' | 'FARM' | 'WALL' | 'HORIZONTAL_ROAD' | 'VERTICAL_ROAD' | 'INTERSECTION' | 'TOWN_HALL' | 'COURTHOUSE' | 'TREASURY' | 'POLICE_STATION' | 'PUBLIC_WORKS';

export interface CitizenNeeds {
  hunger: number;      // 0-100
  energy: number;      // 0-100
  social: number;      // 0-100
}

export interface BuildingRecipe {
  symbol: string;
  resources: string[];
  buildTime: number;
}

export const BUILDING_RECIPES: Record<BuildingType, BuildingRecipe> = {
  HOME: { 
    symbol: '⌂', 
    resources: ['H', 'O', 'M', 'E'], 
    buildTime: 10 
  },
  STORAGE: { 
    symbol: '□', 
    resources: ['S', 'T', 'O', 'R'], 
    buildTime: 8 
  },
  MEETING: { 
    symbol: '◊', 
    resources: ['M', 'E', 'E', 'T'], 
    buildTime: 6 
  },
  FARM: { 
    symbol: '⚘', 
    resources: ['F', 'A', 'R', 'M'], 
    buildTime: 12 
  },
  WALL: { 
    symbol: '█', 
    resources: ['W', 'A', 'L'], 
    buildTime: 5 
  },
  HORIZONTAL_ROAD: {
    symbol: '=',
    resources: ['R', 'O', 'A', 'D'],
    buildTime: 3
  },
  VERTICAL_ROAD: {
    symbol: '║',
    resources: ['R', 'O', 'A', 'D'],
    buildTime: 3
  },
  INTERSECTION: {
    symbol: '╬',
    resources: ['R', 'O', 'A', 'D', 'X'],
    buildTime: 4
  },
  TOWN_HALL: {
    symbol: '🏛',
    resources: ['G', 'O', 'V', 'T', 'H', 'A', 'L', 'L'],
    buildTime: 20
  },
  COURTHOUSE: {
    symbol: '⚖',
    resources: ['C', 'O', 'U', 'R', 'T'],
    buildTime: 15
  },
  TREASURY: {
    symbol: '💰',
    resources: ['T', 'R', 'E', 'A', 'S', 'U', 'R', 'Y'],
    buildTime: 12
  },
  POLICE_STATION: {
    symbol: '🚓',
    resources: ['P', 'O', 'L', 'I', 'C', 'E'],
    buildTime: 10
  },
  PUBLIC_WORKS: {
    symbol: '⚙',
    resources: ['W', 'O', 'R', 'K', 'S'],
    buildTime: 8
  }
};

export const BREEDING_REQUIREMENTS = {
  minEnergy: 60,
  minAge: 100,
  breedingCooldown: 200,
  proximityRange: 2,
  maxPopulation: 100
};

export class Citizen {
  public id: string;
  public emoji: string;
  public position: Position;
  public category: CitizenCategory;
  public state: CitizenState;
  public needs: CitizenNeeds;
  public inventory: string[];  // Array of single-letter strings (A-Z) representing collected alphabet resources
  public target: Position | null;
  public movementSpeed: number;
  public visionRange: number;

  // Building system
  public isBuilding: boolean;
  public buildingProgress: number;
  public buildingTarget: BuildingType | null;

  // Breeding system
  public age: number;
  public lastBreedTime: number;
  public canBreed: boolean;
  public breedingPartner: Citizen | null;
  public offspring: number;

  // Energy system
  public energy: number;

  // Government system
  public governmentId: string | null;
  public governmentRole: Role;
  public taxesPaid: number;
  public satisfaction: number;
  public loyaltyToGov: number;
  public lastTaxTime: number;

  private moveCounter: number;

  constructor(
    id: string,
    emoji: string,
    position: Position,
    category: CitizenCategory,
    movementSpeed: number = 1,
    visionRange: number = 5
  ) {
    this.id = id;
    this.emoji = emoji;
    this.position = position;
    this.category = category;
    this.state = 'wandering';
    this.needs = {
      hunger: 50,
      energy: 80,
      social: 50
    };
    this.inventory = [];
    this.target = null;
    this.movementSpeed = movementSpeed;
    this.visionRange = visionRange;
    this.moveCounter = 0;

    // Initialize building properties
    this.isBuilding = false;
    this.buildingProgress = 0;
    this.buildingTarget = null;

    // Initialize breeding properties
    this.age = 0;
    this.lastBreedTime = -1000;
    this.canBreed = true;
    this.breedingPartner = null;
    this.offspring = 0;

    // Initialize energy
    this.energy = 80;

    // Initialize government properties
    this.governmentId = null;
    this.governmentRole = Role.INDEPENDENT;
    this.taxesPaid = 0;
    this.satisfaction = 70;
    this.loyaltyToGov = 50;
    this.lastTaxTime = -100;
  }

  // Update citizen AI each tick
  update(grid: Grid, allEntities: { citizens: Citizen[], resources: Resource[], landmarks: Landmark[] }, tickCount: number): void {
    // Increment age
    this.age++;

    // Check if on a road for energy bonus
    const onRoad = this.isOnRoad(allEntities.landmarks);
    const energyDecay = onRoad ? 0.015 : 0.03; // 50% less energy on roads

    // Decay needs
    this.needs.hunger = Math.max(0, this.needs.hunger - 0.1);
    this.needs.energy = Math.max(0, this.needs.energy - 0.05);
    this.needs.social = Math.max(0, this.needs.social - 0.08);

    // Decay energy (reduced on roads)
    this.energy = Math.max(0, this.energy - energyDecay);

    // Handle building progress
    if (this.isBuilding) {
      this.updateBuilding(grid, allEntities.landmarks);
      return; // Don't move while building
    }

    // Decide on action based on state and needs
    this.decideAction(grid, allEntities, tickCount);

    // Move towards target if exists (move faster on roads)
    this.moveCounter++;
    const moveThreshold = onRoad ? Math.max(0.5, this.movementSpeed / 2) : this.movementSpeed;
    if (this.moveCounter >= moveThreshold) {
      this.moveCounter = 0;
      this.move(grid, allEntities.landmarks);
    }
  }

  private isOnRoad(landmarks: Landmark[]): boolean {
    for (const landmark of landmarks) {
      if (landmark.position.x === this.position.x && landmark.position.y === this.position.y) {
        return landmark.isRoad();
      }
    }
    return false;
  }

  private decideAction(grid: Grid, entities: { citizens: Citizen[], resources: Resource[], landmarks: Landmark[] }, tickCount: number): void {
    // Priority system based on needs
    if (this.needs.energy < 20) {
      this.setState('seeking_shelter');
      this.findNearestLandmark(entities.landmarks, 'home');
    } else if (this.needs.hunger < 30) {
      this.setState('seeking_resource');
      this.findNearestResource(entities.resources);
    } else if (this.shouldBreed(tickCount, entities.citizens)) {
      this.setState('seeking_mate');
      this.findNearestMate(entities.citizens, tickCount);
    } else if (this.shouldBuild(entities.landmarks)) {
      this.setState('seeking_resource');
      this.planBuilding();
      this.findResourcesForBuilding(entities.resources);
    } else if (this.needs.social < 30) {
      this.setState('socializing');
      this.findNearestCitizen(entities.citizens);
    } else {
      this.setState('wandering');
      if (!this.target || Math.random() < 0.05) {
        this.setRandomTarget(grid);
      }
    }
  }

  private setState(state: CitizenState): void {
    this.state = state;
  }

  private move(grid: Grid, landmarks: Landmark[]): void {
    if (!this.target) return;

    const dx = Math.sign(this.target.x - this.position.x);
    const dy = Math.sign(this.target.y - this.position.y);

    let newPosition: Position;

    // Try to move diagonally first
    if (dx !== 0 && dy !== 0 && Math.random() > 0.5) {
      newPosition = { x: this.position.x + dx, y: this.position.y + dy };
    } else if (Math.abs(this.target.x - this.position.x) > Math.abs(this.target.y - this.position.y)) {
      newPosition = { x: this.position.x + dx, y: this.position.y };
    } else {
      newPosition = { x: this.position.x, y: this.position.y + dy };
    }

    // Check if new position is valid and walkable
    if (grid.isValidPosition(newPosition) && this.isWalkable(newPosition, landmarks)) {
      this.position = newPosition;
    }

    // Check if reached target
    if (this.position.x === this.target.x && this.position.y === this.target.y) {
      this.onReachTarget(grid, landmarks);
    }
  }

  private isWalkable(pos: Position, landmarks: Landmark[]): boolean {
    for (const landmark of landmarks) {
      if (landmark.position.x === pos.x && landmark.position.y === pos.y) {
        return landmark.isWalkable();
      }
    }
    return true;
  }

  private onReachTarget(grid: Grid, landmarks: Landmark[]): void {
    this.target = null;

    // Perform action based on state
    if (this.state === 'seeking_shelter') {
      this.needs.energy = Math.min(100, this.needs.energy + 30);
    } else if (this.state === 'seeking_resource') {
      // Resource collection is handled in World
      this.needs.hunger = Math.min(100, this.needs.hunger + 20);
    } else if (this.state === 'socializing') {
      this.needs.social = Math.min(100, this.needs.social + 15);
    }
  }

  private findNearestResource(resources: Resource[]): void {
    const available = resources.filter(r => !r.collected);
    if (available.length === 0) {
      this.setRandomTarget(null);
      return;
    }

    let nearest = available[0];
    let minDist = Grid.distance(this.position, nearest.position);

    for (const resource of available) {
      const dist = Grid.distance(this.position, resource.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = resource;
      }
    }

    this.target = nearest.position;
  }

  private findNearestLandmark(landmarks: Landmark[], type: string): void {
    const matching = landmarks.filter(l => l.type === type);
    if (matching.length === 0) {
      this.setRandomTarget(null);
      return;
    }

    let nearest = matching[0];
    let minDist = Grid.distance(this.position, nearest.position);

    for (const landmark of matching) {
      const dist = Grid.distance(this.position, landmark.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = landmark;
      }
    }

    this.target = nearest.position;
  }

  private findNearestCitizen(citizens: Citizen[]): void {
    const others = citizens.filter(c => c.id !== this.id);
    if (others.length === 0) {
      this.setRandomTarget(null);
      return;
    }

    let nearest = others[0];
    let minDist = Grid.distance(this.position, nearest.position);

    for (const citizen of others) {
      const dist = Grid.distance(this.position, citizen.position);
      if (dist < minDist && dist > 0) {
        minDist = dist;
        nearest = citizen;
      }
    }

    this.target = nearest.position;
  }

  private setRandomTarget(grid: Grid | null): void {
    if (!grid) return;
    
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.floor(Math.random() * grid.getWidth());
      const y = Math.floor(Math.random() * grid.getHeight());
      if (grid.isValidPosition({ x, y })) {
        this.target = { x, y };
        return;
      }
    }
  }

  collectResource(resource: Resource): void {
    if (this.inventory.length < 10) {
      this.inventory.push(resource.type);
      resource.collect();
    }
  }

  getDisplayChar(): string {
    return this.emoji;
  }

  getStateSymbol(): string {
    switch (this.state) {
      case 'seeking_resource': return '🍽️';
      case 'seeking_shelter': return '🏠';
      case 'socializing': return '💬';
      case 'resting': return '💤';
      case 'building': return '🔨';
      case 'seeking_mate': return '❤️';
      default: return '🚶';
    }
  }

  // Building system methods
  private shouldBuild(landmarks: Landmark[]): boolean {
    // Only build if not too many buildings already and has some energy
    if (this.energy < 40 || this.isBuilding) return false;
    
    const homeCount = landmarks.filter(l => l.type === 'home').length;
    // Build with some probability if not too many homes
    return homeCount < 15 && Math.random() < 0.05;
  }

  private planBuilding(): void {
    if (this.buildingTarget) return; // Already have a plan
    
    // Randomly choose a building type (government buildings are rarer)
    const rand = Math.random();
    if (rand < 0.7) {
      // 70% chance of regular buildings
      const buildingTypes: BuildingType[] = ['HOME', 'STORAGE', 'MEETING', 'FARM', 'WALL', 'HORIZONTAL_ROAD', 'VERTICAL_ROAD'];
      this.buildingTarget = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    } else if (rand < 0.95) {
      // 25% chance of intersection
      this.buildingTarget = 'INTERSECTION';
    } else {
      // 5% chance of government buildings
      const govBuildings: BuildingType[] = ['TOWN_HALL', 'COURTHOUSE', 'TREASURY', 'POLICE_STATION', 'PUBLIC_WORKS'];
      this.buildingTarget = govBuildings[Math.floor(Math.random() * govBuildings.length)];
    }
  }

  private findResourcesForBuilding(resources: Resource[]): void {
    if (!this.buildingTarget) return;
    
    const recipe = BUILDING_RECIPES[this.buildingTarget];
    const needed = this.getNeededResources(recipe.resources);
    
    if (needed.length === 0) {
      // Have all resources, ready to build
      this.startBuilding();
      return;
    }

    // Find nearest needed resource
    const available = resources.filter(r => !r.collected && needed.includes(r.type));
    if (available.length === 0) {
      // Can't find needed resources, cancel building plan
      this.buildingTarget = null;
      this.setRandomTarget(null);
      return;
    }

    let nearest = available[0];
    let minDist = Grid.distance(this.position, nearest.position);

    for (const resource of available) {
      const dist = Grid.distance(this.position, resource.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = resource;
      }
    }

    this.target = nearest.position;
  }

  private getNeededResources(required: string[]): string[] {
    const needed: string[] = [];
    const inventoryCopy = [...this.inventory];
    
    for (const resource of required) {
      const index = inventoryCopy.indexOf(resource);
      if (index === -1) {
        needed.push(resource);
      } else {
        inventoryCopy.splice(index, 1);
      }
    }
    
    return needed;
  }

  private hasResources(required: string[]): boolean {
    return this.getNeededResources(required).length === 0;
  }

  private consumeResources(required: string[]): void {
    for (const resource of required) {
      const index = this.inventory.indexOf(resource);
      if (index !== -1) {
        this.inventory.splice(index, 1);
      }
    }
  }

  startBuilding(): void {
    if (!this.buildingTarget) return;
    
    const recipe = BUILDING_RECIPES[this.buildingTarget];
    if (this.hasResources(recipe.resources)) {
      this.isBuilding = true;
      this.buildingProgress = 0;
      this.consumeResources(recipe.resources);
      this.setState('building');
      this.target = null;
    }
  }

  updateBuilding(grid: Grid, landmarks: Landmark[]): void {
    if (!this.isBuilding || !this.buildingTarget) return;
    
    this.buildingProgress++;
    const recipe = BUILDING_RECIPES[this.buildingTarget];
    
    if (this.buildingProgress >= recipe.buildTime) {
      // Building complete! The World class will handle adding the landmark
      this.isBuilding = false;
      this.buildingProgress = 0;
      this.energy = Math.min(100, this.energy + 10); // Small reward
    }
  }

  // Breeding system methods
  private shouldBreed(tickCount: number, citizens: Citizen[]): boolean {
    if (!this.canBreed) return false;
    if (this.age < BREEDING_REQUIREMENTS.minAge) return false;
    if (this.energy < BREEDING_REQUIREMENTS.minEnergy) return false;
    if (tickCount - this.lastBreedTime < BREEDING_REQUIREMENTS.breedingCooldown) return false;
    if (citizens.length >= BREEDING_REQUIREMENTS.maxPopulation) return false;
    
    // Only seek mate with some probability when conditions are met
    return Math.random() < 0.1;
  }

  private findNearestMate(citizens: Citizen[], tickCount: number): void {
    const potentialMates = citizens.filter(c => 
      c.id !== this.id && 
      this.canBreedWith(c, tickCount)
    );

    if (potentialMates.length === 0) {
      this.setRandomTarget(null);
      return;
    }

    let nearest = potentialMates[0];
    let minDist = Grid.distance(this.position, nearest.position);

    for (const mate of potentialMates) {
      const dist = Grid.distance(this.position, mate.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = mate;
      }
    }

    this.breedingPartner = nearest;
    this.target = nearest.position;
  }

  canBreedWith(other: Citizen, currentTick: number): boolean {
    if (!this.canBreed || !other.canBreed) return false;
    if (this.age < BREEDING_REQUIREMENTS.minAge || other.age < BREEDING_REQUIREMENTS.minAge) return false;
    if (this.energy < BREEDING_REQUIREMENTS.minEnergy || other.energy < BREEDING_REQUIREMENTS.minEnergy) return false;
    if (currentTick - this.lastBreedTime < BREEDING_REQUIREMENTS.breedingCooldown) return false;
    if (currentTick - other.lastBreedTime < BREEDING_REQUIREMENTS.breedingCooldown) return false;
    return true;
  }

  isNearby(other: Citizen): boolean {
    const dist = Grid.distance(this.position, other.position);
    return dist <= BREEDING_REQUIREMENTS.proximityRange;
  }

  breed(partner: Citizen, tickCount: number): void {
    this.lastBreedTime = tickCount;
    partner.lastBreedTime = tickCount;
    this.offspring++;
    partner.offspring++;
    this.energy -= 20;
    partner.energy -= 20;
    this.needs.hunger = Math.max(0, this.needs.hunger - 30);
    partner.needs.hunger = Math.max(0, partner.needs.hunger - 30);
    this.breedingPartner = null;
    partner.breedingPartner = null;
  }

  // Government methods
  joinGovernment(governmentId: string, role: Role = Role.CITIZEN): void {
    this.governmentId = governmentId;
    this.governmentRole = role;
    this.satisfaction = 70;
    this.loyaltyToGov = 60;
  }

  leaveGovernment(): void {
    this.governmentId = null;
    this.governmentRole = Role.INDEPENDENT;
  }

  payTax(taxRate: number, tickCount: number): string[] {
    // Pay taxes every 100 ticks
    if (tickCount - this.lastTaxTime < 100) return [];
    
    const taxableItems: string[] = [];
    const taxAmount = Math.floor(this.inventory.length * taxRate);
    
    for (let i = 0; i < taxAmount && this.inventory.length > 0; i++) {
      const resource = this.inventory.shift();
      if (resource) {
        taxableItems.push(resource);
        this.taxesPaid++;
      }
    }
    
    this.lastTaxTime = tickCount;
    
    // High taxes reduce satisfaction
    if (taxRate > 0.3) {
      this.satisfaction = Math.max(0, this.satisfaction - 2);
      this.loyaltyToGov = Math.max(0, this.loyaltyToGov - 1);
    }
    
    return taxableItems;
  }

  receiveGovernmentService(): void {
    // Receiving government services increases satisfaction
    this.satisfaction = Math.min(100, this.satisfaction + 1);
    this.loyaltyToGov = Math.min(100, this.loyaltyToGov + 0.5);
  }

  updateGovernmentSatisfaction(delta: number): void {
    this.satisfaction = Math.max(0, Math.min(100, this.satisfaction + delta));
    
    // Satisfaction affects loyalty
    if (this.satisfaction < 30) {
      this.loyaltyToGov = Math.max(0, this.loyaltyToGov - 1);
    } else if (this.satisfaction > 70) {
      this.loyaltyToGov = Math.min(100, this.loyaltyToGov + 0.5);
    }
  }

  shouldRebel(): boolean {
    return this.governmentId !== null && 
           this.satisfaction < 20 && 
           this.loyaltyToGov < 20 && 
           Math.random() < 0.01; // 1% chance per tick when conditions met
  }
}
