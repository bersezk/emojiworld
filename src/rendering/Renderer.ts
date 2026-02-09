import { World } from '../world/World';
import { Citizen } from '../entities/Citizen';
import { Resource } from '../entities/Resource';
import { Landmark } from '../entities/Landmark';

export class Renderer {
  private showStats: boolean;
  private clearConsole: boolean;

  constructor(showStats: boolean = true, clearConsole: boolean = true) {
    this.showStats = showStats;
    this.clearConsole = clearConsole;
  }

  render(world: World): void {
    if (this.clearConsole) {
      console.clear();
    }

    const grid = world.getGrid();
    const width = grid.getWidth();
    const height = grid.getHeight();
    const citizens = world.getCitizens();
    const resources = world.getResources();
    const landmarks = world.getLandmarks();

    // Create display grid
    const display: string[][] = [];
    for (let y = 0; y < height; y++) {
      display[y] = [];
      for (let x = 0; x < width; x++) {
        display[y][x] = ' ';
      }
    }

    // Place landmarks first (base layer)
    for (const landmark of landmarks) {
      const { x, y } = landmark.position;
      display[y][x] = landmark.getDisplayChar();
    }

    // Place resources (middle layer)
    for (const resource of resources) {
      if (!resource.collected) {
        const { x, y } = resource.position;
        display[y][x] = resource.getDisplayChar();
      }
    }

    // Place citizens (top layer)
    for (const citizen of citizens) {
      const { x, y } = citizen.position;
      display[y][x] = citizen.getDisplayChar();
    }

    // Render the grid
    console.log('╔' + '═'.repeat(width) + '╗');
    for (let y = 0; y < height; y++) {
      console.log('║' + display[y].join('') + '║');
    }
    console.log('╚' + '═'.repeat(width) + '╝');

    // Render stats
    if (this.showStats) {
      this.renderStats(world);
    }
  }

  private renderStats(world: World): void {
    const stats = world.getStats();
    console.log('\n📊 World Statistics:');
    console.log(`  Tick: ${stats.tick}`);
    console.log(`  Citizens: ${stats.citizens}`);
    console.log(`  Available Resources: ${stats.resources}`);
    console.log(`  Collected Resources: ${stats.resourcesCollected}`);

    // Display citizen states
    const citizens = world.getCitizens();
    const stateCounts: Record<string, number> = {};
    
    for (const citizen of citizens) {
      stateCounts[citizen.state] = (stateCounts[citizen.state] || 0) + 1;
    }

    console.log('\n👥 Citizen States:');
    for (const [state, count] of Object.entries(stateCounts)) {
      console.log(`  ${state}: ${count}`);
    }

    // Display sample citizen details
    if (citizens.length > 0) {
      const sample = citizens[0];
      console.log('\n🔍 Sample Citizen:');
      console.log(`  ${sample.emoji} (${sample.category})`);
      console.log(`  Position: (${sample.position.x}, ${sample.position.y})`);
      console.log(`  State: ${sample.state}`);
      console.log(`  Needs - Hunger: ${sample.needs.hunger.toFixed(1)} Energy: ${sample.needs.energy.toFixed(1)} Social: ${sample.needs.social.toFixed(1)}`);
      console.log(`  Inventory: ${sample.inventory.length} items`);
    }

    console.log('\n⌨️  Controls: Press Ctrl+C to stop simulation\n');
  }
}
