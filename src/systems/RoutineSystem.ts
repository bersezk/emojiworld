import { Citizen, RoutineState } from '../entities/Citizen';
import { Landmark } from '../entities/Landmark';
import { Position, Grid } from '../world/Grid';

export interface TimeOfDay {
  hour: number;      // 0-23
  minute: number;    // 0-59
  period: 'morning' | 'work' | 'evening' | 'night';
}

export interface RoutineSystemConfig {
  ticksPerHour: number;
  morningStart: number;    // Hour (e.g., 6)
  workStart: number;       // Hour (e.g., 9)
  workEnd: number;         // Hour (e.g., 17)
  eveningEnd: number;      // Hour (e.g., 20)
  nightEnd: number;        // Hour (e.g., 6)
}

export class RoutineSystem {
  private config: RoutineSystemConfig;
  private currentTickCount: number;

  constructor(config?: Partial<RoutineSystemConfig>) {
    // Default configuration
    // Assuming 1 tick = ~1 minute of simulation time
    // So 60 ticks = 1 hour
    this.config = {
      ticksPerHour: 60,
      morningStart: 6,
      workStart: 9,
      workEnd: 17,
      eveningEnd: 20,
      nightEnd: 6,
      ...config
    };
    this.currentTickCount = 0;
  }

  update(citizens: Citizen[], landmarks: Landmark[], tickCount: number): void {
    this.currentTickCount = tickCount;
    const timeOfDay = this.getTimeOfDay(tickCount);

    for (const citizen of citizens) {
      // Skip if detained
      if (citizen.isDetained) {
        citizen.performRoutine('sleeping'); // Detained citizens are considered "sleeping" in cells
        continue;
      }

      // Emergency override - low hunger or energy takes priority
      if (citizen.needs.hunger < 20 || citizen.needs.energy < 20) {
        continue; // Let normal AI handle emergencies
      }

      // Determine routine based on time and employment
      this.updateCitizenRoutine(citizen, timeOfDay, landmarks);
    }
  }

  private getTimeOfDay(tickCount: number): TimeOfDay {
    const totalMinutes = tickCount % (24 * this.config.ticksPerHour);
    const hour = Math.floor(totalMinutes / this.config.ticksPerHour);
    const minute = totalMinutes % this.config.ticksPerHour;

    let period: 'morning' | 'work' | 'evening' | 'night';
    if (hour >= this.config.morningStart && hour < this.config.workStart) {
      period = 'morning';
    } else if (hour >= this.config.workStart && hour < this.config.workEnd) {
      period = 'work';
    } else if (hour >= this.config.workEnd && hour < this.config.eveningEnd) {
      period = 'evening';
    } else {
      period = 'night';
    }

    return { hour, minute, period };
  }

  private updateCitizenRoutine(
    citizen: Citizen,
    timeOfDay: TimeOfDay,
    landmarks: Landmark[]
  ): void {
    const { hour, period } = timeOfDay;

    // Night time - sleep at home
    if (period === 'night') {
      this.handleNightRoutine(citizen, landmarks);
    }
    // Morning - wake up, eat, prepare
    else if (period === 'morning') {
      this.handleMorningRoutine(citizen, landmarks);
    }
    // Work hours - go to work or unemployed activities
    else if (period === 'work') {
      this.handleWorkRoutine(citizen, hour, landmarks);
    }
    // Evening - return home, socialize, relax
    else if (period === 'evening') {
      this.handleEveningRoutine(citizen, landmarks);
    }
  }

  private handleNightRoutine(citizen: Citizen, landmarks: Landmark[]): void {
    citizen.performRoutine('sleeping');
    
    // Seek home for sleeping
    if (citizen.state !== 'seeking_shelter' && citizen.state !== 'resting') {
      const home = this.findNearestHome(citizen.position, landmarks);
      if (home) {
        citizen.target = { ...home.position };
        citizen.state = 'seeking_shelter';
      }
    }

    // Restore energy faster at night
    if (citizen.needs.energy < 100) {
      citizen.needs.energy = Math.min(100, citizen.needs.energy + 0.2);
    }
  }

