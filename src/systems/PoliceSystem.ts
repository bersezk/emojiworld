import { Citizen } from '../entities/Citizen';
import { Landmark } from '../entities/Landmark';
import { Position, Grid } from '../world/Grid';
import { Crime, CRIME_DEFINITIONS } from './CrimeSystem';

export interface PatrolRoute {
  points: Position[];
  currentIndex: number;
}

export interface PoliceOfficer {
  citizen: Citizen;
  patrolRoute: PatrolRoute | null;
  targetCriminal: Citizen | null;
  stationBase: Landmark | null;
}

export interface PoliceSystemConfig {
  detectionRange: number;
  arrestRange: number;
  patrolChangeInterval: number;
  pursuitSpeed: number;
}

export class PoliceSystem {
  private officers: Map<string, PoliceOfficer>;
  private config: PoliceSystemConfig;
  private policeStations: Landmark[];

  constructor(config?: Partial<PoliceSystemConfig>) {
    this.officers = new Map();
    this.policeStations = [];
    
    // Default configuration
    this.config = {
      detectionRange: 8,
      arrestRange: 1,
      patrolChangeInterval: 50,
      pursuitSpeed: 0.8,
      ...config
    };
  }

  update(
    citizens: Citizen[],
    landmarks: Landmark[],
    crimes: Crime[],
    tickCount: number
  ): { arrests: Citizen[], detected: string[] } {
    const arrests: Citizen[] = [];
    const detected: string[] = [];

    // Update police stations list
    this.updatePoliceStations(landmarks);

    // Identify police officers
    this.identifyOfficers(citizens);

    // Update each officer
    for (const [officerId, officer] of this.officers.entries()) {
      const citizen = officer.citizen;

      // Skip if officer is detained or invalid state
      if (citizen.isDetained || !citizen.position) continue;

      // Release from detention if time served
      if (citizen.isDetained && tickCount >= citizen.detentionEndTime) {
        citizen.releaseFromDetention();
      }

      // Check for nearby crimes and criminals
      const nearbyActiveCrimes = this.findNearbyCrimes(citizen, crimes);
      const nearbyCriminals = this.findNearbyCriminals(citizen, citizens);

      // Detect crimes in range
      for (const crime of nearbyActiveCrimes) {
        if (!crime.detected) {
          detected.push(crime.id);
          crime.detected = true;
        }
      }

      // If pursuing a criminal
      if (officer.targetCriminal) {
        const result = this.pursueCriminal(officer, arrests, tickCount);
        if (result === 'arrested') {
          officer.targetCriminal = null;
        } else if (result === 'lost') {
          officer.targetCriminal = null;
        }
      }
      // If no target, check for criminals to pursue
      else if (nearbyCriminals.length > 0) {
        // Choose nearest criminal
        let nearest = nearbyCriminals[0];
        let minDist = Grid.distance(citizen.position, nearest.position);
        
        for (const criminal of nearbyCriminals) {
          const dist = Grid.distance(citizen.position, criminal.position);
          if (dist < minDist) {
            minDist = dist;
            nearest = criminal;
          }
        }
        
        officer.targetCriminal = nearest;
        citizen.state = 'commuting'; // Change to pursuit mode
      }
      // Otherwise, patrol
      else {
        this.patrol(officer, tickCount);
      }
    }

    return { arrests, detected };
  }

  private updatePoliceStations(landmarks: Landmark[]): void {
    this.policeStations = landmarks.filter(l => l.type === 'police_station');
  }

  private identifyOfficers(citizens: Citizen[]): void {
    // Add new police officers
    for (const citizen of citizens) {
      if (citizen.job && citizen.job.type === 'POLICE_OFFICER') {
        if (!this.officers.has(citizen.id)) {
          // Find nearest police station as base
          const station = this.findNearestPoliceStation(citizen.position);
          
          this.officers.set(citizen.id, {
            citizen: citizen,
            patrolRoute: this.generatePatrolRoute(station),
            targetCriminal: null,
            stationBase: station
          });
        }
      }
    }

    // Remove officers who are no longer police
    for (const [id, officer] of this.officers.entries()) {
      if (!officer.citizen.job || officer.citizen.job.type !== 'POLICE_OFFICER') {
        this.officers.delete(id);
      }
    }
  }

