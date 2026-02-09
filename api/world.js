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
const sessionLocks = new Map();

// Session cleanup after 30 minutes of inactivity
const SESSION_TIMEOUT = 30 * 60 * 1000;
const sessionTimestamps = new Map();

function cleanupOldSessions() {
  const now = Date.now();
  for (const [sessionId, timestamp] of sessionTimestamps.entries()) {
    if (now - timestamp > SESSION_TIMEOUT) {
      worldInstances.delete(sessionId);
      sessionLocks.delete(sessionId);
      sessionTimestamps.delete(sessionId);
      console.log(`Cleaned up inactive session: ${sessionId}`);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupOldSessions, 5 * 60 * 1000);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { sessionId } = req.query;

    // POST /api/world - Create new world
    if (req.method === 'POST' && !sessionId) {
      try {
        const WorldClass = getWorld();
        const newSessionId = `world-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Initialize world with error handling
        let world;
        try {
          world = new WorldClass(defaultConfig);
          world.initialize();
        } catch (initError) {
          console.error('World initialization error:', initError);
          return res.status(500).json({ 
            error: 'Failed to initialize world',
            details: initError.message 
          });
        }

        worldInstances.set(newSessionId, world);
        sessionTimestamps.set(newSessionId, Date.now());
        sessionLocks.set(newSessionId, false);

        // Clean up old instances (keep only last 10)
        if (worldInstances.size > 10) {
          const firstKey = worldInstances.keys().next().value;
          worldInstances.delete(firstKey);
          sessionLocks.delete(firstKey);
          sessionTimestamps.delete(firstKey);
        }

        return res.status(200).json({ sessionId: newSessionId });
      } catch (error) {
        console.error('Error creating world:', error);
        return res.status(500).json({ 
          error: 'Failed to create world',
          details: error.message 
        });
      }
    }

    // POST /api/world/:sessionId/tick - Tick world
    if (req.method === 'POST' && sessionId && req.url.includes('/tick')) {
      if (!worldInstances.has(sessionId)) {
        return res.status(404).json({ 
          error: 'Session not found. Please create a new world.' 
        });
      }

      // Prevent concurrent ticks for the same session
      if (sessionLocks.get(sessionId)) {
        return res.status(429).json({ 
          error: 'Tick already in progress. Please wait.' 
        });
      }

      sessionLocks.set(sessionId, true);
      sessionTimestamps.set(sessionId, Date.now());

      try {
        const world = worldInstances.get(sessionId);
        
        // Process tick with error handling
        try {
          world.tick();
        } catch (tickError) {
          console.error(`Tick error for session ${sessionId}:`, tickError);
          sessionLocks.set(sessionId, false);
          return res.status(500).json({ 
            error: 'Simulation error occurred',
            details: tickError.message,
            recoverable: true
          });
        }

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

        return res.status(200).json(worldState);
      } catch (error) {
        console.error(`Fatal error in tick for session ${sessionId}:`, error);
        return res.status(500).json({ 
          error: 'Fatal simulation error',
          details: error.message,
          recoverable: false
        });
      } finally {
        sessionLocks.set(sessionId, false);
      }
    }

    // GET /api/world/:sessionId - Get world state
    if (req.method === 'GET' && sessionId) {
      if (!worldInstances.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
      }

      try {
        const world = worldInstances.get(sessionId);
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

        return res.status(200).json(worldState);
      } catch (error) {
        console.error(`Error getting world state for session ${sessionId}:`, error);
        return res.status(500).json({ 
          error: 'Failed to get world state',
          details: error.message 
        });
      }
    }

    // DELETE /api/world/:sessionId - Delete session
    if (req.method === 'DELETE' && sessionId) {
      if (worldInstances.has(sessionId)) {
        worldInstances.delete(sessionId);
        sessionLocks.delete(sessionId);
        sessionTimestamps.delete(sessionId);
        return res.status(200).json({ message: 'Session deleted' });
      }

      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Unhandled API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

