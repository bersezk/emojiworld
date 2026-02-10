import { Citizen } from '../entities/Citizen';
import { Landmark } from '../entities/Landmark';
import { Resource } from '../entities/Resource';
import { Position, Grid } from '../world/Grid';
import { Role } from '../entities/Government';

export type CrimeType = 'THEFT' | 'VANDALISM' | 'ASSAULT' | 'TRESPASSING' | 'TAX_EVASION';

export interface Crime {
  id: string;
  type: CrimeType;
  perpetrator: Citizen;
  location: Position;
  tick: number;
  detected: boolean;
  resolved: boolean;
}

export interface CrimeDefinition {
  type: CrimeType;
  emoji: string;
  socialCreditPenalty: number;
  detentionTime: number;
  description: string;
}

export const CRIME_DEFINITIONS: Record<CrimeType, CrimeDefinition> = {
  THEFT: {
    type: 'THEFT',
    emoji: '💰',
    socialCreditPenalty: 50,
    detentionTime: 100,
    description: 'Stealing resources from others'
  },
  VANDALISM: {
    type: 'VANDALISM',
    emoji: '💥',
    socialCreditPenalty: 80,
    detentionTime: 150,
    description: 'Destroying buildings'
  },
  ASSAULT: {
    type: 'ASSAULT',
    emoji: '⚔️',
    socialCreditPenalty: 100,
    detentionTime: 200,
    description: 'Attacking other citizens'
  },
  TRESPASSING: {
    type: 'TRESPASSING',
    emoji: '🚫',
    socialCreditPenalty: 20,
    detentionTime: 50,
    description: 'Entering restricted areas'
  },
  TAX_EVASION: {
    type: 'TAX_EVASION',
    emoji: '📜',
    socialCreditPenalty: 40,
    detentionTime: 80,
    description: 'Not paying taxes'
  }
};

export interface CrimeSystemConfig {
  crimeCheckInterval: number;
  theftProbabilityUnemployed: number;
  theftProbabilityLowSatisfaction: number;
  vandalismProbability: number;
  assaultProbability: number;
  trespassingProbability: number;
}

export class CrimeSystem {
  private crimes: Crime[];
  private config: CrimeSystemConfig;
  private crimeIdCounter: number;

  constructor(config?: Partial<CrimeSystemConfig>) {
    this.crimes = [];
    this.crimeIdCounter = 0;
    
    // Default configuration
    this.config = {
      crimeCheckInterval: 10,
      theftProbabilityUnemployed: 0.02,
      theftProbabilityLowSatisfaction: 0.01,
      vandalismProbability: 0.005,
      assaultProbability: 0.003,
      trespassingProbability: 0.01,
      ...config
    };
  }

  update(
    citizens: Citizen[], 
    landmarks: Landmark[], 
    resources: Resource[], 
    tickCount: number
  ): Crime[] {
    const newCrimes: Crime[] = [];

    // Check each citizen for potential crimes
    if (tickCount % this.config.crimeCheckInterval === 0) {
      for (const citizen of citizens) {
        // Skip if detained or already criminal fleeing
        if (citizen.isDetained || citizen.state === 'fleeing') continue;

        const crime = this.evaluateCrimeBehavior(citizen, citizens, landmarks, resources, tickCount);
        if (crime) {
          newCrimes.push(crime);
          this.crimes.push(crime);
        }
      }
    }

    // Update social credit for good behavior over time
    this.updateSocialCreditDecay(citizens, tickCount);

    // Clean up resolved crimes (older than 500 ticks)
    this.crimes = this.crimes.filter(c => !c.resolved || (tickCount - c.tick) < 500);

    return newCrimes;
  }

  private evaluateCrimeBehavior(
    citizen: Citizen,
    allCitizens: Citizen[],
    landmarks: Landmark[],
    resources: Resource[],
    tickCount: number
  ): Crime | null {
    // Higher chance of crime with low satisfaction and no job
    const isUnemployed = !citizen.isEmployed();
    const lowSatisfaction = citizen.satisfaction < 30;
    const hasLowCredit = citizen.socialCredit < 300;

    // Theft - more likely if unemployed or low satisfaction
    if (isUnemployed || lowSatisfaction) {
      const theftProb = isUnemployed 
        ? this.config.theftProbabilityUnemployed 
        : this.config.theftProbabilityLowSatisfaction;
      
      if (Math.random() < theftProb) {
        return this.commitTheft(citizen, resources, tickCount);
      }
    }

    // Vandalism - when very dissatisfied
    if (citizen.satisfaction < 20 && Math.random() < this.config.vandalismProbability) {
      return this.commitVandalism(citizen, landmarks, tickCount);
    }

    // Assault - rare, when desperate
    if (citizen.satisfaction < 15 && Math.random() < this.config.assaultProbability) {
      return this.commitAssault(citizen, allCitizens, tickCount);
    }

    // Trespassing - more common, less severe
    if (hasLowCredit && Math.random() < this.config.trespassingProbability) {
      return this.commitTrespassing(citizen, landmarks, tickCount);
    }

    return null;
  }

