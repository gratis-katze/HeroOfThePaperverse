import { Unit, ConfigurableHero, ConfigurableUnit, Structure } from '../units'

export class UnitManager {
  private units: Array<ConfigurableHero | ConfigurableUnit | Structure> = []
  private structures: Array<Structure> = []
  private occupiedPositions: Map<string, Unit> = new Map()
  private unitCollisionGroup: Phaser.Physics.Arcade.Group
  // Map dimensions are tracked for potential future use but not currently used
  // @ts-ignore - TS6133: intentionally unused for future implementation
  private _mapWidth: number = 100  // Default size, will be updated by GameScene
  // @ts-ignore - TS6133: intentionally unused for future implementation
  private _mapHeight: number = 100

  constructor(_scene: Phaser.Scene, unitCollisionGroup: Phaser.Physics.Arcade.Group, mapWidth: number = 100, mapHeight: number = 100) {
    this.unitCollisionGroup = unitCollisionGroup
    this._mapWidth = mapWidth
    this._mapHeight = mapHeight
    
    console.log(`🗺️ UnitManager initialized with map size: ${mapWidth}x${mapHeight}`)
  }

  public addUnit(unit: ConfigurableHero | ConfigurableUnit | Structure): void {
    this.units.push(unit)
  }

  public addStructure(structure: Structure): void {
    this.structures.push(structure)
    this.addUnit(structure)
  }

  public getUnits(): Array<ConfigurableHero | ConfigurableUnit | Structure> {
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
    // Unit position updated silently
  }

  public registerUnitPosition(unit: Unit, x: number, y: number): void {
    const positionKey = `${x},${y}`
    this.occupiedPositions.set(positionKey, unit)
    // Unit position registered silently for performance
  }

  public removeUnitPosition(unit: Unit, x: number, y: number): void {
    const positionKey = `${x},${y}`
    if (this.occupiedPositions.get(positionKey) === unit) {
      this.occupiedPositions.delete(positionKey)
      // Unit removed from position silently
    }
  }


  public setMapSize(width: number, height: number): void {
    console.log(`🗺️ UnitManager map size updated: ${width}x${height}`)
    this._mapWidth = width
    this._mapHeight = height
    
  }

  public findPathForUnit(unit: Unit, targetX: number, targetY: number, _showDebug: boolean = false): Array<{x: number, y: number}> {
    // Direct movement
    if (this.canUnitMoveTo(unit, targetX, targetY)) {
      return [{ x: unit.isometricX, y: unit.isometricY }, { x: targetX, y: targetY }]
    }
    
    // No path available
    return []
  }

  public cleanupDeadUnits(): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]
      
      // Check if unit is ready for removal (dead + death animation complete)
      const shouldRemove = (unit instanceof ConfigurableUnit && unit.isReadyForRemoval()) ||
                          (unit instanceof ConfigurableHero && unit.isDead())
      
      if (shouldRemove) {
        console.log(`💀 ${unit.name} has died!`)
        
        // Distribute experience to nearby heroes if this unit has expOnDeath value
        let shouldDistributeExp = false
        let unitWithExpReward: Unit & { expOnDeath?: number, expondeath?: number } | null = null
        
        if (unit instanceof ConfigurableUnit && unit.expOnDeath > 0) {
          shouldDistributeExp = true
          unitWithExpReward = unit
        } else if (unit instanceof ConfigurableHero && unit.expOnDeath > 0) {
          shouldDistributeExp = true
          unitWithExpReward = unit
        }
        
        if (shouldDistributeExp && unitWithExpReward) {
          this.distributeExpOnDeath(unitWithExpReward)
        }
        
        // Give gold to hero if a hero killed a configurable unit or configurable hero
        if ((unit instanceof ConfigurableUnit || unit instanceof ConfigurableHero) && unit.killedBy && unit.killedBy instanceof ConfigurableHero && unit.goldOnDeath > 0) {
          unit.killedBy.gainGold(unit.goldOnDeath)
        }
        
        this.removeUnitPosition(unit, unit.isometricX, unit.isometricY)
        this.unitCollisionGroup.remove(unit.sprite)
        unit.destroy()
        
        this.units.splice(i, 1)
      }
    }
  }

  private distributeExpOnDeath(deadUnit: Unit & { expOnDeath?: number, expondeath?: number }): void {
    const expToDistribute = deadUnit.expOnDeath || deadUnit.expondeath || 0
    const expRadius = 80 // Experience distribution radius in isometric tiles (much larger range)
    const nearbyHeroes: ConfigurableHero[] = []
    
    // Find all heroes within the experience radius
    this.units.forEach(unit => {
      if (unit instanceof ConfigurableHero) {
        const distance = Math.abs(unit.isometricX - deadUnit.isometricX) + 
                        Math.abs(unit.isometricY - deadUnit.isometricY)
        if (distance <= expRadius) {
          nearbyHeroes.push(unit)
        }
      }
    })
    
    // Distribute experience equally among nearby heroes
    if (nearbyHeroes.length > 0) {
      const expPerHero = Math.floor(expToDistribute / nearbyHeroes.length)
      nearbyHeroes.forEach(hero => {
        hero.gainExperience(expPerHero)
        console.log(`⭐ ${hero.name} gained ${expPerHero} experience from ${deadUnit.name}'s death`)
      })
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

  // Debug method to test experience distribution
  public debugKillFirstConfigurableUnit(): void {
    const configurableUnit = this.units.find(unit => unit instanceof ConfigurableUnit) as ConfigurableUnit
    if (configurableUnit) {
      console.log(`🧪 DEBUG: Killing ${configurableUnit.name} for experience test`)
      configurableUnit.currentHealth = 0
      this.cleanupDeadUnits()
    } else {
      console.log(`🧪 DEBUG: No configurable units found to kill`)
    }
  }
}