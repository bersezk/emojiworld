import { Grid, Position } from './Grid';
import { Citizen, CitizenCategory, BUILDING_RECIPES } from '../entities/Citizen';
import { Resource } from '../entities/Resource';
import { Landmark, LandmarkType } from '../entities/Landmark';
import { Government, GovernmentType, Role } from '../entities/Government';
import { Job } from '../entities/Job';
import { CrimeSystem, Crime } from '../systems/CrimeSystem';
import { PoliceSystem } from '../systems/PoliceSystem';
import { RoutineSystem } from '../systems/RoutineSystem';

// Government constants
const CITIZEN_RECRUITMENT_PROBABILITY = 0.3; // 30% chance to join nearby government

export interface WorldEvent {
  type: 'building' | 'birth' | 'government' | 'tax' | 'rebellion' | 'crime' | 'arrest' | 'job_assigned';
  tick: number;
  data: any;
}

export interface WorldConfig {
  world: {
    width: number;
    height: number;
    tickRate: number;
  };
  citizens: {
    initialCount: number;
    emojiCategories: Record<CitizenCategory, string[]>;
    movementSpeed: number;
    visionRange: number;
    needsDecayRate: number;
  };
  landmarks: {
    types: Record<string, string>;
    initialCount: number;
  };
  resources: {
    types: string;
    initialCount: number;
    respawnRate: number;
    maxPerType: number;
  };
  rendering: {
    showStats: boolean;
    clearConsole: boolean;
    frameSkip: number;
  };
}

export class World {
  private grid: Grid;
  private citizens: Citizen[];
  private resources: Resource[];
  private landmarks: Landmark[];
  private governments: Government[];
  private jobs: Job[];
  private config: WorldConfig;
  private tickCount: number;
  private running: boolean;
  private totalBuildings: number;
  private totalBirths: number;
  private events: WorldEvent[];
  
  // New systems
  private crimeSystem: CrimeSystem;
  private policeSystem: PoliceSystem;
  private routineSystem: RoutineSystem;

  constructor(config: WorldConfig) {
    this.config = config;
    this.grid = new Grid(config.world.width, config.world.height);
    this.citizens = [];
    this.resources = [];
    this.landmarks = [];
    this.governments = [];
    this.jobs = [];
    this.tickCount = 0;
    this.running = false;
    this.totalBuildings = 0;
    this.totalBirths = 0;
    this.events = [];
    
    // Initialize systems
    this.crimeSystem = new CrimeSystem();
    this.policeSystem = new PoliceSystem();
    this.routineSystem = new RoutineSystem();
  }

  initialize(): void {
    // Create boundaries
    this.createBoundaries();

    // Create landmarks
    this.createLandmarks();

    // Create resources
    this.createResources();

    // Create citizens
    this.createCitizens();

    // Create initial jobs
    this.createInitialJobs();
  }

  private createBoundaries(): void {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    // Top and bottom borders
    for (let x = 0; x < width; x++) {
      this.landmarks.push(new Landmark({ x, y: 0 }, 'boundary', '#'));
      this.landmarks.push(new Landmark({ x, y: height - 1 }, 'boundary', '#'));
    }

    // Left and right borders
    for (let y = 1; y < height - 1; y++) {
      this.landmarks.push(new Landmark({ x: 0, y }, 'boundary', '#'));
      this.landmarks.push(new Landmark({ x: width - 1, y }, 'boundary', '#'));
    }
  }

  private createLandmarks(): void {
    const count = this.config.landmarks.initialCount;
    const types: LandmarkType[] = ['home', 'market', 'park'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        const char = this.config.landmarks.types[type] || '⌂';
        this.landmarks.push(new Landmark(pos, type, char));
      }
    }
    
