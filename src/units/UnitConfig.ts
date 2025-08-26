export enum AttackType {
  MELEE = 'melee',
  RANGED = 'ranged', 
  HOMING = 'homing'
}

export interface AttackTypeConfig {
  enabled: boolean
  damage?: number // Optional override for this attack type's damage
  range?: number // Optional override for this attack type's range
}

export interface UnitConfig {
  // Basic attributes
  health: number
  attack: number
  defense: number
  attackSpeed: number
  movementSpeed: number
  attackRange: number
  
  // Combat attributes - attack types available to this unit
  availableAttackTypes: {
    melee: AttackTypeConfig
    ranged: AttackTypeConfig
    homing: AttackTypeConfig
  }
  activeAttackType: AttackType // Currently selected attack type for heroes
  
  // Economic attributes
  goldOnDeath: number
  expOnDeath: number
  
  // Visual attributes
  animationPrefix: string // The prefix used for animation keys (e.g. 'hero', 'warrior', etc.)
  texture: string
  
  // Physical attributes
  hitboxWidth?: number // Width of the hitbox in isometric tiles (default: 1)
  hitboxHeight?: number // Height of the hitbox in isometric tiles (default: 1)
  hitboxCenterX?: number // X offset of hitbox center from sprite center in pixels (default: 0)
  hitboxCenterY?: number // Y offset of hitbox center from sprite center in pixels (default: 0)
  
  // Optional hero-specific attributes
  strength?: number
  intelligence?: number
  agility?: number
}

const createDefaultAttackTypes = (activeType: AttackType): UnitConfig['availableAttackTypes'] => ({
  melee: { enabled: activeType === AttackType.MELEE },
  ranged: { enabled: activeType === AttackType.RANGED },
  homing: { enabled: activeType === AttackType.HOMING }
})

export const DEFAULT_UNIT_CONFIG: UnitConfig = {
  health: 50,
  attack: 15,
  defense: 2,
  attackSpeed: 1,
  movementSpeed: 100,
  attackRange: 1,
  availableAttackTypes: createDefaultAttackTypes(AttackType.MELEE),
  activeAttackType: AttackType.MELEE,
  goldOnDeath: 5,
  expOnDeath: 10,
  animationPrefix: 'warrior',
  texture: 'warrior',
  hitboxWidth: 1,
  hitboxHeight: 1,
  hitboxCenterX: 0,
  hitboxCenterY: 0
}

export const SAMURAI_UNIT_CONFIG: UnitConfig = {
  health: 80,
  attack: 25,
  defense: 5,
  attackSpeed: 1.2,
  movementSpeed: 120,
  attackRange: 1,
  availableAttackTypes: createDefaultAttackTypes(AttackType.MELEE),
  activeAttackType: AttackType.MELEE,
  goldOnDeath: 15,
  expOnDeath: 25,
  animationPrefix: 'samurai',
  texture: 'samurai_idle',
  
  // Hero-specific attributes for enhanced samurai
  strength: 20,
  intelligence: 10,
  agility: 15
}

export const SKELETON_UNIT_CONFIG: UnitConfig = {
  health: 40,
  attack: 12,
  defense: 1,
  attackSpeed: 1.0,
  movementSpeed: 90,
  attackRange: 1,
  availableAttackTypes: createDefaultAttackTypes(AttackType.MELEE),
  activeAttackType: AttackType.MELEE,
  goldOnDeath: 8,
  expOnDeath: 15,
  animationPrefix: 'skeleton',
  texture: 'skeleton_idle'
}

export const FLYING_EYE_UNIT_CONFIG: UnitConfig = {
  health: 30,
  attack: 8,
  defense: 0,
  attackSpeed: 1.5,
  movementSpeed: 110,
  attackRange: 2,
  availableAttackTypes: createDefaultAttackTypes(AttackType.RANGED),
  activeAttackType: AttackType.RANGED,
  goldOnDeath: 5,
  expOnDeath: 12,
  animationPrefix: 'flying_eye',
  texture: 'flying_eye_flight'
}

