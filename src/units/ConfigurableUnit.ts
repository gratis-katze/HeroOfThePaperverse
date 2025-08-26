import { Unit, UnitType } from './Unit'
import { UnitConfig } from './UnitConfig'
import { GameScene } from '../scenes/GameScene'
import { AnimationManager } from './AnimationManager'
import { AnimationType, AnimationDirection } from './AnimationTypes'

export class ConfigurableUnit extends Unit {
  public config: UnitConfig
  public maxHealth: number
  public currentHealth: number
  public attack: number
  public defense: number
  public attackSpeed: number
  public movementSpeed: number
  public attackRange: number
  public goldOnDeath: number
  public expOnDeath: number
  public hitboxWidth: number
  public hitboxHeight: number
  public hitboxCenterX: number
  public hitboxCenterY: number
  public isMoving: boolean = false
  public target: Unit | null = null
  public lastAttackTime: number = 0
  public killedBy: Unit | null = null
  public currentDirection: AnimationDirection = AnimationDirection.IDLE
  public currentAnimationType: AnimationType = AnimationType.IDLE
  private animationManager: AnimationManager
  public isPlayingDeathAnimation: boolean = false
  private deathAnimationStartTime: number = 0
  private readonly DEATH_ANIMATION_DURATION: number = 1000
  private combatSystem: any | null = null

