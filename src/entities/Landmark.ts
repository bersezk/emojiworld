import { Position } from '../world/Grid';

export type LandmarkType = 'home' | 'market' | 'park' | 'boundary' | 'storage' | 'meeting' | 'farm' | 'wall' | 'horizontal_road' | 'vertical_road' | 'intersection';

export class Landmark {
  public position: Position;
  public type: LandmarkType;
  public character: string;
  public capacity: number;
  public occupants: Set<string>;

  constructor(position: Position, type: LandmarkType, character: string) {
    this.position = position;
    this.type = type;
    this.character = character;
    this.capacity = type === 'boundary' ? 0 : 5;
    this.occupants = new Set();
  }

  isRoad(): boolean {
    return this.type === 'horizontal_road' || this.type === 'vertical_road' || this.type === 'intersection';
  }

  canEnter(): boolean {
    return this.type !== 'boundary' && this.occupants.size < this.capacity;
  }

  enter(citizenId: string): boolean {
    if (this.canEnter()) {
      this.occupants.add(citizenId);
      return true;
    }
    return false;
  }

  leave(citizenId: string): void {
    this.occupants.delete(citizenId);
  }

  getDisplayChar(): string {
    return this.character;
  }

  isWalkable(): boolean {
    return this.type !== 'boundary';
  }
}
