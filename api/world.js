// Vercel Serverless Function for EmojiWorld API
// This file will be transpiled by Vercel

const path = require('path');

// Lazy-load the World class to avoid bundling issues
let World = null;

function getWorld() {
  if (!World) {
    const worldModule = require(path.join(process.cwd(), 'dist', 'world', 'World'));
    World = worldModule.World;
  }
  return World;
}

// In-memory storage for world instances
const worldInstances = new Map();

// Default configuration
const defaultConfig = {
  world: {
    width: 80,
    height: 24,
    tickRate: 200
  },
  citizens: {
    initialCount: 10,
    emojiCategories: {
      people: ['🧑', '👨', '👩', '🧒', '👴', '👵'],
      animals: ['🐕', '🐈', '🐦', '🐰', '🐻', '🦊'],
      food: ['🍎', '🍌', '🍕', '🍔', '🍞', '🥕']
    },
    movementSpeed: 1,
    visionRange: 5,
    needsDecayRate: 0.1
  },
  landmarks: {
    types: {
      home: '⌂',
      market: '🏪',
      park: '🏞️',
      boundary: '#'
    },
    initialCount: 8
  },
  resources: {
    types: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    initialCount: 30,
    respawnRate: 0.01,
    maxPerType: 50
  },
  rendering: {
    showStats: true,
    clearConsole: false,
    frameSkip: 1
  }
};

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { sessionId } = req.query;

  // POST /api/world - Create new world
  if (req.method === 'POST' && !sessionId) {
    try {
      const WorldClass = getWorld();
      const newSessionId = `world-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const world = new WorldClass(defaultConfig);
      world.initialize();
      worldInstances.set(newSessionId, world);

      // Clean up old instances (keep only last 10)
      if (worldInstances.size > 10) {
        const firstKey = worldInstances.keys().next().value;
        worldInstances.delete(firstKey);
      }

      res.status(200).json({ sessionId: newSessionId });
    } catch (error) {
      console.error('Error creating world:', error);
      res.status(500).json({ error: 'Failed to create world', message: error.message });
    }
    return;
  }

  // POST /api/world/:sessionId/tick - Tick world
  if (req.method === 'POST' && sessionId && req.url.includes('/tick')) {
    const world = worldInstances.get(sessionId);
    
    if (!world) {
      res.status(404).json({ error: 'World not found' });
      return;
    }

    try {
      world.tick();

      const grid = world.getGrid();
      const width = grid.getWidth();
      const height = grid.getHeight();
      const citizens = world.getCitizens();
      const resources = world.getResources();
      const landmarks = world.getLandmarks();
      const stats = world.getStats();

      // Create display grid matching the frontend expectations
      const display = [];
      for (let y = 0; y < height; y++) {
        display[y] = [];
        for (let x = 0; x < width; x++) {
          display[y][x] = ' ';
        }
      }

      // Place landmarks first (base layer)
      for (const landmark of landmarks) {
        const { x, y } = landmark.position;
        display[y][x] = landmark.character;
      }

      // Place resources (middle layer)
      for (const resource of resources) {
        if (!resource.collected) {
          const { x, y } = resource.position;
          display[y][x] = resource.character;
        }
      }

      // Place citizens (top layer)
      for (const citizen of citizens) {
        const { x, y } = citizen.position;
        display[y][x] = citizen.emoji;
      }

      // Collect building and breeding citizens
      const buildingCitizens = citizens
        .filter(c => c.isBuilding)
        .map(c => ({ x: c.position.x, y: c.position.y }));
      
      const breedingCitizens = citizens
        .filter(c => c.state === 'seeking_mate' && c.breedingPartner)
        .map(c => ({ x: c.position.x, y: c.position.y }));

      const worldState = {
        width: width,
        height: height,
        grid: display,
        population: citizens.length,
        resources: resources.filter(r => !r.collected).length,
        landmarks: landmarks.filter(l => l.type !== 'boundary').length,
        buildings: stats.buildings || 0,
        births: stats.births || 0,
        growthRate: stats.growthRate || 0,
        ticks: stats.tick,
        buildingCitizens: buildingCitizens,
        breedingCitizens: breedingCitizens
      };

      res.status(200).json(worldState);
    } catch (error) {
      console.error('Error ticking world:', error);
      res.status(500).json({ error: 'Failed to tick world', message: error.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

