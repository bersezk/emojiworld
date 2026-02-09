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
      const newSessionId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

      const worldState = {
        grid: {
          width: world.getGrid().getWidth(),
          height: world.getGrid().getHeight()
        },
        citizens: world.getCitizens().map(c => ({
          id: c.id,
          emoji: c.emoji,
          position: c.position,
          state: c.state,
          needs: c.needs
        })),
        resources: world.getResources().map(r => ({
          position: r.position,
          character: r.character,
          collected: r.collected
        })),
        landmarks: world.getLandmarks().map(l => ({
          position: l.position,
          character: l.character,
          type: l.type
        })),
        stats: world.getStats()
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

