import { Citizen } from './Citizen';
import { Landmark } from './Landmark';
import { Position } from '../world/Grid';

export enum GovernmentType {
  DEMOCRACY = 'democracy',
  MONARCHY = 'monarchy',
  COUNCIL = 'council',
  ANARCHY = 'anarchy'
}

export enum Role {
  LEADER = 'leader',
  OFFICIAL = 'official',
  CITIZEN = 'citizen',
  REBEL = 'rebel',
  INDEPENDENT = 'independent'
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  effects: {
    taxRate?: number;
    roadBuildingSpeed?: number;
    resourceDistribution?: boolean;
    breedingRestriction?: boolean;
  };
}

export interface Law {
  id: string;
  name: string;
  description: string;
  enacted: number; // Tick when enacted
}

export class Government {
  public id: string;
  public name: string;
  public type: GovernmentType;
  public leader: Citizen | null;
  public officials: Set<string>; // Citizen IDs
  public citizens: Set<string>; // Citizen IDs
  public territory: Position[];
  
  // Resources
  public treasury: Map<string, number>;
  public taxRate: number;
  
  // Policies
  public policies: Policy[];
  public laws: Law[];
  
  // Buildings
  public governmentBuildings: Landmark[];
  public publicRoads: Landmark[];
  
  // Stats
  public founded: number;
  public satisfaction: number;
  public corruption: number;

  constructor(id: string, name: string, type: GovernmentType, founded: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.leader = null;
    this.officials = new Set();
    this.citizens = new Set();
    this.territory = [];
    
    this.treasury = new Map();
    this.taxRate = 0.15; // Default 15% tax rate
    
    this.policies = [];
    this.laws = [];
    
    this.governmentBuildings = [];
    this.publicRoads = [];
    
    this.founded = founded;
    this.satisfaction = 70; // Start with moderate satisfaction
    this.corruption = 10; // Start with low corruption
  }

  addCitizen(citizenId: string): void {
    this.citizens.add(citizenId);
  }

  removeCitizen(citizenId: string): void {
    this.citizens.delete(citizenId);
    this.officials.delete(citizenId);
  }

  addOfficial(citizenId: string): void {
    this.officials.add(citizenId);
    this.citizens.add(citizenId);
  }

  setLeader(citizen: Citizen): void {
    this.leader = citizen;
    this.addOfficial(citizen.id);
  }

  addToTreasury(resource: string, amount: number): void {
    const current = this.treasury.get(resource) || 0;
    this.treasury.set(resource, current + amount);
  }

  removeFromTreasury(resource: string, amount: number): boolean {
    const current = this.treasury.get(resource) || 0;
    if (current >= amount) {
      this.treasury.set(resource, current - amount);
      return true;
    }
    return false;
  }

  getTreasuryTotal(): number {
    let total = 0;
    for (const amount of this.treasury.values()) {
      total += amount;
    }
    return total;
  }

  addBuilding(landmark: Landmark): void {
    if (landmark.isGovernmentBuilding()) {
      this.governmentBuildings.push(landmark);
    } else if (landmark.isRoad()) {
      this.publicRoads.push(landmark);
    }
  }

  updateSatisfaction(delta: number): void {
    this.satisfaction = Math.max(0, Math.min(100, this.satisfaction + delta));
  }

  updateCorruption(delta: number): void {
    this.corruption = Math.max(0, Math.min(100, this.corruption + delta));
  }

  setTaxRate(rate: number): void {
    this.taxRate = Math.max(0, Math.min(1, rate));
    
    // High taxes reduce satisfaction
    if (rate > 0.4) {
      this.updateSatisfaction(-5);
    } else if (rate < 0.05) {
      this.updateSatisfaction(2);
    }
  }

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    
    // Apply policy effects
    if (policy.effects.taxRate !== undefined) {
      this.setTaxRate(policy.effects.taxRate);
    }
  }

  addLaw(law: Law): void {
    this.laws.push(law);
  }

  getCitizenCount(): number {
    return this.citizens.size;
  }

  getOfficialCount(): number {
    return this.officials.size;
  }

  getRoadCount(): number {
    return this.publicRoads.length;
  }
}
