import { AIBehavior } from './AIBehavior'
import { ConfigurableUnit } from '../ConfigurableUnit'
import { ConfigurableHero } from '../ConfigurableHero'

export class ChaseBehavior extends AIBehavior {
  private chaseRange: number
  private chaseDistance: number
  private currentTarget: ConfigurableHero | null = null
  private originalX: number
  private originalY: number
  private isChasing: boolean = false
  private lastUpdateTime: number = 0
  private readonly updateInterval: number = 1000 // Update every 1000ms instead of every frame

  constructor(unit: ConfigurableUnit, chaseRange: number = 3, chaseDistance: number = 8) {
    super(unit)
    
    // Remember original position
    const pos = unit.getIsometricPosition()
    this.originalX = pos.x
    this.originalY = pos.y
    
    this.chaseRange = chaseRange
    this.chaseDistance = chaseDistance
  }

  public update(time: number, _delta: number): void {
    if (!this.enabled) {
      return
    }
    
    // Don't chase if unit already has a combat target
    if (this.unit.target) {
      return
    }
    
    // Only update at specified intervals for performance
    const shouldUpdate = time - this.lastUpdateTime >= this.updateInterval
    
    if (!this.currentTarget || !this.isValidTarget(this.currentTarget)) {
      // Stop chasing if we had a target but lost it
      if (this.isChasing) {
        this.stopChasing()
      }
      // Look for heroes to chase (only at update intervals)
      if (shouldUpdate) {
        this.findNearbyHero()
        this.lastUpdateTime = time
      }
    }
    
    if (this.currentTarget) {
      const distanceToTarget = this.getDistanceToUnit(this.currentTarget)
      const distanceFromHome = this.getDistanceFromHome()
      
      // Stop chasing if we've gone too far from home
      if (distanceFromHome > this.chaseDistance) {
        this.stopChasing()
        this.returnHome()
        return
      }
      
      // Only update chase logic at intervals, but allow immediate chasing if target is very close
      if (shouldUpdate || (distanceToTarget <= this.chaseRange + 1)) {
        // Chase the target if within range and not already moving
        if (distanceToTarget <= this.chaseRange + 2 && !this.unit.isMoving) {
          this.chaseTarget()
        } else if (distanceToTarget > this.chaseRange + 3) {
          // Target moved too far, stop chasing
          this.stopChasing()
        }
        
        if (shouldUpdate) {
          this.lastUpdateTime = time
        }
      }
    }
  }

  private findNearbyHero(): void {
    // Get scene and find heroes through UnitManager
    const scene = this.unit.sprite.scene as any
    if (!scene.unitManager) {
      return
    }
    
    const myPos = this.unit.getIsometricPosition()
    const allUnits = scene.unitManager.getUnits()
    
    for (const unit of allUnits) {
      // Look for ConfigurableHero instances
      if (unit instanceof ConfigurableHero && !unit.isDead()) {
        const heroPos = unit.getIsometricPosition()
        const distance = Math.abs(myPos.x - heroPos.x) + Math.abs(myPos.y - heroPos.y)
        
        if (distance <= this.chaseRange) {
          console.log(`👁️ ${this.unit.name} spotted hero ${unit.name}`)
          this.currentTarget = unit
          this.isChasing = true
          break
        }
      }
    }
  }

  private chaseTarget(): void {
    if (!this.currentTarget) return
    
    const targetPos = this.currentTarget.getIsometricPosition()
    
    // Move towards the target
    this.unit.moveToIsometricPosition(targetPos.x, targetPos.y)
  }

  private isValidTarget(target: ConfigurableHero): boolean {
    return target && !target.isDead() && this.getDistanceToUnit(target) <= this.chaseRange + 3
  }

  private getDistanceToUnit(target: ConfigurableHero): number {
    const myPos = this.unit.getIsometricPosition()
    const targetPos = target.getIsometricPosition()
    return Math.abs(myPos.x - targetPos.x) + Math.abs(myPos.y - targetPos.y)
  }

  private getDistanceFromHome(): number {
    const myPos = this.unit.getIsometricPosition()
    return Math.abs(myPos.x - this.originalX) + Math.abs(myPos.y - this.originalY)
  }

  private stopChasing(): void {
    this.currentTarget = null
    this.isChasing = false
  }

  private returnHome(): void {
    const distanceFromHome = this.getDistanceFromHome()
    if (distanceFromHome > 1) {
      this.unit.moveToIsometricPosition(this.originalX, this.originalY)
    }
  }

  public setChaseRange(range: number): void {
    this.chaseRange = range
  }

  public setChaseDistance(distance: number): void {
    this.chaseDistance = distance
  }

  public getHomePosition(): { x: number, y: number } {
    return { x: this.originalX, y: this.originalY }
  }

  public isCurrentlyChasing(): boolean {
    return this.isChasing
  }
}