  private targetX: number = 0
  private targetY: number = 0
  private path: Array<{x: number, y: number}> = []
  private currentPathIndex: number = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    config: UnitConfig
  ) {
    super(scene, x, y, config.texture, name, UnitType.BASIC_UNIT)
    
    this.config = { ...config }
    this.maxHealth = config.health
    this.currentHealth = config.health
    this.attack = config.attack
    this.defense = config.defense
    this.attackSpeed = config.attackSpeed
    this.movementSpeed = config.movementSpeed
    this.attackRange = config.attackRange
    this.goldOnDeath = config.goldOnDeath
    this.expOnDeath = config.expOnDeath
    this.hitboxWidth = config.hitboxWidth || 1
    this.hitboxHeight = config.hitboxHeight || 1
    this.hitboxCenterX = config.hitboxCenterX || 0
    this.hitboxCenterY = config.hitboxCenterY || 0
    
    console.log(`🎯 ConfigurableUnit created with:`, {
      name,
      goldOnDeath: this.goldOnDeath,
      expOnDeath: this.expOnDeath,
      health: this.maxHealth,
      attack: this.attack
    })
    
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDrag(200)
    
    // Apply hitbox dimensions to physics body
    this.updatePhysicsBodySize()
    
    // Initialize animation manager with animation prefix from config
    this.animationManager = new AnimationManager(this.sprite, config.animationPrefix)
    
    // Start with idle animation
    this.animationManager.startIdleAnimation()
    
    this.createHealthBar()
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public update(time: number, _delta: number): void {
    if (this.isPlayingDeathAnimation) {
      this.updateHealthBar(this.currentHealth, this.maxHealth)
      return
    }
    
    // Handle target logic
    if (this.target) {
      const targetInRange = this.isTargetInRange()
      
      if (targetInRange) {
        // Stop moving if we're in range and attack
        if (this.isMoving) {
          // Unit stopping to attack target
          this.isMoving = false
          this.sprite.setVelocity(0, 0)
        }
        this.attackTarget(time)
      } else {
        if (!this.isMoving) {
          this.moveToAttackRange(this.target)
        }
      }
    }
    
    // Handle movement
    if (this.isMoving) {
      this.moveTowardsTarget()
    }
    
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public moveToIsometricPosition(isoX: number, isoY: number): void {
    // Direct movement
    this.targetX = isoX
    this.targetY = isoY
    this.isMoving = true
    
    // Calculate and set direction based on movement
    const deltaX = isoX - this.isometricX
    const deltaY = isoY - this.isometricY
    const direction = this.calculateDirectionFromMovement(deltaX, deltaY)
    this.setAnimation(AnimationType.WALK, direction)
  }

  public followPath(path: Array<{x: number, y: number}>): void {
    if (path.length < 2) {
      return
    }

    this.path = [...path]
    this.currentPathIndex = 1
    this.targetX = this.path[this.currentPathIndex].x
    this.targetY = this.path[this.currentPathIndex].y
    this.isMoving = true
    
    // Set direction for the first movement
    const deltaX = this.targetX - this.isometricX
    const deltaY = this.targetY - this.isometricY
    const direction = this.calculateDirectionFromMovement(deltaX, deltaY)
    this.setAnimation(AnimationType.WALK, direction)
  }

  public setTarget(target: Unit | null): void {
    this.target = target
    if (target && !this.isTargetInRange()) {
      this.moveToAttackRange(target)
    }
  }

  public takeDamage(amount: number, attacker?: Unit): number {
    if (this.isPlayingDeathAnimation) return 0
    
    const actualDamage = Math.max(1, amount - this.defense)
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage)
    this.updateHealthBar(this.currentHealth, this.maxHealth)
    
    // Play take hit animation if unit is still alive
    if (this.currentHealth > 0) {
      this.animationManager.playTakeHitAnimation()
    }
    
    if (this.currentHealth <= 0) {
      if (attacker) {
        this.killedBy = attacker
      }
      this.startDeathAnimation()
    }
    
    return actualDamage
  }

  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
  }

  public isDead(): boolean {
    return this.currentHealth <= 0
  }

  public isReadyForRemoval(): boolean {
    if (!this.isDead()) return false
    if (!this.isPlayingDeathAnimation) return true
    
    const currentTime = this.sprite.scene.time.now
    return currentTime - this.deathAnimationStartTime >= this.DEATH_ANIMATION_DURATION
  }

  public getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth
  }

  public updateConfig(newConfig: UnitConfig): void {
    const healthPercentage = this.getHealthPercentage()
    
    this.config = { ...newConfig }
    this.maxHealth = newConfig.health
    this.currentHealth = Math.floor(newConfig.health * healthPercentage)
    this.attack = newConfig.attack
    this.defense = newConfig.defense
    this.attackSpeed = newConfig.attackSpeed
    this.movementSpeed = newConfig.movementSpeed
    this.attackRange = newConfig.attackRange
    this.goldOnDeath = newConfig.goldOnDeath
    this.expOnDeath = newConfig.expOnDeath
    this.hitboxWidth = newConfig.hitboxWidth || 1
    this.hitboxHeight = newConfig.hitboxHeight || 1
    this.hitboxCenterX = newConfig.hitboxCenterX || 0
    this.hitboxCenterY = newConfig.hitboxCenterY || 0
    
    // Update texture if changed
    if (this.sprite.texture.key !== newConfig.texture) {
      this.sprite.setTexture(newConfig.texture)
    }
    
    // Update animation manager if animation prefix changed
    if (this.config.animationPrefix !== newConfig.animationPrefix) {
      this.animationManager = new AnimationManager(this.sprite, newConfig.animationPrefix)
      this.animationManager.startIdleAnimation()
    }
    
    // Update physics body size if hitbox changed
    this.updatePhysicsBodySize()
    
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  private moveTowardsTarget(): void {
    const screenTargetX = (this.targetX - this.targetY) * 32
    const screenTargetY = (this.targetX + this.targetY) * 16
    
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      screenTargetX, screenTargetY
    )

    // Update isometric position continuously during movement
    if (distance >= 5) {
      this.updateIsometricPositionFromScreen()
    }

    if (distance < 5) {
      this.sprite.setVelocity(0, 0)
      
      const gameScene = this.sprite.scene as GameScene
      const oldX = this.isometricX
      const oldY = this.isometricY
      
      this.isometricX = this.targetX
      this.isometricY = this.targetY
      
      if (gameScene.updateUnitPosition) {
        gameScene.updateUnitPosition(this, oldX, oldY, this.targetX, this.targetY)
      }

      if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
        this.currentPathIndex++
        this.targetX = this.path[this.currentPathIndex].x
        this.targetY = this.path[this.currentPathIndex].y
        
        // Update direction for next movement
        const deltaX = this.targetX - this.isometricX
        const deltaY = this.targetY - this.isometricY
        const direction = this.calculateDirectionFromMovement(deltaX, deltaY)
        this.setAnimation(AnimationType.WALK, direction)
      } else {
        this.isMoving = false
        this.path = []
        this.currentPathIndex = 0
        this.setAnimation(AnimationType.IDLE, this.currentDirection) // Return to idle animation, keep direction
      }
      return
    }

    const scene = this.sprite.scene as Phaser.Scene
    scene.physics.moveTo(this.sprite, screenTargetX, screenTargetY, this.movementSpeed)
  }

  private updateIsometricPositionFromScreen(): void {
    // Convert screen coordinates back to isometric coordinates
    const screenX = this.sprite.x
    const screenY = this.sprite.y
    
    // Reverse of isometric conversion: screenX = (isoX - isoY) * 32, screenY = (isoX + isoY) * 16
    const isoX = (screenX / 32 + screenY / 16) / 2
    const isoY = (screenY / 16 - screenX / 32) / 2
    
    this.isometricX = Math.round(isoX)
    this.isometricY = Math.round(isoY)
  }

  private moveToAttackRange(target: Unit): void {
    const targetPos = target.getIsometricPosition()
    const distance = this.getDistanceToTarget(target)
    
    if (distance > this.attackRange) {
      const direction = Math.atan2(targetPos.y - this.isometricY, targetPos.x - this.isometricX)
      const moveX = Math.floor(targetPos.x - Math.cos(direction) * (this.attackRange - 1))
      const moveY = Math.floor(targetPos.y - Math.sin(direction) * (this.attackRange - 1))
      
      this.moveToIsometricPosition(moveX, moveY)
    }
  }

  private isTargetInRange(): boolean {
    if (!this.target) return false
    const distance = this.getDistanceToTarget(this.target)
    const inRange = distance <= this.attackRange
    
    
    return inRange
  }

  private getDistanceToTarget(target: Unit): number {
    const targetPos = target.getIsometricPosition()
    return Math.abs(this.isometricX - targetPos.x) + Math.abs(this.isometricY - targetPos.y)
  }

  private attackTarget(currentTime: number): void {
    if (!this.target || currentTime - this.lastAttackTime < (1000 / this.attackSpeed)) {
      return
    }

    // Use CombatSystem if available, otherwise fall back to direct damage
    if (this.combatSystem) {
      const selectedAttackType = this.selectBestAvailableAttackType()
      
      if (selectedAttackType) {
        const targetPos = this.target.getIsometricPosition()
        const targetScreenX = (targetPos.x - targetPos.y) * 32
        const targetScreenY = (targetPos.x + targetPos.y) * 16
        
        console.log(`🤖 ${this.name} attacking with ${selectedAttackType} (available: ${Object.keys(this.config.availableAttackTypes).filter(key => this.config.availableAttackTypes[key as keyof typeof this.config.availableAttackTypes].enabled).join(', ')})`)
        
        switch (selectedAttackType) {
          case 'melee':
            this.combatSystem.shootMeleeProjectile(this, targetScreenX, targetScreenY, this.attack)
            break
          case 'ranged':
            this.combatSystem.shootProjectile(this, targetScreenX, targetScreenY, this.attack)
            break
          case 'homing':
            // Use direct target method for AI homing attacks
            this.combatSystem.shootHomingProjectileAtTarget(this, this.target, this.attack)
            break
          default:
            // Fall back to direct damage if attack type is unknown
            this.target.takeDamage(this.attack, this)
            break
        }
      } else {
        // No available attack types, fall back to direct damage
        console.log(`🤖 ${this.name} no available attack types, using direct damage`)
        this.target.takeDamage(this.attack, this)
      }
    } else {
      // Fall back to direct damage if no combat system available
      console.log(`🤖 ${this.name} no combat system available, using direct damage`)
      this.target.takeDamage(this.attack, this)
    }
    
    this.lastAttackTime = currentTime
    this.playAttackAnimation()

    if (this.target instanceof ConfigurableUnit && this.target.isDead()) {
      this.target = null
    }
  }

  private playAttackAnimation(): void {
    this.animationManager.playAttackAnimation()
  }

  public setAnimation(type: AnimationType, direction: AnimationDirection): void {
    this.animationManager.setAnimation(type, direction)
    this.currentDirection = direction
    this.currentAnimationType = type
  }

  public setDirection(direction: AnimationDirection): void {
    this.animationManager.setDirection(direction)
    this.currentDirection = direction
  }

  public setAnimationType(type: AnimationType): void {
    this.animationManager.setAnimationType(type)
    this.currentAnimationType = type
  }

  private calculateDirectionFromMovement(deltaX: number, deltaY: number): AnimationDirection {
    return this.animationManager.calculateDirectionFromMovement(deltaX, deltaY)
  }

  private startDeathAnimation(): void {
    this.isPlayingDeathAnimation = true
    this.deathAnimationStartTime = this.sprite.scene.time.now
    this.isMoving = false
    this.target = null
    
    this.setAnimation(AnimationType.DEATH, this.currentDirection)
    
    this.sprite.setVelocity(0, 0)
  }

  public getConfig(): UnitConfig {
    return { ...this.config }
  }

  public destroy(): void {
    // Clean up animation manager
    if (this.animationManager) {
      this.animationManager.destroy()
    }
    super.destroy()
  }


  public setCombatSystem(combatSystem: any): void {
    this.combatSystem = combatSystem
  }

  private selectBestAvailableAttackType(): string | null {
    const availableAttacks = this.config.availableAttackTypes
    const distanceToTarget = this.target ? this.getDistanceToTarget(this.target) : 0
    
    // Smart attack selection based on distance and availability
    // Priority: Use ranged/homing for medium+ range, melee for close range
    
    if (distanceToTarget > 2) {
      // Prefer ranged attacks for distant targets
      if (availableAttacks.homing && availableAttacks.homing.enabled) {
        return 'homing'
      }
      
      if (availableAttacks.ranged && availableAttacks.ranged.enabled) {
        return 'ranged'
      }
    }
    
    // Close range or no ranged available - prefer melee
    if (availableAttacks.melee && availableAttacks.melee.enabled) {
      return 'melee'
    }
    
    // Fallback to any available attack
    if (availableAttacks.homing && availableAttacks.homing.enabled) {
      return 'homing'
    }
    
    if (availableAttacks.ranged && availableAttacks.ranged.enabled) {
      return 'ranged'
    }
    
    console.warn(`🤖 ${this.name} has no enabled attack types!`)
    return null
  }

  private updatePhysicsBodySize(): void {
    if (this.sprite.body) {
      // Convert isometric tile dimensions to pixel dimensions
      // Standard isometric tile size is 32x16 pixels
      const pixelWidth = this.hitboxWidth * 32
      const pixelHeight = this.hitboxHeight * 16
      
      // Set the size first without center parameters
      this.sprite.body.setSize(pixelWidth, pixelHeight)
      
      // Calculate offset to center the hitbox where we want it
      // The offset is relative to the sprite's top-left corner
      // To center: (spriteWidth - hitboxWidth) / 2 + centerOffset
      const spriteWidth = this.sprite.width
      const spriteHeight = this.sprite.height
      
      const offsetX = (spriteWidth - pixelWidth) / 2 + this.hitboxCenterX
      const offsetY = (spriteHeight - pixelHeight) / 2 + this.hitboxCenterY
      
      // Apply the offset to position the hitbox center
      this.sprite.body.setOffset(offsetX, offsetY)
      
      console.log(`🎯 Updated physics body for ${this.name}:`, {
        hitboxWidth: this.hitboxWidth,
        hitboxHeight: this.hitboxHeight,
        pixelWidth,
        pixelHeight,
        hitboxCenterX: this.hitboxCenterX,
        hitboxCenterY: this.hitboxCenterY,
        spriteSize: { width: spriteWidth, height: spriteHeight },
        calculatedOffset: { x: offsetX, y: offsetY }
      })
    }
  }
}