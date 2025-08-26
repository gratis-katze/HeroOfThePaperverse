import { Unit, UnitType } from './Unit'
import { GameScene } from '../scenes/GameScene'

export interface HeroStats {
  strength: number
  intelligence: number
  agility: number
}

export class Hero extends Unit {
  public stats: HeroStats
  public level: number
  public experience: number
  public maxHealth: number
  public currentHealth: number
  public movementSpeed: number
  public isMoving: boolean = false
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
    stats: HeroStats
  ) {
    super(scene, x, y, texture, name, UnitType.HERO)
    
    this.stats = { ...stats }
    this.level = 1
    this.experience = 0
    this.maxHealth = this.calculateMaxHealth()
    this.currentHealth = this.maxHealth
    this.movementSpeed = this.calculateMovementSpeed()
    
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDrag(300)
    
    this.createHealthBar()
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public moveToIsometricPosition(isoX: number, isoY: number): void {
    console.log(`🦸 Hero move request to (${isoX}, ${isoY})`)
    this.targetX = isoX
    this.targetY = isoY
    this.isMoving = true
    console.log(`✅ Hero movement started to (${isoX}, ${isoY})`)
  }

  public followPath(path: Array<{x: number, y: number}>): void {
    if (path.length < 2) {
      console.log(`🦸 Hero: Invalid path length ${path.length}`)
      return
    }

    this.path = [...path] // Copy the path
    this.currentPathIndex = 1 // Start from second point (first is current position)
    this.targetX = this.path[this.currentPathIndex].x
    this.targetY = this.path[this.currentPathIndex].y
    this.isMoving = true
    
    console.log(`🦸 Hero: Following path with ${path.length} waypoints:`, 
      path.map(p => `(${p.x},${p.y})`).join(' -> '))
  }

  public update(_time: number, _delta: number): void {
    if (this.isMoving) {
      this.moveTowardsTarget()
    }
    this.updateHealthBar(this.currentHealth, this.maxHealth)
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
        console.log(`🦸 Hero: Moving to next waypoint (${this.targetX}, ${this.targetY}) [${this.currentPathIndex}/${this.path.length - 1}]`)
      } else {
        // Path completed or no path
        this.isMoving = false
        this.path = []
        this.currentPathIndex = 0
        console.log(`🦸 Hero: Reached destination (${this.targetX}, ${this.targetY})`)
      }
      return
    }

    const scene = this.sprite.scene as Phaser.Scene
    scene.physics.moveTo(this.sprite, screenTargetX, screenTargetY, this.movementSpeed)
  }

  private calculateMaxHealth(): number {
    return 100 + (this.stats.strength * 10) + (this.level * 20)
  }

  private calculateMovementSpeed(): number {
    return 150 + (this.stats.agility * 5)
  }

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount)
    this.updateHealthBar(this.currentHealth, this.maxHealth)
  }

  public heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount)
  }

  public isDead(): boolean {
    return this.currentHealth <= 0
  }

  public gainExperience(amount: number): void {
    this.experience += amount
    const expNeeded = this.level * 100
    
    if (this.experience >= expNeeded) {
      this.levelUp()
    }
  }

  private levelUp(): void {
    this.level++
    this.experience = 0
    this.maxHealth = this.calculateMaxHealth()
    this.currentHealth = this.maxHealth
    this.movementSpeed = this.calculateMovementSpeed()
  }
}