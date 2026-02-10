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
const worldInstances = new Map();
const sessionMetadata = new Map(); // Stores { createdAt, lastAccessedAt, tickCount }

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

// Session validation and error handling utilities
function validateSession(sessionId) {
  const world = worldInstances.get(sessionId);
  const metadata = sessionMetadata.get(sessionId);
  
  if (!world) {
    return {
      valid: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'World session not found. It may have expired or been cleaned up.',
        detail: 'Sessions are stored in memory and cleared during serverless cold starts or after timeout.',
        action: 'Please reset and start a new simulation.'
      }
    };
  }
  
  // Update last accessed timestamp
  if (metadata) {
    metadata.lastAccessedAt = Date.now();
  }
  
  return { valid: true, world, metadata };
}

function createErrorResponse(error, statusCode = 500) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error:`, {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message,
    detail: error.detail,
    stack: error.stack
  });
  
  return {
    status: statusCode,
    body: {
      error: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      detail: error.detail,
      action: error.action,
      timestamp
    }
  };
}

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
    const startTime = Date.now();
    try {
      const WorldClass = getWorld();
      const newSessionId = `world-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const world = new WorldClass(defaultConfig);
      world.initialize();
      worldInstances.set(newSessionId, world);
      
      // Store session metadata
      sessionMetadata.set(newSessionId, {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        tickCount: 0
      });

      // Clean up old instances (keep only last 10)
      if (worldInstances.size > 10) {
        const firstKey = worldInstances.keys().next().value;
        worldInstances.delete(firstKey);
        sessionMetadata.delete(firstKey);
      }

      const duration = Date.now() - startTime;
      console.log(`[World Created] sessionId: ${newSessionId}, duration: ${duration}ms`);
      res.status(200).json({ sessionId: newSessionId });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = createErrorResponse({
        code: 'WORLD_CREATION_FAILED',
        message: 'Failed to create world',
        detail: error.message,
        action: 'Please try again. If the problem persists, check server logs.',
        stack: error.stack
      }, 500);
      console.error(`[World Creation Failed] duration: ${duration}ms`);
      res.status(errorResponse.status).json(errorResponse.body);
    }
    return;
  }

  // POST /api/world/:sessionId/tick - Tick world
  if (req.method === 'POST' && sessionId && req.url.includes('/tick')) {
    const startTime = Date.now();
    
    // Validate session
    const validation = validateSession(sessionId);
    if (!validation.valid) {
      const errorResponse = createErrorResponse(validation.error, 404);
      res.status(errorResponse.status).json(errorResponse.body);
      return;
    }
    
    const world = validation.world;
    const metadata = validation.metadata;

    try {
      world.tick();
      
      // Update tick count
      if (metadata) {
        metadata.tickCount = (metadata.tickCount || 0) + 1;
      }

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

      const duration = Date.now() - startTime;
      
      // Warn if tick is taking too long (approaching timeout)
      if (duration > 8000) {
        console.warn(`[Slow Tick Warning] sessionId: ${sessionId}, duration: ${duration}ms, tick: ${stats.tick}`);
      } else if (duration > 1000) {
        console.log(`[Tick] sessionId: ${sessionId}, duration: ${duration}ms, tick: ${stats.tick}`);
      }

      res.status(200).json(worldState);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = createErrorResponse({
        code: 'TICK_EXECUTION_FAILED',
        message: 'Failed to execute world tick',
        detail: error.message,
        action: 'This may be due to computation timeout or memory limits. Try resetting the simulation with fewer citizens.',
        stack: error.stack
      }, 500);
      console.error(`[Tick Failed] sessionId: ${sessionId}, duration: ${duration}ms`);
      res.status(errorResponse.status).json(errorResponse.body);
    }
    return;
  }

  // GET /api/world/:sessionId/status - Get session status
  if (req.method === 'GET' && sessionId && req.url.includes('/status')) {
    const validation = validateSession(sessionId);
    
    if (!validation.valid) {
      const errorResponse = createErrorResponse(validation.error, 404);
      res.status(errorResponse.status).json(errorResponse.body);
      return;
    }
    
    const metadata = validation.metadata;
    const world = validation.world;
    
    try {
      const citizens = world.getCitizens();
      const stats = world.getStats();
      const now = Date.now();
      
      const statusInfo = {
        sessionId: sessionId,
        exists: true,
        createdAt: metadata?.createdAt,
        lastAccessedAt: metadata?.lastAccessedAt,
        ageSeconds: metadata?.createdAt ? Math.floor((now - metadata.createdAt) / 1000) : 0,
        tickCount: metadata?.tickCount || 0,
        population: citizens.length,
        currentTick: stats.tick,
        totalSessions: worldInstances.size
      };
      
      res.status(200).json(statusInfo);
    } catch (error) {
      const errorResponse = createErrorResponse({
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to retrieve session status',
        detail: error.message,
        action: 'The session exists but could not be read. Try resetting.',
        stack: error.stack
      }, 500);
      res.status(errorResponse.status).json(errorResponse.body);
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

