import { Unit, Hero, BasicUnit, Structure } from '../units'
import { Pathfinding, PathfindingGrid } from '../utils/Pathfinding'

export class UnitManager implements PathfindingGrid {
  private units: Array<Hero | BasicUnit | Structure> = []
  private structures: Array<Structure> = []
  private occupiedPositions: Map<string, Unit> = new Map()
  private pathfinding: Pathfinding
  private unitCollisionGroup: Phaser.Physics.Arcade.Group

  constructor(_scene: Phaser.Scene, unitCollisionGroup: Phaser.Physics.Arcade.Group) {
    this.unitCollisionGroup = unitCollisionGroup
    this.pathfinding = new Pathfinding(this)
  }

  public addUnit(unit: Hero | BasicUnit | Structure): void {
    this.units.push(unit)
  }

  public addStructure(structure: Structure): void {
    this.structures.push(structure)
    this.addUnit(structure)
  }

  public getUnits(): Array<Hero | BasicUnit | Structure> {
    return this.units
  }

  public getStructures(): Array<Structure> {
    return this.structures
  }

  public canUnitMoveTo(unit: Unit, targetX: number, targetY: number): boolean {
    const positionKey = `${targetX},${targetY}`
    const occupyingUnit = this.occupiedPositions.get(positionKey)
    
    // Check if position is already occupied by another unit
    if (occupyingUnit && occupyingUnit !== unit) {
      console.log(`❌ Position (${targetX}, ${targetY}) occupied by ${occupyingUnit.name}`)
      return false
    }
    
    // Check if any structure blocks this position
    for (const structure of this.structures) {
      if (structure.isometricX === targetX && structure.isometricY === targetY) {
        const canPass = structure.canUnitPass(unit)
        if (!canPass) {
          console.log(`🚧 BLOCKED: ${structure.structureType} at (${targetX}, ${targetY})`)
        }
        return canPass
      }
    }
    
    return true
  }

  public updateUnitPosition(unit: Unit, oldX: number, oldY: number, newX: number, newY: number): void {
    // Remove from old position
    const oldKey = `${oldX},${oldY}`
    if (this.occupiedPositions.get(oldKey) === unit) {
      this.occupiedPositions.delete(oldKey)
    }
    
    // Add to new position
    const newKey = `${newX},${newY}`
    this.occupiedPositions.set(newKey, unit)
    console.log(`📍 Unit ${unit.name} moved from (${oldX}, ${oldY}) to (${newX}, ${newY})`)
  }

  public registerUnitPosition(unit: Unit, x: number, y: number): void {
    const positionKey = `${x},${y}`
    this.occupiedPositions.set(positionKey, unit)
    const screenX = (x - y) * 32
    const screenY = (x + y) * 16
    console.log(`📍 Unit ${unit.name} registered at iso(${x}, ${y}) screen(${screenX}, ${screenY}) sprite(${Math.round(unit.sprite.x)}, ${Math.round(unit.sprite.y)})`)
  }

  public removeUnitPosition(unit: Unit, x: number, y: number): void {
    const positionKey = `${x},${y}`
    if (this.occupiedPositions.get(positionKey) === unit) {
      this.occupiedPositions.delete(positionKey)
      console.log(`📍 Unit ${unit.name} removed from position (${x}, ${y})`)
    }
  }

  // PathfindingGrid interface implementation
  public isPassable(x: number, y: number): boolean {
    const positionKey = `${x},${y}`
    const occupyingUnit = this.occupiedPositions.get(positionKey)
    
    // Check if position is occupied by another unit
    if (occupyingUnit) {
      return false
    }
    
    // Check if any structure blocks this position
    for (const structure of this.structures) {
      if (structure.isometricX === x && structure.isometricY === y) {
        // For pathfinding, we consider all impassable structures as blocked
        return structure.isPassable
      }
    }
    
    return true
  }

  public findPathForUnit(unit: Unit, targetX: number, targetY: number): Array<{x: number, y: number}> {
    return this.pathfinding.findPath(unit.isometricX, unit.isometricY, targetX, targetY)
  }

  public cleanupDeadUnits(): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]
      if ((unit instanceof BasicUnit || unit instanceof Hero) && unit.isDead()) {
        console.log(`💀 ${unit.name} has died!`)
        
        this.removeUnitPosition(unit, unit.isometricX, unit.isometricY)
        this.unitCollisionGroup.remove(unit.sprite)
        unit.destroy()
        
        this.units.splice(i, 1)
      }
    }
  }

  public updateUnits(time: number, delta: number, uiCamera: Phaser.Cameras.Scene2D.Camera): void {
    // Ensure UI camera ignores all health bars
    if (uiCamera) {
      this.units.forEach(unit => {
        if (unit && unit.healthBar) {
          uiCamera.ignore(unit.healthBar.getContainer())
        }
      })
    }

    this.units.forEach(unit => {
      if (unit && typeof unit.update === 'function') {
        unit.update(time, delta)
      }
    })
  }

  public reset(): void {
    this.units = []
    this.structures = []
    this.occupiedPositions.clear()
  }

  public destroy(): void {
    this.reset()
  }
}