    // Create initial government buildings for job system
    // This ensures police stations exist for police officer jobs
    this.createInitialGovernmentBuildings();
  }

  private createInitialGovernmentBuildings(): void {
    // Create one police station
    const policePos = this.getRandomEmptyPosition();
    if (policePos) {
      this.landmarks.push(new Landmark(policePos, 'police_station', '🚓'));
    }
    
    // Create one farm
    const farmPos = this.getRandomEmptyPosition();
    if (farmPos) {
      this.landmarks.push(new Landmark(farmPos, 'farm', '⚘'));
    }
  }

  private createResources(): void {
    const count = this.config.resources.initialCount;
    const types = this.config.resources.types;

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const pos = this.getRandomEmptyPosition();
      if (pos) {
        this.resources.push(new Resource(pos, type));
      }
    }
  }

  private createCitizens(): void {
    const count = this.config.citizens.initialCount;
    const categories = Object.entries(this.config.citizens.emojiCategories);

    for (let i = 0; i < count; i++) {
      const [category, emojis] = categories[i % categories.length];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const pos = this.getRandomEmptyPosition();
      
      if (pos) {
        const citizen = new Citizen(
          `citizen-${i}`,
          emoji,
          pos,
          category as CitizenCategory,
          this.config.citizens.movementSpeed,
          this.config.citizens.visionRange
        );
        this.citizens.push(citizen);
      }
    }
  }

  private createInitialJobs(): void {
    // Assign some initial jobs to citizens
    // We'll assign jobs after police stations and other buildings exist
    
    // Find police stations
    const policeStations = this.landmarks.filter(l => l.type === 'police_station');
    
    // Find farms
    const farms = this.landmarks.filter(l => l.type === 'farm');
    
    // Find markets
    const markets = this.landmarks.filter(l => l.type === 'market');
    
    // Assign police officers if police stations exist
    if (policeStations.length > 0) {
      const unemployedCitizens = this.citizens.filter(c => !c.isEmployed());
      const numPolice = Math.min(2, unemployedCitizens.length);
      
      for (let i = 0; i < numPolice; i++) {
        const citizen = unemployedCitizens[i];
        const station = policeStations[i % policeStations.length];
        const job = new Job('POLICE_OFFICER', station);
        citizen.assignJob(job);
        this.jobs.push(job);
        
        this.events.push({
          type: 'job_assigned',
          tick: this.tickCount,
          data: {
            citizen: citizen.emoji,
            jobType: 'POLICE_OFFICER',
            location: station.position
          }
        });
      }
    }
    
    // Assign farmers if farms exist
    if (farms.length > 0) {
      const unemployedCitizens = this.citizens.filter(c => !c.isEmployed());
      const numFarmers = Math.min(2, unemployedCitizens.length);
      
      for (let i = 0; i < numFarmers; i++) {
        const citizen = unemployedCitizens[i];
        const farm = farms[i % farms.length];
        const job = new Job('FARMER', farm);
        citizen.assignJob(job);
        this.jobs.push(job);
        
        this.events.push({
          type: 'job_assigned',
          tick: this.tickCount,
          data: {
            citizen: citizen.emoji,
            jobType: 'FARMER',
            location: farm.position
          }
        });
      }
    }
    
    // Assign merchants if markets exist
    if (markets.length > 0) {
      const unemployedCitizens = this.citizens.filter(c => !c.isEmployed());
      const numMerchants = Math.min(1, unemployedCitizens.length);
      
      for (let i = 0; i < numMerchants; i++) {
        const citizen = unemployedCitizens[i];
        const market = markets[i % markets.length];
        const job = new Job('MERCHANT', market);
        citizen.assignJob(job);
        this.jobs.push(job);
        
        this.events.push({
          type: 'job_assigned',
          tick: this.tickCount,
          data: {
            citizen: citizen.emoji,
            jobType: 'MERCHANT',
            location: market.position
          }
        });
      }
    }
  }

  private getRandomEmptyPosition(): Position | null {
    const maxAttempts = 100;
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();

    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.floor(Math.random() * (width - 2)) + 1;
      const y = Math.floor(Math.random() * (height - 2)) + 1;
      const pos = { x, y };

      // Check if position is already occupied
      const occupied = this.landmarks.some(l => l.position.x === x && l.position.y === y) ||
                       this.resources.some(r => r.position.x === x && r.position.y === y && !r.collected) ||
                       this.citizens.some(c => c.position.x === x && c.position.y === y);

      if (!occupied) {
        return pos;
      }
    }

    return null;
  }

  tick(): void {
    this.tickCount++;

    // Validate critical state before processing
    if (!this.grid || typeof this.grid.isValidPosition !== 'function' || 
        !Array.isArray(this.citizens) || !Array.isArray(this.resources) || !Array.isArray(this.landmarks)) {
      console.error('[World.tick] Critical state validation failed:', {
        hasGrid: !!this.grid,
        hasIsValidPosition: this.grid && typeof this.grid.isValidPosition === 'function',
        citizensIsArray: Array.isArray(this.citizens),
        resourcesIsArray: Array.isArray(this.resources),
        landmarksIsArray: Array.isArray(this.landmarks),
        tickCount: this.tickCount
      });
      throw new Error('World state is corrupted - missing or invalid core data structures');
    }

    // Update citizens with error handling for each citizen
    for (let i = 0; i < this.citizens.length; i++) {
      const citizen = this.citizens[i];
      
      // Skip invalid citizens
      if (!citizen || !citizen.position) {
        console.warn(`[World.tick] Skipping invalid citizen at index ${i}`);
        continue;
      }
      
      // Validate citizen position is within bounds
      const pos = citizen.position;
      if (!this.grid.isValidPosition(pos)) {
        console.warn(`[World.tick] Citizen ${citizen.id} has invalid position (${pos.x}, ${pos.y}), resetting to safe position`);
        const safePos = this.getRandomEmptyPosition();
        if (safePos) {
          citizen.position = safePos;
        } else {
          continue; // Skip this citizen if we can't find a safe position
        }
      }
      
      try {
        citizen.update(this.grid, {
          citizens: this.citizens,
          resources: this.resources,
          landmarks: this.landmarks
        }, this.tickCount);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.tick] Error updating citizen ${citizen.id}:`, errorMsg);
        // Continue with other citizens rather than failing entire tick
        continue;
      }

      // Check for resource collection with bounds validation
      try {
        const resourcesAtPos = this.resources.filter(
          r => r && !r.collected && r.position && 
               r.position.x === citizen.position.x && 
               r.position.y === citizen.position.y
        );

        for (const resource of resourcesAtPos) {
          if (resource && typeof citizen.collectResource === 'function') {
            citizen.collectResource(resource);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.tick] Error collecting resources for citizen ${citizen.id}:`, errorMsg);
      }

      // Check for completed building with validation
      try {
        if (citizen.buildingTarget && !citizen.isBuilding && citizen.buildingProgress === 0) {
          const recipe = BUILDING_RECIPES[citizen.buildingTarget];
          if (recipe && this.canBuildAt(citizen.position.x, citizen.position.y)) {
            this.addLandmark(new Landmark(
              { x: citizen.position.x, y: citizen.position.y },
              citizen.buildingTarget.toLowerCase() as LandmarkType,
              recipe.symbol
            ));
            this.totalBuildings++;
            
            // Track building event
            this.events.push({
              type: 'building',
              tick: this.tickCount,
              data: {
                building: citizen.buildingTarget,
                symbol: recipe.symbol,
                position: { x: citizen.position.x, y: citizen.position.y },
                citizen: citizen.emoji
              }
            });
          }
          citizen.buildingTarget = null;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.tick] Error processing building for citizen ${citizen.id}:`, errorMsg);
      }

      // Check for breeding opportunity with validation
      try {
        if (citizen.state === 'seeking_mate' && citizen.breedingPartner) {
          const partner = citizen.breedingPartner;
          if (partner && typeof citizen.isNearby === 'function' && 
              citizen.isNearby(partner) && partner.breedingPartner === citizen) {
            // Both want to breed with each other and are nearby
            const offspring = this.createOffspring(citizen, partner);
            if (offspring) {
              this.citizens.push(offspring);
              citizen.breed(partner, this.tickCount);
              this.totalBirths++;
              
              // Track birth event
              this.events.push({
                type: 'birth',
                tick: this.tickCount,
                data: {
                  parents: [citizen.emoji, partner.emoji],
                  offspring: offspring.emoji,
                  position: { x: offspring.position.x, y: offspring.position.y }
                }
              });
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.tick] Error processing breeding for citizen ${citizen.id}:`, errorMsg);
      }
    }

    // Check for government formation near Town Halls with error handling
    try {
      this.checkGovernmentFormation();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error in government formation:', errorMsg);
    }

    // Process governments with error handling
    try {
      this.processGovernments();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error processing governments:', errorMsg);
    }

    // Update routine system
    try {
      this.routineSystem.update(this.citizens, this.landmarks, this.tickCount);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error in routine system:', errorMsg);
    }

    // Update crime system
    try {
      const newCrimes = this.crimeSystem.update(this.citizens, this.landmarks, this.resources, this.tickCount);
      
      // Track crime events
      for (const crime of newCrimes) {
        this.events.push({
          type: 'crime',
          tick: this.tickCount,
          data: {
            crimeType: crime.type,
            criminal: crime.perpetrator.emoji,
            location: crime.location,
            socialCredit: crime.perpetrator.socialCredit
          }
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error in crime system:', errorMsg);
    }

    // Update police system
    try {
      const crimes = this.crimeSystem.getActiveCrimes();
      const { arrests, detected } = this.policeSystem.update(this.citizens, this.landmarks, crimes, this.tickCount);
      
      // Mark detected crimes
      for (const crimeId of detected) {
        this.crimeSystem.detectCrime(crimeId);
      }
      
      // Track arrest events
      for (const arrestedCitizen of arrests) {
        this.events.push({
          type: 'arrest',
          tick: this.tickCount,
          data: {
            criminal: arrestedCitizen.emoji,
            location: arrestedCitizen.position,
            socialCredit: arrestedCitizen.socialCredit
          }
        });
        
        // Resolve associated crimes
        const crimesToResolve = crimes.filter(c => c.perpetrator.id === arrestedCitizen.id);
        for (const crime of crimesToResolve) {
          this.crimeSystem.resolveCrime(crime.id);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error in police system:', errorMsg);
    }

    // Release detained citizens whose time is up
    try {
      for (const citizen of this.citizens) {
        if (citizen.isDetained && this.tickCount >= citizen.detentionEndTime) {
          citizen.releaseFromDetention();
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error releasing detained citizens:', errorMsg);
    }

    // Respawn resources with error handling
    try {
      if (Math.random() < this.config.resources.respawnRate) {
        const collected = this.resources.filter(r => r && r.collected);
        if (collected.length > 0) {
          const resource = collected[Math.floor(Math.random() * collected.length)];
          const newPos = this.getRandomEmptyPosition();
          if (newPos && resource && typeof resource.respawn === 'function') {
            resource.respawn(newPos);
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.tick] Error respawning resources:', errorMsg);
    }
  }

  getGrid(): Grid {
    return this.grid;
  }

  getCitizens(): Citizen[] {
    return this.citizens;
  }

  getResources(): Resource[] {
    return this.resources;
  }

  getLandmarks(): Landmark[] {
    return this.landmarks;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  isRunning(): boolean {
    return this.running;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  getStats(): {
    tick: number;
    citizens: number;
    resources: number;
    resourcesCollected: number;
    buildings: number;
    births: number;
    growthRate: number;
  } {
    return {
      tick: this.tickCount,
      citizens: this.citizens.length,
      resources: this.resources.filter(r => !r.collected).length,
      resourcesCollected: this.resources.filter(r => r.collected).length,
      buildings: this.totalBuildings,
      births: this.totalBirths,
      growthRate: this.tickCount > 0 ? this.totalBirths / this.tickCount : 0
    };
  }

  canBuildAt(x: number, y: number): boolean {
    const pos = { x, y };
    
    // Check if position is valid
    if (!this.grid.isValidPosition(pos)) return false;
    
    // Check if position is already occupied by a landmark
    const occupied = this.landmarks.some(l => 
      l.position.x === x && l.position.y === y
    );
    
    return !occupied;
  }

  addLandmark(landmark: Landmark): void {
    this.landmarks.push(landmark);
  }

  createOffspring(parent1: Citizen, parent2: Citizen): Citizen | null {
    // Find empty adjacent cell
    const offspringPos = this.findEmptyAdjacentCell(parent1.position);
    if (!offspringPos) return null;
    
    // Choose emoji from one of the parents randomly
    const emoji = Math.random() < 0.5 ? parent1.emoji : parent2.emoji;
    
    // Choose category from parents
    const category = Math.random() < 0.5 ? parent1.category : parent2.category;
    
    // Create offspring
    const offspring = new Citizen(
      `citizen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      emoji,
      offspringPos,
      category,
      this.config.citizens.movementSpeed,
      this.config.citizens.visionRange
    );
    
    // Offspring starts with lower energy and higher needs
    offspring.energy = 50;
    offspring.needs.hunger = 30;
    offspring.needs.energy = 50;
    offspring.needs.social = 40;
    offspring.age = 0;
    
    return offspring;
  }

  findEmptyAdjacentCell(position: Position): Position | null {
    const offsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                    { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
    ];
    
    for (const offset of offsets) {
      const pos = { x: position.x + offset.x, y: position.y + offset.y };
      
      if (!this.grid.isValidPosition(pos)) continue;
      
      // Check if position is already occupied
      const occupied = this.landmarks.some(l => l.position.x === pos.x && l.position.y === pos.y && !l.isWalkable()) ||
                       this.citizens.some(c => c.position.x === pos.x && c.position.y === pos.y);
      
      if (!occupied) {
        return pos;
      }
    }
    
    return null;
  }

  findNearbyMates(citizen: Citizen, range: number): Citizen[] {
    return this.citizens.filter(c => 
      c.id !== citizen.id && 
      Grid.distance(citizen.position, c.position) <= range
    );
  }

  getPopulationCount(): number {
    return this.citizens.length;
  }

  getGovernments(): Government[] {
    return this.governments;
  }

  // Government formation check
  private checkGovernmentFormation(): void {
    if (!Array.isArray(this.landmarks) || !Array.isArray(this.citizens) || !Array.isArray(this.governments)) {
      console.warn('[World.checkGovernmentFormation] Invalid state, skipping');
      return;
    }
    
    const townHalls = this.landmarks.filter(l => l && l.type === 'town_hall');
    
    for (const townHall of townHalls) {
      if (!townHall || !townHall.position) continue;
      
      // Check if this town hall already has a government
      const existingGov = this.governments.find(g => 
        g && g.governmentBuildings && g.governmentBuildings.some(b => 
          b && b.position && b.position.x === townHall.position.x && b.position.y === townHall.position.y
        )
      );
      
      if (existingGov) continue;
      
      // Find nearby citizens (within 5 tiles)
      const nearbyCitizens = this.citizens.filter(c => {
        if (!c || !c.position || c.governmentId !== null) return false;
        try {
          const dist = Grid.distance(c.position, townHall.position);
          return dist <= 5;
        } catch (e) {
          return false;
        }
      });
      
      // Need at least 5 citizens to form a government
      if (nearbyCitizens.length >= 5) {
        try {
          this.formGovernment(townHall, nearbyCitizens);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[World.checkGovernmentFormation] Error forming government:', errorMsg);
        }
      }
    }
  }

  private formGovernment(townHall: Landmark, citizens: Citizen[]): void {
    const govId = `gov_${this.governments.length + 1}`;
    const govName = `Government ${this.governments.length + 1}`;
    
    // Randomly choose government type
    const types = [GovernmentType.DEMOCRACY, GovernmentType.MONARCHY, GovernmentType.COUNCIL];
    const govType = types[Math.floor(Math.random() * types.length)];
    
    const government = new Government(govId, govName, govType, this.tickCount);
    government.addBuilding(townHall);
    
    // Select first 5 citizens to join
    for (let i = 0; i < Math.min(5, citizens.length); i++) {
      const citizen = citizens[i];
      if (i === 0) {
        // First citizen becomes leader
        government.setLeader(citizen);
        citizen.joinGovernment(govId, Role.LEADER);
      } else if (i < 3) {
        // Next two become officials
        government.addOfficial(citizen.id);
        citizen.joinGovernment(govId, Role.OFFICIAL);
      } else {
        // Rest are regular citizens
        government.addCitizen(citizen.id);
        citizen.joinGovernment(govId, Role.CITIZEN);
      }
    }
    
    this.governments.push(government);
    
    // Track government formation event
    this.events.push({
      type: 'government',
      tick: this.tickCount,
      data: {
        governmentId: govId,
        governmentName: govName,
        governmentType: govType,
        citizens: government.getCitizenCount(),
        location: { x: townHall.position.x, y: townHall.position.y }
      }
    });
  }

  private processGovernments(): void {
    if (!Array.isArray(this.governments)) {
      console.warn('[World.processGovernments] Governments array is invalid');
      return;
    }
    
    for (const government of this.governments) {
      if (!government) continue;
      
      try {
        // Collect taxes every 100 ticks
        if (this.tickCount % 100 === 0) {
          this.collectTaxes(government);
        }
        
        // Update satisfaction based on services
        if (this.tickCount % 50 === 0) {
          this.updateGovernmentSatisfaction(government);
        }
        
        // Recruit new citizens nearby government buildings
        if (this.tickCount % 200 === 0) {
          this.recruitCitizens(government);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.processGovernments] Error processing government ${government.id}:`, errorMsg);
      }
    }
  }

  private collectTaxes(government: Government): void {
    if (!government || !government.citizens || !Array.isArray(this.citizens)) {
      return;
    }
    
    let totalTaxesCollected = 0;
    for (const citizenId of government.citizens) {
      try {
        const citizen = this.citizens.find(c => c && c.id === citizenId);
        if (!citizen || typeof citizen.payTax !== 'function') continue;
        
        const taxes = citizen.payTax(government.taxRate, this.tickCount);
        if (Array.isArray(taxes)) {
          for (const resource of taxes) {
            if (resource && typeof government.addToTreasury === 'function') {
              government.addToTreasury(resource, 1);
              totalTaxesCollected++;
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.collectTaxes] Error collecting from citizen ${citizenId}:`, errorMsg);
      }
    }
    
    // Track tax collection event if taxes were collected
    if (totalTaxesCollected > 0) {
      this.events.push({
        type: 'tax',
        tick: this.tickCount,
        data: {
          governmentId: government.id,
          governmentName: government.name,
          totalCollected: totalTaxesCollected,
          citizenCount: government.getCitizenCount()
        }
      });
    }
  }

  private updateGovernmentSatisfaction(government: Government): void {
    if (!government || !government.citizens || !Array.isArray(this.citizens) || !Array.isArray(this.landmarks)) {
      return;
    }
    
    try {
      const treasurySize = government.getTreasuryTotal();
      const citizenCount = government.getCitizenCount();
      
      // More resources per citizen = better satisfaction
      const resourcesPerCitizen = citizenCount > 0 ? treasurySize / citizenCount : 0;
      
      if (resourcesPerCitizen > 5) {
        government.updateSatisfaction(2);
      } else if (resourcesPerCitizen < 1) {
        government.updateSatisfaction(-2);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[World.updateGovernmentSatisfaction] Error updating satisfaction:', errorMsg);
    }
    
    // Update individual citizen satisfaction
    for (const citizenId of government.citizens) {
      try {
        const citizen = this.citizens.find(c => c && c.id === citizenId);
        if (!citizen || !citizen.position) continue;
        
        // Roads provide satisfaction
        const onRoad = this.landmarks.some(l => 
          l && typeof l.isRoad === 'function' && l.isRoad() && 
          l.position && l.position.x === citizen.position.x && l.position.y === citizen.position.y
        );
        
        if (onRoad && typeof citizen.receiveGovernmentService === 'function') {
          citizen.receiveGovernmentService();
        }
        
        // Check for rebellion
        if (typeof citizen.shouldRebel === 'function' && citizen.shouldRebel()) {
          citizen.governmentRole = Role.REBEL;
          if (typeof government.removeCitizen === 'function') {
            government.removeCitizen(citizenId);
          }
          
          // Track rebellion event
          this.events.push({
            type: 'rebellion',
            tick: this.tickCount,
            data: {
              citizen: citizen.emoji,
              governmentId: government.id,
              governmentName: government.name,
              position: { x: citizen.position.x, y: citizen.position.y }
            }
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[World.updateGovernmentSatisfaction] Error processing citizen ${citizenId}:`, errorMsg);
      }
    }
  }

  private recruitCitizens(government: Government): void {
    if (!government || !government.governmentBuildings || !Array.isArray(this.citizens)) {
      return;
    }
    
    // Find independent citizens near government buildings
    for (const building of government.governmentBuildings) {
      if (!building || !building.position) continue;
      
      try {
        const nearbyCitizens = this.citizens.filter(c => {
          if (!c || !c.position || c.governmentId !== null) return false;
          try {
            const dist = Grid.distance(c.position, building.position);
            return dist <= 3;
          } catch (e) {
            return false;
          }
        });
        
        for (const citizen of nearbyCitizens) {
          if (Math.random() < CITIZEN_RECRUITMENT_PROBABILITY) {
            if (typeof government.addCitizen === 'function' && typeof citizen.joinGovernment === 'function') {
              government.addCitizen(citizen.id);
              citizen.joinGovernment(government.id, Role.CITIZEN);
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[World.recruitCitizens] Error recruiting near building:', errorMsg);
      }
    }
  }

  // Event tracking methods
  getEvents(): WorldEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  // System access methods
  getCrimeSystem(): CrimeSystem {
    return this.crimeSystem;
  }

  getPoliceSystem(): PoliceSystem {
    return this.policeSystem;
  }

  getRoutineSystem(): RoutineSystem {
    return this.routineSystem;
  }

  getJobs(): Job[] {
    return this.jobs;
  }

  getTimeOfDay(): { hour: number; period: string } {
    const time = this.routineSystem.getTimeOfDayPublic(this.tickCount);
    return { hour: time.hour, period: time.period };
  }
}
