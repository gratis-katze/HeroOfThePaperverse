import { Unit, UnitType } from './Unit'

export enum StructureType {
  WATER = 'water',
  WALL = 'wall', 
  ROCK = 'rock'
}

export class Structure extends Unit {
  public structureType: StructureType
  public isPassable: boolean
  public providesVision: boolean
  public visionRange: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    structureType: StructureType,
    isPassable: boolean = false
  ) {
    super(scene, x, y, texture, name, UnitType.STRUCTURE)
    
    this.structureType = structureType
    this.isPassable = this.getPassabilityForType(structureType, isPassable)
    this.providesVision = false
    this.visionRange = 0
    
    this.sprite.setImmovable(true)
    
    // Set up physics body for collision detection
    if (this.sprite.body) {
      this.sprite.body.setSize(32, 32) // Make collision box match tile size
      this.sprite.body.enable = true
      
      // For impassable structures, ensure they can collide
      if (!this.isPassable) {
        this.sprite.body.pushable = false
        this.sprite.body.immovable = true
      }
    }
  }

  public update(_time: number, _delta: number): void {
    // Structures don't move or update by default
    // Override in specific structure types if needed
  }

  public canUnitPass(_unit: Unit): boolean {
    if (this.isPassable) return true
    
    // Water blocks are impassable for all units
    if (this.structureType === StructureType.WATER) {
      return false
    }
    
    // Wall and rock blocks are impassable
    return false
  }

  private getPassabilityForType(structureType: StructureType, overridePassable: boolean): boolean {
    // Water is always impassable
    if (structureType === StructureType.WATER) {
      return false
    }
    
    // Wall and rock blocks are impassable by default but can be overridden
    return overridePassable
  }

  public getVisionTiles(): Array<{x: number, y: number}> {
    if (!this.providesVision) return []
    
    const visionTiles: Array<{x: number, y: number}> = []
    const centerX = this.isometricX
    const centerY = this.isometricY
    
    for (let x = centerX - this.visionRange; x <= centerX + this.visionRange; x++) {
      for (let y = centerY - this.visionRange; y <= centerY + this.visionRange; y++) {
        const distance = Math.abs(x - centerX) + Math.abs(y - centerY)
        if (distance <= this.visionRange) {
          visionTiles.push({x, y})
        }
      }
    }
    
    return visionTiles
  }
}