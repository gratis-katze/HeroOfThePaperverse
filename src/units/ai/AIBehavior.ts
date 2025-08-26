import { ConfigurableUnit } from '../ConfigurableUnit'

export interface AIConfig {
  wander: {
    enabled: boolean
    wanderRadius: number
    wanderInterval: number
  }
  chase: {
    enabled: boolean
    chaseRange: number
    chaseDistance: number
  }
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  wander: {
    enabled: false,
    wanderRadius: 5,
    wanderInterval: 3000
  },
  chase: {
    enabled: false,
    chaseRange: 3,
    chaseDistance: 8
  },
}

export abstract class AIBehavior {
  protected unit: ConfigurableUnit
  protected enabled: boolean = false

  constructor(unit: ConfigurableUnit) {
    this.unit = unit
  }

  public abstract update(time: number, delta: number): void
  
  public setEnabled(enabled: boolean): void {
    console.log(`🔧 AIBehavior: Setting ${this.constructor.name} enabled to ${enabled} for ${this.unit.name}`)
    this.enabled = enabled
  }

  public isEnabled(): boolean {
    return this.enabled
  }
}