  private commitTheft(citizen: Citizen, resources: Resource[], tickCount: number): Crime | null {
    // Find nearby uncollected resources
    const nearbyResources = resources.filter(r => 
      !r.collected && Grid.distance(citizen.position, r.position) <= 3
    );

    if (nearbyResources.length > 0) {
      const definition = CRIME_DEFINITIONS.THEFT;
      citizen.commitCrime(definition.type, definition.socialCreditPenalty);
      
      return {
        id: `crime-${this.crimeIdCounter++}`,
        type: 'THEFT',
        perpetrator: citizen,
        location: { ...citizen.position },
        tick: tickCount,
        detected: false,
        resolved: false
      };
    }
    
    return null;
  }

  private commitVandalism(citizen: Citizen, landmarks: Landmark[], tickCount: number): Crime | null {
    // Find nearby non-government buildings
    const nearbyBuildings = landmarks.filter(l => 
      !l.isGovernmentBuilding() && 
      l.type !== 'boundary' &&
      Grid.distance(citizen.position, l.position) <= 2
    );

    if (nearbyBuildings.length > 0) {
      const definition = CRIME_DEFINITIONS.VANDALISM;
      citizen.commitCrime(definition.type, definition.socialCreditPenalty);
      
      return {
        id: `crime-${this.crimeIdCounter++}`,
        type: 'VANDALISM',
        perpetrator: citizen,
        location: { ...citizen.position },
        tick: tickCount,
        detected: false,
        resolved: false
      };
    }
    
    return null;
  }

  private commitAssault(citizen: Citizen, allCitizens: Citizen[], tickCount: number): Crime | null {
    // Find nearby citizens
    const nearbyCitizens = allCitizens.filter(c => 
      c.id !== citizen.id && 
      Grid.distance(citizen.position, c.position) <= 1
    );

    if (nearbyCitizens.length > 0) {
      const definition = CRIME_DEFINITIONS.ASSAULT;
      citizen.commitCrime(definition.type, definition.socialCreditPenalty);
      
      // Victim loses satisfaction
      const victim = nearbyCitizens[0];
      victim.updateGovernmentSatisfaction(-10);
      
      return {
        id: `crime-${this.crimeIdCounter++}`,
        type: 'ASSAULT',
        perpetrator: citizen,
        location: { ...citizen.position },
        tick: tickCount,
        detected: false,
        resolved: false
      };
    }
    
    return null;
  }

  private commitTrespassing(citizen: Citizen, landmarks: Landmark[], tickCount: number): Crime | null {
    // Check if in a government building location
    const atGovernmentBuilding = landmarks.some(l => 
      l.isGovernmentBuilding() && 
      l.position.x === citizen.position.x && 
      l.position.y === citizen.position.y
    );

    if (atGovernmentBuilding && citizen.governmentRole === Role.INDEPENDENT) {
      const definition = CRIME_DEFINITIONS.TRESPASSING;
      citizen.commitCrime(definition.type, definition.socialCreditPenalty);
      
      return {
        id: `crime-${this.crimeIdCounter++}`,
        type: 'TRESPASSING',
        perpetrator: citizen,
        location: { ...citizen.position },
        tick: tickCount,
        detected: false,
        resolved: false
      };
    }
    
    return null;
  }

  private updateSocialCreditDecay(citizens: Citizen[], tickCount: number): void {
    // Every 100 ticks, update social credit
    if (tickCount % 100 !== 0) return;

    for (const citizen of citizens) {
      // Good behavior slowly increases credit
      if (!citizen.isCriminal && citizen.satisfaction > 60) {
        citizen.updateSocialCredit(1);
      }

      // Being detained slowly restores credit
      if (citizen.isDetained) {
        citizen.updateSocialCredit(0.5);
      }

      // Model citizens get bonus
      if (citizen.isModelCitizen()) {
        citizen.satisfaction = Math.min(100, citizen.satisfaction + 1);
      }
    }
  }

  getCrimes(): Crime[] {
    return this.crimes;
  }

  getActiveCrimes(): Crime[] {
    return this.crimes.filter(c => !c.resolved);
  }

  resolveCrime(crimeId: string): void {
    const crime = this.crimes.find(c => c.id === crimeId);
    if (crime) {
      crime.resolved = true;
    }
  }

  detectCrime(crimeId: string): void {
    const crime = this.crimes.find(c => c.id === crimeId);
    if (crime) {
      crime.detected = true;
    }
  }
}
