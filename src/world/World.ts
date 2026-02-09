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
  private maxTicksBeforeCleanup: number = 1000;

  constructor(config: WorldConfig) {
    this.config = config;
    this.grid = new Grid(config.world.width, config.world.height);
    this.citizens = [];
    this.resources = [];
    this.landmarks = [];
    this.tickCount = 0;
    this.running = false;
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
    try {
      this.tickCount++;

      // Process citizens with individual error handling
      for (const citizen of this.citizens) {
        try {
          if (citizen && typeof citizen.update === 'function') {
            citizen.update(this.grid, {
              citizens: this.citizens,
              resources: this.resources,
              landmarks: this.landmarks
            });

            // Check for resource collection
            const resourcesAtPos = this.resources.filter(
              r => !r.collected && r.position.x === citizen.position.x && r.position.y === citizen.position.y
            );

            for (const resource of resourcesAtPos) {
              citizen.collectResource(resource);
            }
          }
        } catch (citizenError) {
          console.error(`Error processing citizen ${citizen?.id}:`, citizenError);
          // Continue with other citizens instead of crashing
        }
      }

      // Process resources with error handling
      try {
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
      } catch (resourceError) {
        console.error('Error updating resources:', resourceError);
      }

      // Periodic cleanup
      if (this.tickCount % this.maxTicksBeforeCleanup === 0) {
        this.cleanup();
      }
    } catch (error) {
      console.error('Critical error in World.tick():', error);
      throw error; // Re-throw to be handled by API layer
    }
  }

  private cleanup(): void {
    // Remove dead or invalid citizens
    this.citizens = this.citizens.filter(citizen => {
      return citizen && 
             citizen.position && 
             this.grid.isValidPosition(citizen.position);
    });

    // Remove depleted resources
    this.resources = this.resources.filter(resource => {
      return resource && resource.position;
    });
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
  } {
    return {
      tick: this.tickCount,
      citizens: this.citizens.length,
      resources: this.resources.filter(r => !r.collected).length,
      resourcesCollected: this.resources.filter(r => r.collected).length
    };
  }
}
