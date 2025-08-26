import { Unit, UnitType } from './Unit'
import { GameScene } from '../scenes/GameScene'

export interface CombatStats {
  health: number
  attack: number
  defense: number
  attackSpeed: number
  movementSpeed: number
}

export enum BasicUnitType {
  WARRIOR = 'warrior',
  ARCHER = 'archer',
  MAGE = 'mage',
  SCOUT = 'scout'
}

export class BasicUnit extends Unit {
  public basicUnitType: BasicUnitType
  public maxHealth: number
  public currentHealth: number
  public attack: number
  public defense: number
  public attackSpeed: number
  public movementSpeed: number
  public isMoving: boolean = false
  public target: Unit | null = null
  public attackRange: number
  public lastAttackTime: number = 0

  private targetX: number = 0
  private targetY: number = 0
  private path: Array<{x: number, y: number}> = []
  private currentPathIndex: number = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    basicUnitType: BasicUnitType,
    stats: CombatStats
  ) {
    super(scene, x, y, texture, name, UnitType.BASIC_UNIT)
    
    this.basicUnitType = basicUnitType
    this.maxHealth = stats.health
    this.currentHealth = stats.health
    this.attack = stats.attack
    this.defense = stats.defense
    this.attackSpeed = stats.attackSpeed
    this.movementSpeed = stats.movementSpeed
    this.attackRange = this.getAttackRange()
    
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDrag(200)
    
    this.createHealthBar()
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public update(time: number, _delta: number): void {
    if (this.target && this.isTargetInRange()) {
      this.attackTarget(time)
    } else if (this.isMoving) {
      this.moveTowardsTarget()
    }
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public moveToIsometricPosition(isoX: number, isoY: number): void {
    this.targetX = isoX
    this.targetY = isoY
    this.isMoving = true
  }

  public followPath(path: Array<{x: number, y: number}>): void {
    if (path.length < 2) {
      return
    }

    this.path = [...path] // Copy the path
    this.currentPathIndex = 1 // Start from second point (first is current position)
    this.targetX = this.path[this.currentPathIndex].x
    this.targetY = this.path[this.currentPathIndex].y
    this.isMoving = true
  }

  public setTarget(target: Unit | null): void {
    this.target = target
    if (target) {
      this.moveToAttackRange(target)
    }
  }

  public takeDamage(amount: number): number {
    const actualDamage = Math.max(1, amount - this.defense)
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage)
    this.updateHealthBar(this.currentHealth, this.maxHealth)
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

  private moveTowardsTarget(): void {
    const screenTargetX = (this.targetX - this.targetY) * 32
    const screenTargetY = (this.targetX + this.targetY) * 16
    
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      screenTargetX, screenTargetY
    )

    if (distance < 5) {
      this.sprite.setVelocity(0, 0)
      
      // Update position tracking in GameScene
      const gameScene = this.sprite.scene as GameScene
      const oldX = this.isometricX
      const oldY = this.isometricY
      
      this.isometricX = this.targetX
      this.isometricY = this.targetY
      
      if (gameScene.updateUnitPosition) {
        gameScene.updateUnitPosition(this, oldX, oldY, this.targetX, this.targetY)
      }

      // Check if we're following a path
      if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
        // Move to next waypoint
        this.currentPathIndex++
        this.targetX = this.path[this.currentPathIndex].x
        this.targetY = this.path[this.currentPathIndex].y
      } else {
        // Path completed or no path
        this.isMoving = false
        this.path = []
        this.currentPathIndex = 0
      }
      return
    }

    const scene = this.sprite.scene as Phaser.Scene
    scene.physics.moveTo(this.sprite, screenTargetX, screenTargetY, this.movementSpeed)
  }

  private moveToAttackRange(target: Unit): void {
    const targetPos = target.getIsometricPosition()
    const distance = this.getDistanceToTarget(target)
    
    if (distance > this.attackRange) {
      // Move closer to target
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

    // Deal damage based on unit type
    let damage = this.attack
    if (this.target instanceof BasicUnit) {
      damage = Math.max(1, damage - this.target.defense)
      this.target.takeDamage(damage)
    }

    this.lastAttackTime = currentTime
    this.playAttackAnimation()

    // Check if target is dead
    if (this.target instanceof BasicUnit && this.target.isDead()) {
      this.target = null
    }
  }

  private playAttackAnimation(): void {
    // Flash the sprite to indicate attack
    this.sprite.setTint(0xff0000)
    this.sprite.scene.time.delayedCall(100, () => {
      this.sprite.clearTint()
    })
  }

  private getAttackRange(): number {
    switch (this.basicUnitType) {
      case BasicUnitType.ARCHER:
        return 4
      case BasicUnitType.MAGE:
        return 3
      case BasicUnitType.WARRIOR:
        return 1
      case BasicUnitType.SCOUT:
        return 2
      default:
        return 1
    }
  }
}