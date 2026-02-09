import { Position, Grid } from '../world/Grid';
import { Resource } from './Resource';
import { Landmark } from './Landmark';

export type CitizenState = 'wandering' | 'seeking_resource' | 'seeking_shelter' | 'resting' | 'socializing';
export type CitizenCategory = 'people' | 'animals' | 'food';

export interface CitizenNeeds {
  hunger: number;      // 0-100
  energy: number;      // 0-100
  social: number;      // 0-100
}

export class Citizen {
  public id: string;
  public emoji: string;
  public position: Position;
  public category: CitizenCategory;
  public state: CitizenState;
  public needs: CitizenNeeds;
  public inventory: Resource[];
  public target: Position | null;
  public movementSpeed: number;
  public visionRange: number;

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
  }

  // Update citizen AI each tick
  update(grid: Grid, allEntities: { citizens: Citizen[], resources: Resource[], landmarks: Landmark[] }): void {
    try {
      // Decay needs
      this.needs.hunger = Math.max(0, this.needs.hunger - 0.1);
      this.needs.energy = Math.max(0, this.needs.energy - 0.05);
      this.needs.social = Math.max(0, this.needs.social - 0.08);

      // Decide on action based on state and needs
      this.decideAction(grid, allEntities);

      // Move towards target if exists
      this.moveCounter++;
      if (this.moveCounter >= this.movementSpeed) {
        this.moveCounter = 0;
        this.move(grid, allEntities.landmarks);
      }
    } catch (error) {
      console.error(`Error in citizen update ${this.id}:`, error);
      // Don't crash, just skip this tick
    }
  }

  private decideAction(grid: Grid, entities: { citizens: Citizen[], resources: Resource[], landmarks: Landmark[] }): void {
    // Priority system based on needs
    if (this.needs.energy < 20) {
      this.setState('seeking_shelter');
      this.findNearestLandmark(entities.landmarks, 'home');
    } else if (this.needs.hunger < 30) {
      this.setState('seeking_resource');
      this.findNearestResource(entities.resources);
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
    try {
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
    } catch (error) {
      console.error(`Error moving citizen ${this.id}:`, error);
      // Stay in place on error
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
    if (this.inventory.length < 5) {
      this.inventory.push(resource);
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
      default: return '🚶';
    }
  }
}
