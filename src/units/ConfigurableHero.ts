import { Unit, UnitType } from './Unit'
import { UnitConfig, AttackType } from './UnitConfig'
import { GameScene } from '../scenes/GameScene'
import { AnimationManager } from './AnimationManager'
import { AnimationType, AnimationDirection } from './AnimationTypes'
import { deepCloneUnitConfig } from '../utils/ConfigUtils'

export interface HeroStats {
  strength: number
  intelligence: number
  agility: number
}

export class ConfigurableHero extends Unit {
  public config: UnitConfig
  public stats: HeroStats
  public level: number
  public experience: number
  public gold: number
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

  private targetX: number = 0
  private targetY: number = 0
  public path: Array<{x: number, y: number}> = []
  public currentPathIndex: number = 0
  private levelText?: Phaser.GameObjects.Text
  private expCircle?: Phaser.GameObjects.Graphics
  private expBackground?: Phaser.GameObjects.Graphics

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    config: UnitConfig,
    stats: HeroStats
  ) {
    super(scene, x, y, config.texture, name, UnitType.HERO)
    
    // Deep clone config to ensure no shared references
    this.config = deepCloneUnitConfig(config)
    this.stats = { ...stats }
    this.level = 1
    this.experience = 0
    this.gold = 0
    this.maxHealth = this.calculateMaxHealth()
    this.currentHealth = this.maxHealth
    this.attack = config.attack
    this.defense = config.defense
    this.attackSpeed = config.attackSpeed
    this.movementSpeed = this.calculateMovementSpeed()
    this.attackRange = config.attackRange
    this.goldOnDeath = config.goldOnDeath
    this.expOnDeath = config.expOnDeath
    this.hitboxWidth = config.hitboxWidth || 1
    this.hitboxHeight = config.hitboxHeight || 1
    this.hitboxCenterX = config.hitboxCenterX || 0
    this.hitboxCenterY = config.hitboxCenterY || 0
    
    console.log(`🦸 ConfigurableHero created with:`, {
      name,
      level: this.level,
      goldOnDeath: this.goldOnDeath,
      expOnDeath: this.expOnDeath,
      health: this.maxHealth,
      attack: this.attack,
      stats: this.stats
    })
    
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDrag(300)
    
    // Apply hitbox dimensions to physics body
    this.updatePhysicsBodySize()
    
    // Initialize animation manager with animation prefix from config
    this.animationManager = new AnimationManager(this.sprite, config.animationPrefix)
    
    // Start with idle animation
    this.animationManager.startIdleAnimation()
    
    this.createHealthBar()
    this.createLevelDisplay()
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public update(time: number, _delta: number): void {
    if (this.target && this.isTargetInRange()) {
      this.attackTarget(time)
    } else if (this.isMoving) {
      this.moveTowardsTarget()
    }
    this.updateHealthBar(this.currentHealth, this.maxHealth)
    this.updateLevelDisplay()
  }

  public moveToIsometricPosition(isoX: number, isoY: number): void {
    console.log(`🦸 ConfigurableHero move request to (${isoX}, ${isoY})`)
    
    // Direct movement
    this.targetX = isoX
    this.targetY = isoY
    this.isMoving = true
    
    // Calculate and set direction based on movement
    const deltaX = isoX - this.isometricX
    const deltaY = isoY - this.isometricY
    const direction = this.calculateDirectionFromMovement(deltaX, deltaY)
    this.setAnimation(AnimationType.WALK, direction)
    
    console.log(`✅ ConfigurableHero direct movement started to (${isoX}, ${isoY}) walking ${direction}`)
  }

  public followPath(path: Array<{x: number, y: number}>): void {
    console.log(`🦸 ConfigurableHero: followPath called with ${path.length} waypoints`)
    
    if (path.length < 1) {
      console.log(`🦸 ConfigurableHero: Empty path received`)
      return
    }
    
    if (path.length === 1) {
      console.log(`🦸 ConfigurableHero: Single waypoint path, moving directly`)
      this.moveToIsometricPosition(path[0].x, path[0].y)
      return
    }

    console.log(`🦸 ConfigurableHero: Scene check:`, {
      hasSprite: !!this.sprite,
      hasScene: !!this.sprite.scene,
      sceneKey: this.sprite.scene?.scene?.key || 'unknown',
      hasPhysics: !!this.sprite.scene?.physics,
      spriteActive: this.sprite.active,
      spriteVisible: this.sprite.visible
    })

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
    
    console.log(`🦸 ConfigurableHero: Following path with ${path.length} waypoints:`, 
      path.map(p => `(${p.x},${p.y})`).join(' -> '), `walking ${direction}`)
    console.log(`🦸 ConfigurableHero: Starting movement from (${this.isometricX}, ${this.isometricY}) to (${this.targetX}, ${this.targetY})`)
  }

  public setTarget(target: Unit | null): void {
    this.target = target
    if (target) {
      this.moveToAttackRange(target)
    }
  }

  public takeDamage(amount: number, attacker?: Unit): number {
    const actualDamage = Math.max(1, amount - this.defense)
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage)
    this.updateHealthBar(this.currentHealth, this.maxHealth)
    
    // Play take hit animation if unit is still alive
    if (this.currentHealth > 0) {
      this.animationManager.playTakeHitAnimation()
    }
    
    if (this.currentHealth <= 0 && attacker) {
      this.killedBy = attacker
    }
    
    return actualDamage
  }

  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
  }

  public isDead(): boolean {
    return this.currentHealth <= 0
  }

  public getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth
  }

  public gainExperience(amount: number): void {
    if (this.level >= 60) {
      return // Max level reached
    }
    
    this.experience += amount
    console.log(`📈 ${this.name} gained ${amount} exp (${this.experience}/${this.getExpNeeded()})`)
    
    const expNeeded = this.getExpNeeded()
    
    if (this.experience >= expNeeded) {
      this.levelUp()
    } else {
      this.updateExpCircle()
    }
  }

  public gainGold(amount: number): void {
    this.gold += amount
    console.log(`💰 ${this.name} gained ${amount} gold (total: ${this.gold})`)
  }

  public updateConfig(newConfig: UnitConfig): void {
    const healthPercentage = this.getHealthPercentage()
    
    this.config = { ...newConfig }
    this.maxHealth = this.calculateMaxHealth()
    this.currentHealth = Math.floor(this.maxHealth * healthPercentage)
    this.attack = newConfig.attack
    this.defense = newConfig.defense
    this.attackSpeed = newConfig.attackSpeed
    this.movementSpeed = this.calculateMovementSpeed()
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
        
        console.log(`🦸 ConfigurableHero: Moving to next waypoint (${this.targetX}, ${this.targetY}) [${this.currentPathIndex}/${this.path.length - 1}] walking ${direction}`)
      } else {
        this.isMoving = false
        this.path = []
        this.currentPathIndex = 0
        this.setAnimation(AnimationType.IDLE, this.currentDirection)
        console.log(`🦸 ConfigurableHero: Reached destination (${this.targetX}, ${this.targetY}) - returning to idle`)
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
    return this.getDistanceToTarget(this.target) <= this.attackRange
  }

  private getDistanceToTarget(target: Unit): number {
    const targetPos = target.getIsometricPosition()
    return Math.abs(this.isometricX - targetPos.x) + Math.abs(this.isometricY - targetPos.y)
  }

  private attackTarget(currentTime: number): void {
    if (!this.target || currentTime - this.lastAttackTime < (1000 / this.attackSpeed)) {
      return
    }

    // For heroes, we only use the simple damage system in ConfigurableHero
    // Attack type handling should be done by CombatSystem when player attacks
    this.target.takeDamage(this.attack, this)
    this.lastAttackTime = currentTime
    this.playAttackAnimation()

    if (this.target instanceof ConfigurableHero && this.target.isDead()) {
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

  public performAttack(): void {
    this.animationManager.playAttackAnimation()
  }

  private calculateDirectionFromMovement(deltaX: number, deltaY: number): AnimationDirection {
    return this.animationManager.calculateDirectionFromMovement(deltaX, deltaY)
  }

  private calculateMaxHealth(): number {
    return this.config.health + (this.stats.strength * 10) + (this.level * 20)
  }

  private calculateMovementSpeed(): number {
    return this.config.movementSpeed || (150 + (this.stats.agility * 5))
  }

  private getExpNeeded(): number {
    if (this.level === 1) {
      return 50 // First level up needs 50 exp
    }
    // Exponential growth: 50 * (2^(level-1))
    return Math.floor(50 * Math.pow(2, this.level - 1))
  }

  private levelUp(): void {
    if (this.level >= 60) {
      return // Max level reached
    }
    
    const oldLevel = this.level
    this.level++
    this.experience = 0
    this.maxHealth = this.calculateMaxHealth()
    this.currentHealth = this.maxHealth
    this.movementSpeed = this.calculateMovementSpeed()
    this.updateLevelDisplay()
    this.updateExpCircle()
    
    console.log(`🎉 ${this.name} leveled up from ${oldLevel} to ${this.level}! (Next: ${this.getExpNeeded()} exp)`)
  }

  private createLevelDisplay(): void {
    if (!this.levelText) {
      // Create experience background circle (dark)
      this.expBackground = this.sprite.scene.add.graphics()
      this.expBackground.lineStyle(2, 0x444444, 1)
      this.expBackground.strokeCircle(0, 0, 8)
      this.expBackground.setPosition(this.sprite.x - 25, this.sprite.y - 25)
      
      // Create experience progress circle (bright)
      this.expCircle = this.sprite.scene.add.graphics()
      
      // Create level text (centered in circle)
      this.levelText = this.sprite.scene.add.text(
        this.sprite.x - 25,
        this.sprite.y - 25,
        this.level.toString(),
        {
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 1
        }
      )
      this.levelText.setOrigin(0.5, 0.5)
      
      // Make UI camera ignore all elements if it exists
      const scene = this.sprite.scene as any
      if (scene.uiCamera) {
        scene.uiCamera.ignore(this.levelText)
        scene.uiCamera.ignore(this.expCircle)
        scene.uiCamera.ignore(this.expBackground)
      }
      
      this.updateExpCircle()
    }
  }

  private updateLevelDisplay(): void {
    if (this.levelText) {
      this.levelText.setText(this.level.toString())
      this.levelText.setPosition(this.sprite.x - 25, this.sprite.y - 25)
      
      // Update positions of all level display elements
      if (this.expBackground) {
        this.expBackground.setPosition(this.sprite.x - 25, this.sprite.y - 25)
      }
      if (this.expCircle) {
        this.expCircle.setPosition(this.sprite.x - 25, this.sprite.y - 25)
      }
      
      this.updateExpCircle()
    }
  }

  private updateExpCircle(): void {
    if (!this.expCircle) return
    
    this.expCircle.clear()
    
    // Don't show progress for max level
    if (this.level >= 60) return
    
    const expNeeded = this.getExpNeeded()
    const expProgress = this.experience / expNeeded
    const radius = 8
    const startAngle = -Math.PI / 2 // Start at top
    const endAngle = startAngle + (2 * Math.PI * expProgress)
    
    // Draw progress arc in bright color
    this.expCircle.lineStyle(2, 0x00ff00, 1)
    this.expCircle.beginPath()
    this.expCircle.arc(0, 0, radius, startAngle, endAngle)
    this.expCircle.strokePath()
  }

  public getConfig(): UnitConfig {
    return { ...this.config }
  }

  public setActiveAttackType(attackType: AttackType): void {
    const attackKey = attackType as keyof typeof this.config.availableAttackTypes
    if (this.config.availableAttackTypes[attackKey].enabled) {
      this.config.activeAttackType = attackType
      console.log(`🦸 ${this.name} switched to ${attackType} attack`)
    } else {
      console.warn(`🦸 ${this.name} does not have ${attackType} attack available`)
    }
  }

  public getActiveAttackType(): AttackType {
    return this.config.activeAttackType
  }

  public getAvailableAttackTypes(): AttackType[] {
    return Object.keys(this.config.availableAttackTypes)
      .filter(key => this.config.availableAttackTypes[key as keyof typeof this.config.availableAttackTypes].enabled)
      .map(key => key as AttackType)
  }

  public canUseAttackType(attackType: AttackType): boolean {
    const attackKey = attackType as keyof typeof this.config.availableAttackTypes
    return this.config.availableAttackTypes[attackKey].enabled
  }

  public destroy(): void {
    // Clean up animation manager
    if (this.animationManager) {
      this.animationManager.destroy()
    }
    
    if (this.levelText) {
      this.levelText.destroy()
    }
    if (this.expCircle) {
      this.expCircle.destroy()
    }
    if (this.expBackground) {
      this.expBackground.destroy()
    }
    super.destroy()
  }

  // Debug method to test experience gain
  public debugGainExp(amount: number = 10): void {
    console.log(`🧪 DEBUG: Giving ${this.name} ${amount} experience`)
    this.gainExperience(amount)
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
      
      console.log(`🦸 Updated physics body for ${this.name}:`, {
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