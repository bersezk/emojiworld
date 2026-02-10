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

// In-memory storage for world instances with metadata
const worldInstances = new Map(); // Map<sessionId, { world, createdAt, lastAccessedAt }>

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

  const { sessionId, action } = req.query;
  const startTime = Date.now();

  // Helper function to log errors with context
  const logError = (context, error) => {
    console.error(`[${context}] Error:`, {
      message: error.message,
      stack: error.stack,
      sessionId,
      timestamp: new Date().toISOString()
    });
  };

  // Helper function to validate session
  const validateSession = (sessionId) => {
    if (!sessionId) {
      return { valid: false, errorCode: 'MISSING_SESSION', message: 'Session ID is required' };
    }
    
    const sessionData = worldInstances.get(sessionId);
    if (!sessionData) {
      return { 
        valid: false, 
        errorCode: 'SESSION_NOT_FOUND', 
        message: `Session '${sessionId}' not found. It may have expired or been cleared. Please create a new world.`,
        hint: 'Sessions are stored in memory and cleared on server restarts or after cleanup.'
      };
    }
    
    return { valid: true, sessionData };
  };

  // GET /api/world/:sessionId/status - Diagnostic endpoint
  if (req.method === 'GET' && sessionId && action === 'status') {
    const validation = validateSession(sessionId);
    
    if (!validation.valid) {
      return res.status(404).json({
        error: validation.errorCode,
        message: validation.message,
        hint: validation.hint,
        sessionId
      });
    }

    const { sessionData } = validation;
    const world = sessionData.world;
    const stats = world.getStats();
    const uptime = Date.now() - sessionData.createdAt;
    const lastAccessed = Date.now() - sessionData.lastAccessedAt;

    res.status(200).json({
      sessionId,
      status: 'active',
      uptime: uptime,
      lastAccessed: lastAccessed,
      stats,
      totalSessions: worldInstances.size
    });
    return;
  }

  // POST /api/world - Create new world
  if (req.method === 'POST' && !sessionId) {
    try {
      const WorldClass = getWorld();
      const newSessionId = `world-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const world = new WorldClass(defaultConfig);
      world.initialize();
      
      worldInstances.set(newSessionId, {
        world,
        createdAt: Date.now(),
        lastAccessedAt: Date.now()
      });

      // Clean up old instances (keep only last 10)
      if (worldInstances.size > 10) {
        const sortedSessions = Array.from(worldInstances.entries())
          .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
        const [oldestSessionId] = sortedSessions[0];
        worldInstances.delete(oldestSessionId);
        console.log(`[Cleanup] Removed oldest session: ${oldestSessionId}`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`[Create] Session created: ${newSessionId}, execution time: ${executionTime}ms`);

      res.status(200).json({ sessionId: newSessionId });
    } catch (error) {
      logError('Create World', error);
      res.status(500).json({ 
        error: 'CREATE_FAILED',
        message: 'Failed to create world', 
        details: error.message,
        hint: 'Check server logs for detailed error information.'
      });
    }
    return;
  }

  // POST /api/world/:sessionId/tick - Tick world
  if (req.method === 'POST' && sessionId && req.url.includes('/tick')) {
    const validation = validateSession(sessionId);
    
    if (!validation.valid) {
      return res.status(404).json({
        error: validation.errorCode,
        message: validation.message,
        hint: validation.hint,
        sessionId
      });
    }

    const { sessionData } = validation;
    const world = sessionData.world;

    try {
      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();

      world.tick();

      const grid = world.getGrid();
      const width = grid.getWidth();
      const height = grid.getHeight();
      const citizens = world.getCitizens();
      const resources = world.getResources();
      const landmarks = world.getLandmarks();
      const stats = world.getStats();
      const events = world.getEvents ? world.getEvents() : [];

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

      const executionTime = Date.now() - startTime;

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
        breedingCitizens: breedingCitizens,
        events: events,
        executionTime: executionTime
      };

      // Clear events after sending them
      if (world.clearEvents) {
        world.clearEvents();
      }

      if (executionTime > 5000) {
        console.warn(`[Tick] Slow execution: ${executionTime}ms for session ${sessionId}`);
      }

      res.status(200).json(worldState);
    } catch (error) {
      logError('Tick World', error);
      res.status(500).json({ 
        error: 'TICK_FAILED',
        message: 'Failed to tick world', 
        details: error.message,
        sessionId,
        hint: 'The simulation encountered an error. Try resetting the world.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    return;
  }

  res.status(405).json({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'Method not allowed',
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  });
};

