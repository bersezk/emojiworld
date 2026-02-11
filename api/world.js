// Vercel Serverless Function for EmojiWorld API
// This file will be transpiled by Vercel

const path = require('path');

// Lazy-load the World class to avoid bundling issues
let World = null;

function getWorld() {
  if (!World) {
    try {
      const worldModule = require(path.join(process.cwd(), 'dist', 'world', 'World'));
      World = worldModule.World;
      
      if (!World) {
        throw new Error('World class not found in module exports');
      }
    } catch (error) {
      console.error('[Module Load] Failed to load World class:', {
        error: error.message,
        stack: error.stack,
        cwd: process.cwd(),
        expectedPath: path.join(process.cwd(), 'dist', 'world', 'World')
      });
      throw new Error(`Failed to load World module: ${error.message}`);
    }
  }
  return World;
}

// In-memory storage for world instances with metadata
const worldInstances = new Map(); // Map<sessionId, { world, createdAt, lastAccessedAt, lastGoodState }>
const sessionLocks = new Map(); // Map<sessionId, boolean> - Prevents concurrent tick operations

// Session configuration
const SESSION_CONFIG = {
  MAX_SESSIONS: 50, // Increased from 10 to 50
  SESSION_TTL_MS: 30 * 60 * 1000, // 30 minutes TTL
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000 // Check for expired sessions every 5 minutes
};

