import * as fs from 'fs';
import * as path from 'path';
import { World, WorldConfig } from './world/World';
import { Renderer } from './rendering/Renderer';

class EmojiWorldSimulation {
  private world: World;
  private renderer: Renderer;
  private config: WorldConfig;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(configPath: string) {
    // Load configuration
    const configFile = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configFile) as WorldConfig;

    // Initialize world and renderer
    this.world = new World(this.config);
    this.renderer = new Renderer(
      this.config.rendering.showStats,
      this.config.rendering.clearConsole
    );
  }

  start(): void {
    console.log('🌍 Welcome to EmojiWorld!');
    console.log('Initializing world...\n');

    // Initialize the world
    this.world.initialize();
    this.world.setRunning(true);

    // Initial render
    this.renderer.render(this.world);

    // Start simulation loop
    this.intervalId = setInterval(() => {
      if (this.world.isRunning()) {
        this.world.tick();
        this.renderer.render(this.world);
      }
    }, this.config.world.tickRate);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  stop(): void {
    console.log('\n\n👋 Stopping EmojiWorld simulation...');
    this.world.setRunning(false);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Display final stats
    const stats = this.world.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`  Total Ticks: ${stats.tick}`);
    console.log(`  Citizens: ${stats.citizens}`);
    console.log(`  Resources Collected: ${stats.resourcesCollected}`);
    console.log('\nThank you for exploring EmojiWorld! 🎉\n');
    
    process.exit(0);
  }
}

// Main execution
const configPath = path.join(__dirname, 'config', 'world-config.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ Configuration file not found:', configPath);
  process.exit(1);
}

const simulation = new EmojiWorldSimulation(configPath);
simulation.start();