  private findNearestPoliceStation(position: Position): Landmark | null {
    if (this.policeStations.length === 0) return null;

    let nearest = this.policeStations[0];
    let minDist = Grid.distance(position, nearest.position);

    for (const station of this.policeStations) {
      const dist = Grid.distance(position, station.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }

    return nearest;
  }

  private generatePatrolRoute(station: Landmark | null): PatrolRoute | null {
    if (!station) return null;

    // Simple patrol: circle around the station
    const center = station.position;
    const radius = 10;
    
    const points: Position[] = [
      { x: center.x + radius, y: center.y },
      { x: center.x + radius, y: center.y + radius },
      { x: center.x, y: center.y + radius },
      { x: center.x - radius, y: center.y + radius },
      { x: center.x - radius, y: center.y },
      { x: center.x - radius, y: center.y - radius },
      { x: center.x, y: center.y - radius },
      { x: center.x + radius, y: center.y - radius }
    ];

    return {
      points,
      currentIndex: 0
    };
  }

  private findNearbyCrimes(officer: Citizen, crimes: Crime[]): Crime[] {
    return crimes.filter(crime => 
      !crime.resolved && 
      Grid.distance(officer.position, crime.location) <= this.config.detectionRange
    );
  }

  private findNearbyCriminals(officer: Citizen, citizens: Citizen[]): Citizen[] {
    return citizens.filter(c => 
      c.id !== officer.id &&
      c.isCriminal && 
      !c.isDetained &&
      Grid.distance(officer.position, c.position) <= this.config.detectionRange
    );
  }

  private pursueCriminal(
    officer: PoliceOfficer, 
    arrests: Citizen[], 
    tickCount: number
  ): 'pursuing' | 'arrested' | 'lost' {
    const cop = officer.citizen;
    const criminal = officer.targetCriminal;

    if (!criminal || criminal.isDetained) {
      return 'lost';
    }

    const distance = Grid.distance(cop.position, criminal.position);

    // Check if in arrest range
    if (distance <= this.config.arrestRange) {
      // Arrest the criminal
      this.arrestCriminal(criminal, tickCount);
      arrests.push(criminal);
      return 'arrested';
    }

    // Pursue - move toward criminal
    cop.target = { ...criminal.position };
    
    // Criminal flees from police
    if (criminal.state !== 'fleeing') {
      criminal.state = 'fleeing';
      // Set target away from police
      const dx = criminal.position.x - cop.position.x;
      const dy = criminal.position.y - cop.position.y;
      criminal.target = {
        x: criminal.position.x + Math.sign(dx) * 5,
        y: criminal.position.y + Math.sign(dy) * 5
      };
    }

    // Lost if too far away
    if (distance > this.config.detectionRange * 2) {
      return 'lost';
    }

    return 'pursuing';
  }

  private arrestCriminal(criminal: Citizen, tickCount: number): void {
    // Determine detention time based on social credit level
    let detentionTime = 100; // Base detention
    
    if (criminal.socialCredit < 100) {
      detentionTime = 200; // Longer for repeat offenders
    } else if (criminal.socialCredit < 200) {
      detentionTime = 150;
    }

    criminal.getArrested(detentionTime, tickCount);
  }

  private patrol(officer: PoliceOfficer, tickCount: number): void {
    const citizen = officer.citizen;
    
    // If no patrol route, create one
    if (!officer.patrolRoute) {
      officer.patrolRoute = this.generatePatrolRoute(officer.stationBase);
    }

    if (!officer.patrolRoute) {
      // Can't patrol without a route, stay at station or wander
      if (officer.stationBase) {
        citizen.target = { ...officer.stationBase.position };
      }
      return;
    }

    // Set target to current patrol point
    const route = officer.patrolRoute;
    const targetPoint = route.points[route.currentIndex];
    citizen.target = { ...targetPoint };
    citizen.state = 'working';

    // Check if reached patrol point
    if (citizen.position.x === targetPoint.x && citizen.position.y === targetPoint.y) {
      // Move to next patrol point
      route.currentIndex = (route.currentIndex + 1) % route.points.length;
    }

    // Periodically change patrol route
    if (tickCount % this.config.patrolChangeInterval === 0) {
      officer.patrolRoute = this.generatePatrolRoute(officer.stationBase);
    }
  }

  registerOfficer(citizen: Citizen): void {
    if (!this.officers.has(citizen.id)) {
      const station = this.findNearestPoliceStation(citizen.position);
      
      this.officers.set(citizen.id, {
        citizen: citizen,
        patrolRoute: this.generatePatrolRoute(station),
        targetCriminal: null,
        stationBase: station
      });
    }
  }

  getOfficers(): PoliceOfficer[] {
    return Array.from(this.officers.values());
  }

  getOfficerCount(): number {
    return this.officers.size;
  }
}