export const GOBLIN_UNIT_CONFIG: UnitConfig = {
  health: 45,
  attack: 14,
  defense: 2,
  attackSpeed: 1.2,
  movementSpeed: 95,
  attackRange: 1,
  availableAttackTypes: createDefaultAttackTypes(AttackType.MELEE),
  activeAttackType: AttackType.MELEE,
  goldOnDeath: 10,
  expOnDeath: 18,
  animationPrefix: 'goblin',
  texture: 'goblin_idle'
}

export const MUSHROOM_UNIT_CONFIG: UnitConfig = {
  health: 60,
  attack: 10,
  defense: 3,
  attackSpeed: 0.8,
  movementSpeed: 70,
  attackRange: 1,
  availableAttackTypes: createDefaultAttackTypes(AttackType.MELEE),
  activeAttackType: AttackType.MELEE,
  goldOnDeath: 12,
  expOnDeath: 20,
  animationPrefix: 'mushroom',
  texture: 'mushroom_idle'
}

export const EVIL_WIZARD_UNIT_CONFIG: UnitConfig = {
  health: 120,
  attack: 35,
  defense: 4,
  attackSpeed: 1.5,
  movementSpeed: 85,
  attackRange: 3,
  availableAttackTypes: createDefaultAttackTypes(AttackType.HOMING),
  activeAttackType: AttackType.HOMING,
  goldOnDeath: 25,
  expOnDeath: 40,
  animationPrefix: 'evil_wizard',
  texture: 'evil_wizard_idle',
  
  // Hero-specific attributes for powerful wizard
  strength: 12,
  intelligence: 25,
  agility: 18
}

// All available textures for ConfigurableUnits - includes both static and animated options
export const AVAILABLE_TEXTURES = [
  // Hero animations (full directional set)
  { key: 'hero_idle', name: 'Hero (Animated)', animationPrefix: 'hero' },
  
  // Samurai animations (single direction with multiple animations)
  { key: 'samurai_idle', name: 'Samurai (Animated)', animationPrefix: 'samurai' },
  
  // Skeleton animations 
  { key: 'skeleton_idle', name: 'Skeleton (Animated)', animationPrefix: 'skeleton' },
  
  // Flying Eye animations
  { key: 'flying_eye_flight', name: 'Flying Eye (Animated)', animationPrefix: 'flying_eye' },
  
  // Goblin animations
  { key: 'goblin_idle', name: 'Goblin (Animated)', animationPrefix: 'goblin' },
  
  // Mushroom animations
  { key: 'mushroom_idle', name: 'Mushroom (Animated)', animationPrefix: 'mushroom' },
  
  // Evil Wizard animations
  { key: 'evil_wizard_idle', name: 'Evil Wizard (Animated)', animationPrefix: 'evil_wizard' },
  
  // Basic unit textures  
  { key: 'warrior', name: 'Warrior', animationPrefix: 'warrior' },
  { key: 'archer', name: 'Archer', animationPrefix: 'archer' },
  { key: 'mage', name: 'Mage', animationPrefix: 'mage' },
  { key: 'scout', name: 'Scout', animationPrefix: 'scout' },
  
  // Additional texture variations (if they exist)
  { key: 'warrior_red', name: 'Red Warrior', animationPrefix: 'warrior' },
  { key: 'warrior_blue', name: 'Blue Warrior', animationPrefix: 'warrior' },
  { key: 'archer_green', name: 'Green Archer', animationPrefix: 'archer' },
  { key: 'mage_purple', name: 'Purple Mage', animationPrefix: 'mage' },
  
  // Basic isometric shapes (fallbacks)
  { key: 'cube_red', name: 'Red Cube', animationPrefix: 'basic' },
  { key: 'cube_blue', name: 'Blue Cube', animationPrefix: 'basic' },
  { key: 'cube_green', name: 'Green Cube', animationPrefix: 'basic' }
] as const

// Available animation types
export const AVAILABLE_ANIMATIONS = [
  'idle',
  'walk',
  'attack', 
  'death',
  'take_hit'
] as const

export type TextureOption = typeof AVAILABLE_TEXTURES[number]
export type AnimationType = typeof AVAILABLE_ANIMATIONS[number]