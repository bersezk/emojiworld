export interface Position {
  x: number;
  y: number;
}

export class Grid {
  private width: number;
  private height: number;
  private cells: Map<string, any[]>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Map();
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  // Convert position to key
  private positionToKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  // Check if position is within bounds
  isValidPosition(pos: Position): boolean {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  // Add entity to a position
  addEntity(pos: Position, entity: any): void {
    if (!this.isValidPosition(pos)) return;
    
    const key = this.positionToKey(pos);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(entity);
  }

  // Remove entity from a position
  removeEntity(pos: Position, entity: any): void {
    const key = this.positionToKey(pos);
    const entities = this.cells.get(key);
    if (entities) {
      const index = entities.indexOf(entity);
      if (index > -1) {
        entities.splice(index, 1);
      }
      if (entities.length === 0) {
        this.cells.delete(key);
      }
    }
  }

  // Get all entities at a position
  getEntitiesAt(pos: Position): any[] {
    const key = this.positionToKey(pos);
    return this.cells.get(key) || [];
  }

  // Get all entities in a radius
  getEntitiesInRadius(center: Position, radius: number): any[] {
    const entities: any[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy };
        if (this.isValidPosition(pos)) {
          entities.push(...this.getEntitiesAt(pos));
        }
      }
    }
    return entities;
  }

  // Calculate distance between two positions
  static distance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get all occupied positions
  getOccupiedPositions(): Position[] {
    const positions: Position[] = [];
    for (const key of this.cells.keys()) {
      const [x, y] = key.split(',').map(Number);
      positions.push({ x, y });
    }
    return positions;
  }

  // Clear all entities
  clear(): void {
    this.cells.clear();
  }
}