// Track last cleanup time
let lastCleanupTime = Date.now();

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
  try {
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

  // Helper function to perform session cleanup based on TTL
  const performSessionCleanup = () => {
    const now = Date.now();
    
    // Only run cleanup if enough time has passed
    if (now - lastCleanupTime < SESSION_CONFIG.CLEANUP_INTERVAL_MS) {
      return;
    }
    
    lastCleanupTime = now;
    const expiredSessions = [];
    
    for (const [sessionId, sessionData] of worldInstances.entries()) {
      const age = now - sessionData.lastAccessedAt;
      if (age > SESSION_CONFIG.SESSION_TTL_MS) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      worldInstances.delete(sessionId);
      sessionLocks.delete(sessionId);
      console.log(`[Cleanup] Removed expired session: ${sessionId} (TTL exceeded)`);
    }
    
    // Also cleanup by LRU if we exceed max sessions
    if (worldInstances.size > SESSION_CONFIG.MAX_SESSIONS) {
      const sortedSessions = Array.from(worldInstances.entries())
        .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
      
      const sessionsToRemove = worldInstances.size - SESSION_CONFIG.MAX_SESSIONS;
      for (let i = 0; i < sessionsToRemove; i++) {
        const [oldestSessionId] = sortedSessions[i];
        worldInstances.delete(oldestSessionId);
        sessionLocks.delete(oldestSessionId);
        console.log(`[Cleanup] Removed oldest session: ${oldestSessionId} (LRU eviction)`);
      }
    }
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
    
    // Check if session is expired
    const age = Date.now() - sessionData.lastAccessedAt;
    if (age > SESSION_CONFIG.SESSION_TTL_MS) {
      worldInstances.delete(sessionId);
      sessionLocks.delete(sessionId);
      return {
        valid: false,
        errorCode: 'SESSION_EXPIRED',
        message: `Session '${sessionId}' has expired (inactive for ${Math.round(age / 60000)} minutes). Please create a new world.`,
        hint: `Sessions expire after ${SESSION_CONFIG.SESSION_TTL_MS / 60000} minutes of inactivity.`
      };
    }
    
    // Validate world instance health
    if (!sessionData.world || typeof sessionData.world.tick !== 'function') {
      return {
        valid: false,
        errorCode: 'SESSION_CORRUPTED',
        message: 'Session data is corrupted. Please create a new world.',
        hint: 'The world instance may have been damaged during a server restart.'
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
        lastAccessedAt: Date.now(),
        lastGoodState: null // Will store last known good state for recovery
      });
      sessionLocks.set(newSessionId, false); // Initialize lock as unlocked

      // Perform session cleanup
      performSessionCleanup();

      const executionTime = Date.now() - startTime;
      console.log(`[Create] Session created: ${newSessionId}, total sessions: ${worldInstances.size}, execution time: ${executionTime}ms`);

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

    // Check if tick is already in progress (prevent concurrent ticks)
    if (sessionLocks.get(sessionId)) {
      return res.status(429).json({
        error: 'TICK_IN_PROGRESS',
        message: 'A tick operation is already in progress for this session. Please wait.',
        hint: 'Concurrent tick operations are not allowed to prevent race conditions.',
        sessionId
      });
    }

    // Acquire lock
    sessionLocks.set(sessionId, true);

    try {
      const { sessionData } = validation;
      const world = sessionData.world;
    
    // Helper to capture world state snapshot for debugging
    const captureStateSnapshot = () => {
      try {
        let tick = 0;
        let citizens = 0;
        let resources = 0;
        let landmarks = 0;
        
        // Safely get stats
        try {
          const stats = world.getStats ? world.getStats() : {};
          tick = stats.tick || 0;
          citizens = stats.citizens || 0;
          resources = stats.resources || 0;
        } catch (e) {
          // Ignore stats error, try alternative methods
        }
        
        // Fallback to direct method calls
        if (!tick) {
          try {
            tick = world.getTickCount?.() || 0;
          } catch (e) {
            // Ignore
          }
        }
        
        if (!citizens) {
          try {
            const citizensList = world.getCitizens?.();
            citizens = Array.isArray(citizensList) ? citizensList.length : 0;
          } catch (e) {
            // Ignore
          }
        }
        
        if (!resources) {
          try {
            const resourcesList = world.getResources?.();
            resources = Array.isArray(resourcesList) ? resourcesList.length : 0;
          } catch (e) {
            // Ignore
          }
        }
        
        try {
          const landmarksList = world.getLandmarks?.();
          landmarks = Array.isArray(landmarksList) ? landmarksList.length : 0;
        } catch (e) {
          // Ignore
        }
        
        return {
          tick,
          citizens,
          resources,
          landmarks,
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        return { error: 'Failed to capture snapshot', message: e instanceof Error ? e.message : String(e) };
      }
    };

    try {
      // Update last accessed time
      sessionData.lastAccessedAt = Date.now();
      
      // Capture pre-tick state for debugging
      const preTickSnapshot = captureStateSnapshot();
      
      // Validate world state before ticking
      if (!world.getGrid || !world.getCitizens || !world.getResources || !world.getLandmarks) {
        throw new Error('World instance is missing required methods. State may be corrupted.');
      }
      
      const grid = world.getGrid();
      if (!grid || typeof grid.getWidth !== 'function' || typeof grid.getHeight !== 'function') {
        throw new Error('Grid instance is invalid or corrupted.');
      }
      
      // Validate grid dimensions are valid positive numbers
      const width = grid.getWidth();
      const height = grid.getHeight();
      if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
        throw new Error(`Grid dimensions are invalid: width=${width}, height=${height}`);
      }

      // Execute tick with enhanced error handling
      try {
        world.tick();
      } catch (tickError) {
        // Log detailed error context
        console.error('[Tick] Error during world.tick():', {
          error: tickError.message,
          stack: tickError.stack,
          sessionId,
          preTickSnapshot,
          timestamp: new Date().toISOString()
        });
        
        // Try to return last known good state if available
        if (sessionData.lastGoodState) {
          console.log('[Tick] Returning last known good state after error');
          return res.status(200).json({
            ...sessionData.lastGoodState,
            warning: 'RECOVERED_FROM_ERROR',
            warningMessage: 'Simulation encountered an error but recovered using cached state.',
            errorDetails: process.env.NODE_ENV === 'development' ? tickError.message : undefined,
            recoverable: true
          });
        }
        
        // No cached state available, throw error
        throw tickError;
      }

      // Get validated dimensions before creating display grid
      const width = grid.getWidth();
      const height = grid.getHeight();
      const citizens = world.getCitizens();
      const resources = world.getResources();
      const landmarks = world.getLandmarks();
      const stats = world.getStats();
      const events = world.getEvents ? world.getEvents() : [];
      
      // Validate critical arrays
      if (!Array.isArray(citizens)) {
        throw new Error('Citizens data is not an array. World state corrupted.');
      }
      if (!Array.isArray(resources)) {
        throw new Error('Resources data is not an array. World state corrupted.');
      }
      if (!Array.isArray(landmarks)) {
        throw new Error('Landmarks data is not an array. World state corrupted.');
      }

      // Create display grid matching the frontend expectations
      const display = [];
      for (let y = 0; y < height; y++) {
        display[y] = [];
        for (let x = 0; x < width; x++) {
          display[y][x] = ' ';
        }
      }

      // Place landmarks first (base layer) - with bounds checking
      for (const landmark of landmarks) {
        try {
          if (!landmark || !landmark.position) continue;
          const { x, y } = landmark.position;
          if (x >= 0 && x < width && y >= 0 && y < height) {
            display[y][x] = landmark.character;
          }
        } catch (e) {
          console.warn('[Tick] Error placing landmark:', e.message);
        }
      }

      // Place resources (middle layer) - with bounds checking
      for (const resource of resources) {
        try {
          if (!resource || !resource.position || resource.collected) continue;
          const { x, y } = resource.position;
          if (x >= 0 && x < width && y >= 0 && y < height) {
            display[y][x] = resource.character;
          }
        } catch (e) {
          console.warn('[Tick] Error placing resource:', e.message);
        }
      }

      // Place citizens (top layer) - with bounds checking
      for (const citizen of citizens) {
        try {
          if (!citizen || !citizen.position) continue;
          const { x, y } = citizen.position;
          if (x >= 0 && x < width && y >= 0 && y < height) {
            display[y][x] = citizen.emoji;
          }
        } catch (e) {
          console.warn('[Tick] Error placing citizen:', e.message);
        }
      }

      // Collect building and breeding citizens - with error handling
      const buildingCitizens = [];
      const breedingCitizens = [];
      
      try {
        for (const c of citizens) {
          if (c && c.isBuilding && c.position) {
            buildingCitizens.push({ x: c.position.x, y: c.position.y });
          }
          if (c && c.state === 'seeking_mate' && c.breedingPartner && c.position) {
            breedingCitizens.push({ x: c.position.x, y: c.position.y });
          }
        }
      } catch (e) {
        console.warn('[Tick] Error collecting citizen states:', e.message);
      }

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
      
      // Cache this as last known good state
      sessionData.lastGoodState = worldState;

      // Clear events after sending them
      if (world.clearEvents) {
        world.clearEvents();
      }

      if (executionTime > 1000) {
        console.warn(`[Tick] Slow execution: ${executionTime}ms for session ${sessionId}, tick ${stats.tick}`);
      }

      res.status(200).json(worldState);
    } catch (error) {
      const snapshot = captureStateSnapshot();
      logError('Tick World', error);
      
      console.error('[Tick] Critical error context:', {
        sessionId,
        snapshot,
        errorType: error.constructor.name,
        totalSessions: worldInstances.size
      });
      
      res.status(500).json({ 
        error: 'TICK_FAILED',
        message: 'Simulation encountered an error during tick execution', 
        details: error.message,
        sessionId,
        snapshot: snapshot,
        hint: 'The simulation encountered an error. Try resetting the world. If the problem persists, the world state may be corrupted.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        recoverable: false
      });
    } finally {
      // Always release the lock
      sessionLocks.set(sessionId, false);
    }
    return;
  }

  res.status(405).json({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'Method not allowed',
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  });
  } catch (unexpectedError) {
    // Catch any unhandled errors in the entire handler
    console.error('[Handler] Unexpected error:', {
      error: unexpectedError.message,
      stack: unexpectedError.stack,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    
    // Try to send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? unexpectedError.message : 'Please try again later',
        hint: process.env.NODE_ENV === 'development' ? 'Check server logs for details' : undefined
      });
    }
  }
};

