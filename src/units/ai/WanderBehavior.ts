import { AIBehavior } from './AIBehavior'
import { ConfigurableUnit } from '../ConfigurableUnit'

export class WanderBehavior extends AIBehavior {
  private spawnX: number
  private spawnY: number
  private wanderRadius: number
  private wanderInterval: number
  private lastWanderTime: number = 0
  constructor(unit: ConfigurableUnit, wanderRadius: number = 5, wanderInterval: number = 3000) {
    super(unit)
    
    // Remember spawn point
    const spawnPos = unit.getIsometricPosition()
    this.spawnX = spawnPos.x
    this.spawnY = spawnPos.y
    
    this.wanderRadius = wanderRadius
    this.wanderInterval = wanderInterval
  }

  public update(time: number, _delta: number): void {
    if (!this.enabled) return
    
    // Don't wander if unit already has a combat target or is moving
    if (this.unit.target || this.unit.isMoving) return
    
    // Check if it's time to wander
    if (time - this.lastWanderTime >= this.wanderInterval) {
      this.startWandering()
      this.lastWanderTime = time
    }
  }

  private startWandering(): void {
    // Generate random point within wander radius of spawn point
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * this.wanderRadius
    
    const targetX = this.spawnX + Math.cos(angle) * distance
    const targetY = this.spawnY + Math.sin(angle) * distance
    
    // Round to integer tile positions
    const roundedX = Math.round(targetX)
    const roundedY = Math.round(targetY)
    
    this.unit.moveToIsometricPosition(roundedX, roundedY)
  }

  public setWanderRadius(radius: number): void {
    this.wanderRadius = radius
  }

  public setWanderInterval(interval: number): void {
    this.wanderInterval = interval
  }

  public getSpawnPoint(): { x: number, y: number } {
    return { x: this.spawnX, y: this.spawnY }
  }
}