  private handleMorningRoutine(citizen: Citizen, landmarks: Landmark[]): void {
    citizen.performRoutine('waking_up');
    
    // Check if employed and should prepare for work
    if (citizen.isEmployed() && citizen.job) {
      // If near work time, start preparing
      const currentTime = this.getTimeOfDay(this.currentTickCount);
      const isNearWorkTime = currentTime.hour >= (this.config.workStart - 1);
      
      // Seek resources (breakfast) if hungry
      if (citizen.needs.hunger < 60 && citizen.state !== 'seeking_resource') {
        citizen.state = 'seeking_resource';
      } else if (isNearWorkTime && citizen.needs.hunger >= 50) {
        // Start heading to work if not too hungry
        citizen.performRoutine('commuting_to_work');
      }
    } else {
      // Unemployed morning routine - just wander or socialize
      if (citizen.state !== 'socializing' && Math.random() < 0.3) {
        citizen.state = 'socializing';
      }
    }
  }

  private handleWorkRoutine(citizen: Citizen, currentHour: number, landmarks: Landmark[]): void {
    // Check if citizen is employed
    if (!citizen.isEmployed() || !citizen.job) {
      // Unemployed - wander or look for resources
      citizen.performRoutine('waking_up');
      return;
    }

    const job = citizen.job;

    // Check if it's working hours for this job
    if (job.isWorkingHours(currentHour)) {
      citizen.performRoutine('working');
      
      // Perform job-specific work
      this.performJobWork(citizen, landmarks);
    } else {
      // Not working hours yet or anymore
      citizen.performRoutine('waking_up');
    }
  }

  private handleEveningRoutine(citizen: Citizen, landmarks: Landmark[]): void {
    citizen.performRoutine('evening_activities');
    
    // Evening activities - socialize or return home
    if (citizen.needs.social < 50 && Math.random() < 0.4) {
      citizen.state = 'socializing';
    } else if (citizen.needs.energy < 50) {
      const home = this.findNearestHome(citizen.position, landmarks);
      if (home) {
        citizen.target = { ...home.position };
        citizen.state = 'seeking_shelter';
      }
    } else {
      // Wander around
      if (!citizen.target || Math.random() < 0.1) {
        citizen.state = 'wandering';
      }
    }
  }

  private performJobWork(citizen: Citizen, landmarks: Landmark[]): void {
    const job = citizen.job;
    if (!job) return;

    // Set state to working
    if (citizen.state !== 'working' && citizen.state !== 'detained' && citizen.state !== 'fleeing') {
      citizen.state = 'working';
    }

    switch (job.type) {
      case 'POLICE_OFFICER':
        // Police patrol - handled by PoliceSystem
        // Just ensure they're in working state
        break;

      case 'DOCTOR':
        // Doctors stay at hospitals
        const hospital = landmarks.find(l => 
          l.type === 'town_hall' // Using town hall as hospital for now
        );
        if (hospital && !this.isAtLocation(citizen.position, hospital.position)) {
          citizen.target = { ...hospital.position };
        }
        
        // Heal nearby citizens (increase their energy slightly)
        // This would be handled by a separate healing system
        break;

      case 'FARMER':
        // Farmers work at farms
        const farm = landmarks.find(l => l.type === 'farm');
        if (farm && !this.isAtLocation(citizen.position, farm.position)) {
          citizen.target = { ...farm.position };
        }
        
        // Produce resources at farm
        job.work();
        break;

      case 'MERCHANT':
        // Merchants stay at markets
        const market = landmarks.find(l => l.type === 'market');
        if (market && !this.isAtLocation(citizen.position, market.position)) {
          citizen.target = { ...market.position };
        }
        
        job.work();
        break;

      case 'BUILDER':
        // Builders seek building projects
        if (!citizen.isBuilding && Math.random() < 0.1) {
          citizen.state = 'seeking_resource';
        }
        
        job.work();
        break;

      case 'GOVERNMENT_OFFICIAL':
        // Officials work at government buildings
        const govBuilding = landmarks.find(l => 
          l.isGovernmentBuilding()
        );
        if (govBuilding && !this.isAtLocation(citizen.position, govBuilding.position)) {
          citizen.target = { ...govBuilding.position };
        }
        
        job.work();
        break;
    }

    // Work increases job performance
    if (Math.random() < 0.05) {
      job.updatePerformance(1);
    }
  }

  private findNearestHome(position: Position, landmarks: Landmark[]): Landmark | null {
    const homes = landmarks.filter(l => l.type === 'home');
    if (homes.length === 0) return null;

    let nearest = homes[0];
    let minDist = Grid.distance(position, nearest.position);

    for (const home of homes) {
      const dist = Grid.distance(position, home.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = home;
      }
    }

    return nearest;
  }

  private isAtLocation(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  getTimeOfDayPublic(tickCount: number): TimeOfDay {
    return this.getTimeOfDay(tickCount);
  }

  getCurrentHour(tickCount: number): number {
    return this.getTimeOfDay(tickCount).hour;
  }
}
