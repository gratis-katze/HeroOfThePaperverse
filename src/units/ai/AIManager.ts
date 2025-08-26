import { ConfigurableUnit } from '../ConfigurableUnit'
import { AIBehavior, AIConfig, DEFAULT_AI_CONFIG } from './AIBehavior'
import { WanderBehavior } from './WanderBehavior'
import { ChaseBehavior } from './ChaseBehavior'

export class AIManager {
  private unit: ConfigurableUnit
  private behaviors: Map<string, AIBehavior> = new Map()
  private config: AIConfig

  constructor(unit: ConfigurableUnit, config?: Partial<AIConfig>) {
    this.unit = unit
    this.config = { 
      ...DEFAULT_AI_CONFIG,
      ...config
    }
    
    this.initializeBehaviors()
  }

  private initializeBehaviors(): void {
    // Initialize wander behavior
    const wanderBehavior = new WanderBehavior(
      this.unit,
      this.config.wander.wanderRadius,
      this.config.wander.wanderInterval
    )
    wanderBehavior.setEnabled(this.config.wander.enabled)
    this.behaviors.set('wander', wanderBehavior)
    
    // Initialize chase behavior
    const chaseBehavior = new ChaseBehavior(
      this.unit,
      this.config.chase.chaseRange,
      this.config.chase.chaseDistance
    )
    chaseBehavior.setEnabled(this.config.chase.enabled)
    this.behaviors.set('chase', chaseBehavior)
    
  }

  public update(time: number, delta: number): void {
    // Update behaviors in priority order (highest priority first)
    // Chase behavior has highest priority, then wander
    const priorityOrder = ['chase', 'wander']
    
    let highPriorityBehaviorActive = false
    
    for (const behaviorName of priorityOrder) {
      const behavior = this.behaviors.get(behaviorName)
      if (behavior && behavior.isEnabled()) {
        // Skip lower priority behaviors if a higher priority one is active
        if (highPriorityBehaviorActive) {
          continue
        }
        
        behavior.update(time, delta)
        
        // Check if this behavior is actively doing something
        let isCurrentlyActive = false
        if (behaviorName === 'chase') {
          const chaseBehavior = behavior as any
          isCurrentlyActive = chaseBehavior.isCurrentlyChasing && chaseBehavior.isCurrentlyChasing()
        } else if (behaviorName === 'wander') {
          // Wander is always considered active when enabled (lowest priority)
          isCurrentlyActive = true
        }
        
        if (isCurrentlyActive) {
          highPriorityBehaviorActive = true
        }
      }
    }
  }

  public setBehaviorEnabled(behaviorName: string, enabled: boolean): void {
    const behavior = this.behaviors.get(behaviorName)
    if (behavior) {
      behavior.setEnabled(enabled)
      
      // Update config
      if (behaviorName === 'wander') {
        this.config.wander.enabled = enabled
      } else if (behaviorName === 'chase') {
        this.config.chase.enabled = enabled
      }
    }
  }

  public isBehaviorEnabled(behaviorName: string): boolean {
    const behavior = this.behaviors.get(behaviorName)
    return behavior?.isEnabled() ?? false
  }

  public getConfig(): AIConfig {
    return { ...this.config }
  }

  public updateConfig(newConfig: Partial<AIConfig>): void {
    console.log(`🔧 AIManager: Updating config for ${this.unit.name}:`, newConfig)
    this.config = { ...this.config, ...newConfig }
    
    // Update wander behavior if config changed
    if (newConfig.wander) {
      const wanderBehavior = this.behaviors.get('wander') as WanderBehavior
      if (wanderBehavior) {
        if (newConfig.wander.wanderRadius !== undefined) {
          wanderBehavior.setWanderRadius(newConfig.wander.wanderRadius)
        }
        if (newConfig.wander.wanderInterval !== undefined) {
          wanderBehavior.setWanderInterval(newConfig.wander.wanderInterval)
        }
        if (newConfig.wander.enabled !== undefined) {
          wanderBehavior.setEnabled(newConfig.wander.enabled)
        }
      }
    }
    
    // Update chase behavior if config changed
    if (newConfig.chase) {
      const chaseBehavior = this.behaviors.get('chase') as ChaseBehavior
      if (chaseBehavior) {
        if (newConfig.chase.chaseRange !== undefined) {
          chaseBehavior.setChaseRange(newConfig.chase.chaseRange)
        }
        if (newConfig.chase.chaseDistance !== undefined) {
          chaseBehavior.setChaseDistance(newConfig.chase.chaseDistance)
        }
        if (newConfig.chase.enabled !== undefined) {
          chaseBehavior.setEnabled(newConfig.chase.enabled)
        }
      }
    }
    
  }

  public getBehavior<T extends AIBehavior>(behaviorName: string): T | null {
    return (this.behaviors.get(behaviorName) as T) || null
  }

  public destroy(): void {
    this.behaviors.clear()
  }
}