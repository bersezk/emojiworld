import { Position } from '../world/Grid';

export type ResourceType = string; // A-Z, a-z

export class Resource {
  public position: Position;
  public type: ResourceType;
  public character: string;
  public collected: boolean;

  constructor(position: Position, type: ResourceType) {
    this.position = position;
    this.type = type;
    this.character = type;
    this.collected = false;
  }

  collect(): void {
    this.collected = true;
  }

  respawn(newPosition: Position): void {
    this.position = newPosition;
    this.collected = false;
  }

  getDisplayChar(): string {
    return this.collected ? ' ' : this.character;
  }
}
