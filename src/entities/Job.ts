import { Position } from '../world/Grid';
import { Landmark } from './Landmark';

export type JobType = 
  | 'POLICE_OFFICER'
  | 'DOCTOR'
  | 'FARMER'
  | 'MERCHANT'
  | 'BUILDER'
  | 'GOVERNMENT_OFFICIAL'
  | 'UNEMPLOYED';

export interface WorkSchedule {
  startHour: number;  // 0-23
  endHour: number;    // 0-23
  workingDays: number[]; // Days of week (0-6), for now always [0-6]
}

export interface JobInfo {
  type: JobType;
  emoji: string;
  salary: number;
  schedule: WorkSchedule;
  description: string;
  workplace: Landmark | null;
}

export const JOB_DEFINITIONS: Record<JobType, Omit<JobInfo, 'workplace'>> = {
  POLICE_OFFICER: {
    type: 'POLICE_OFFICER',
    emoji: '👮',
    salary: 15,
    schedule: { startHour: 9, endHour: 17, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'Enforces law, patrols, arrests criminals'
  },
  DOCTOR: {
    type: 'DOCTOR',
    emoji: '👨‍⚕️',
    salary: 20,
    schedule: { startHour: 8, endHour: 18, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'Heals citizens, increases health'
  },
  FARMER: {
    type: 'FARMER',
    emoji: '🧑‍🌾',
    salary: 10,
    schedule: { startHour: 6, endHour: 14, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'Produces food resources'
  },
  MERCHANT: {
    type: 'MERCHANT',
    emoji: '🧑‍💼',
    salary: 12,
    schedule: { startHour: 9, endHour: 17, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'Trades resources'
  },
  BUILDER: {
    type: 'BUILDER',
    emoji: '🏗️',
    salary: 14,
    schedule: { startHour: 7, endHour: 16, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'Constructs buildings faster'
  },
  GOVERNMENT_OFFICIAL: {
    type: 'GOVERNMENT_OFFICIAL',
    emoji: '🧑‍💻',
    salary: 18,
    schedule: { startHour: 9, endHour: 17, workingDays: [0, 1, 2, 3, 4, 5] },
    description: 'Manages government tasks'
  },
  UNEMPLOYED: {
    type: 'UNEMPLOYED',
    emoji: '',
    salary: 0,
    schedule: { startHour: 0, endHour: 24, workingDays: [0, 1, 2, 3, 4, 5, 6] },
    description: 'No current employment'
  }
};

export class Job {
  public type: JobType;
  public emoji: string;
  public salary: number;
  public schedule: WorkSchedule;
  public description: string;
  public workplace: Landmark | null;
  public performance: number; // 0-100, affects salary and satisfaction
  public hoursWorked: number;

  constructor(type: JobType, workplace: Landmark | null = null) {
    const definition = JOB_DEFINITIONS[type];
    this.type = type;
    this.emoji = definition.emoji;
    this.salary = definition.salary;
    this.schedule = { ...definition.schedule };
    this.description = definition.description;
    this.workplace = workplace;
    this.performance = 70; // Start with average performance
    this.hoursWorked = 0;
  }

  isWorkingHours(currentHour: number): boolean {
    const { startHour, endHour } = this.schedule;
    
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Handle overnight shifts (e.g., 22-6)
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  updatePerformance(delta: number): void {
    this.performance = Math.max(0, Math.min(100, this.performance + delta));
  }

  getEffectiveSalary(): number {
    // Performance affects salary (50% to 150% of base)
    const multiplier = 0.5 + (this.performance / 100);
    return Math.floor(this.salary * multiplier);
  }

  work(): void {
    this.hoursWorked++;
    
    // Small chance of performance change based on random events
    if (Math.random() < 0.1) {
      const change = Math.random() < 0.7 ? 1 : -1;
      this.updatePerformance(change);
    }
  }

  getWorkplacePosition(): Position | null {
    return this.workplace?.position || null;
  }
}
