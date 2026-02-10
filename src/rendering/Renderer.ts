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

    // Display infrastructure statistics
    const landmarks = world.getLandmarks();
    const roads = landmarks.filter(l => l.isRoad());
    const govBuildings = landmarks.filter(l => l.isGovernmentBuilding());
    
    console.log('\n🛣️  Infrastructure:');
    console.log(`  Total Roads: ${roads.length}`);
    console.log(`  Horizontal: ${landmarks.filter(l => l.type === 'horizontal_road').length}`);
    console.log(`  Vertical: ${landmarks.filter(l => l.type === 'vertical_road').length}`);
    console.log(`  Intersections: ${landmarks.filter(l => l.type === 'intersection').length}`);
    console.log(`  Government Buildings: ${govBuildings.length}`);

    // Display government statistics
    const governments = world.getGovernments();
    if (governments.length > 0) {
      console.log('\n🏛️  Governments:');
      for (const gov of governments) {
        console.log(`  ${gov.name} (${gov.type})`);
        console.log(`    Leader: ${gov.leader ? gov.leader.emoji : 'None'}`);
        console.log(`    Citizens: ${gov.getCitizenCount()}`);
        console.log(`    Officials: ${gov.getOfficialCount()}`);
        console.log(`    Treasury: ${gov.getTreasuryTotal()} resources`);
        console.log(`    Tax Rate: ${(gov.taxRate * 100).toFixed(0)}%`);
        console.log(`    Satisfaction: ${gov.satisfaction.toFixed(0)}%`);
        console.log(`    Roads Built: ${gov.getRoadCount()}`);
      }
    }
  }
}
