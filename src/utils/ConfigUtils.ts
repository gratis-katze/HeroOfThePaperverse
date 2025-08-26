import { UnitConfig } from '../units/UnitConfig'

/**
 * Deep clones a UnitConfig to ensure no shared object references
 */
export function deepCloneUnitConfig(config: UnitConfig): UnitConfig {
  return {
    // Basic attributes
    health: config.health,
    attack: config.attack,
    defense: config.defense,
    attackSpeed: config.attackSpeed,
    movementSpeed: config.movementSpeed,
    attackRange: config.attackRange,
    
    // Combat attributes - deep clone attack types
    availableAttackTypes: {
      melee: { ...config.availableAttackTypes.melee },
      ranged: { ...config.availableAttackTypes.ranged },
      homing: { ...config.availableAttackTypes.homing }
    },
    activeAttackType: config.activeAttackType,
    
    // Economic attributes
    goldOnDeath: config.goldOnDeath,
    expOnDeath: config.expOnDeath,
    
    // Visual attributes
    animationPrefix: config.animationPrefix,
    texture: config.texture,
    
    // Physical attributes
    hitboxWidth: config.hitboxWidth,
    hitboxHeight: config.hitboxHeight,
    hitboxCenterX: config.hitboxCenterX,
    hitboxCenterY: config.hitboxCenterY,
    
    // Optional hero-specific attributes
    strength: config.strength,
    intelligence: config.intelligence,
    agility: config.agility,
    
    // AI configuration - deep clone nested AI config
    ai: config.ai ? {
      wander: config.ai.wander ? {
        enabled: config.ai.wander.enabled,
        wanderRadius: config.ai.wander.wanderRadius,
        wanderInterval: config.ai.wander.wanderInterval
      } : undefined,
      chase: config.ai.chase ? {
        enabled: config.ai.chase.enabled,
        chaseRange: config.ai.chase.chaseRange,
        chaseDistance: config.ai.chase.chaseDistance
      } : undefined
    } : undefined
  }
}