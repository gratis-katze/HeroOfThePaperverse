import Phaser from 'phaser'
import { Structure, BasicUnit, Hero, StructureType, BasicUnitType, CombatStats, HeroStats } from '../../units'
import { TerrainType } from '../../scenes/MapEditorScene'

export class PlacementManager {
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private terrain: Map<string, Phaser.GameObjects.Image> = new Map()
  private structures: Array<Structure> = []
  private units: Array<Hero | BasicUnit> = []
  private placedItems: Map<string, Structure | Hero | BasicUnit> = new Map()
  private readonly ISO_WIDTH = 32
  private readonly ISO_HEIGHT = 16

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
  }

  public placeItem(isoX: number, isoY: number, itemType: 'terrain' | 'block' | 'unit', selectedType: any): void {
    const key = `${isoX},${isoY}`
    
    if (itemType === 'terrain') {
      this.placeTerrain(isoX, isoY, selectedType as TerrainType)
    } else {
      // Remove existing item if present for blocks/units
      if (this.placedItems.has(key)) {
        this.eraseItem(isoX, isoY)
      }
      
      if (itemType === 'block') {
        this.placeBlock(isoX, isoY, selectedType as StructureType)
      } else {
        this.placeUnit(isoX, isoY, selectedType as ('hero' | BasicUnitType))
      }
    }
    
    console.log(`🎨 Placed ${selectedType} at (${isoX}, ${isoY})`)
  }

  private placeBlock(isoX: number, isoY: number, blockType: StructureType): void {
    const textureMap = {
      [StructureType.WATER]: 'water_block',
      [StructureType.WALL]: 'wall_block',
      [StructureType.ROCK]: 'rock_block'
    }
    
    const structure = new Structure(
      this.scene,
      isoX,
      isoY,
      textureMap[blockType],
      `${blockType} Block`,
      blockType
    )
    
    this.structures.push(structure)
    this.placedItems.set(`${isoX},${isoY}`, structure)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
  }

  private placeUnit(isoX: number, isoY: number, unitType: 'hero' | BasicUnitType): void {
    let unit: Hero | BasicUnit
    
    if (unitType === 'hero') {
      const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
      unit = new Hero(this.scene, isoX, isoY, 'hero', 'Editor Hero', heroStats)
    } else {
      const unitStats: CombatStats = this.getDefaultUnitStats(unitType)
      unit = new BasicUnit(this.scene, isoX, isoY, unitType, `Editor ${unitType}`, unitType, unitStats)
    }
    
    this.units.push(unit)
    this.placedItems.set(`${isoX},${isoY}`, unit)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(unit.sprite)
    
    // Make UI camera ignore health bar if it exists
    if (unit.healthBar) {
      this.uiCamera.ignore(unit.healthBar.getContainer())
    }
  }

  private getDefaultUnitStats(unitType: BasicUnitType): CombatStats {
    switch (unitType) {
      case BasicUnitType.WARRIOR:
        return { health: 60, attack: 15, defense: 3, attackSpeed: 1, movementSpeed: 100 }
      case BasicUnitType.ARCHER:
        return { health: 40, attack: 20, defense: 1, attackSpeed: 1.5, movementSpeed: 120 }
      case BasicUnitType.MAGE:
        return { health: 30, attack: 25, defense: 1, attackSpeed: 1.2, movementSpeed: 90 }
      case BasicUnitType.SCOUT:
        return { health: 35, attack: 12, defense: 2, attackSpeed: 2, movementSpeed: 150 }
      default:
        return { health: 50, attack: 15, defense: 2, attackSpeed: 1, movementSpeed: 100 }
    }
  }

  private placeTerrain(isoX: number, isoY: number, terrainType: TerrainType): void {
    const key = `${isoX},${isoY}`
    const screenPos = this.isometricToScreen(isoX, isoY)
    
    // Remove existing terrain if present
    const existingTerrain = this.terrain.get(key)
    if (existingTerrain) {
      existingTerrain.destroy()
    }
    
    const textureMap = {
      [TerrainType.GRASS]: 'grass_terrain',
      [TerrainType.SNOW]: 'snow_terrain',
      [TerrainType.ROCK]: 'rock_terrain',
      [TerrainType.MUD]: 'mud_terrain',
      [TerrainType.SAND]: 'sand_terrain'
    }
    
    const terrainSprite = this.scene.add.image(screenPos.x, screenPos.y, textureMap[terrainType])
    terrainSprite.setDepth(-1000) // Render behind everything else
    this.terrain.set(key, terrainSprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(terrainSprite)
  }
  
  private isometricToScreen(isoX: number, isoY: number): {x: number, y: number} {
    const x = (isoX - isoY) * this.ISO_WIDTH
    const y = (isoX + isoY) * this.ISO_HEIGHT
    return { x, y }
  }

  public eraseItem(isoX: number, isoY: number): void {
    const key = `${isoX},${isoY}`
    
    // Always try to erase terrain first
    const terrain = this.terrain.get(key)
    if (terrain) {
      terrain.destroy()
      this.terrain.delete(key)
      console.log(`🗑️ Erased terrain at (${isoX}, ${isoY})`)
    }
    
    // Then try to erase structures/units
    const item = this.placedItems.get(key)
    if (item) {
      item.destroy()
      this.placedItems.delete(key)
      
      // Remove from appropriate array
      if (item instanceof Structure) {
        const index = this.structures.indexOf(item)
        if (index > -1) this.structures.splice(index, 1)
      } else {
        const index = this.units.indexOf(item as Hero | BasicUnit)
        if (index > -1) this.units.splice(index, 1)
      }
      
      console.log(`🗑️ Erased item at (${isoX}, ${isoY})`)
    }
  }

  public clearAll(): void {
    // Clear terrain
    this.terrain.forEach(terrain => terrain.destroy())
    this.terrain.clear()
    
    // Clear structures and units
    this.placedItems.forEach(item => item.destroy())
    this.placedItems.clear()
    this.structures = []
    this.units = []
    console.log('🧹 Map cleared')
  }

  public getTerrain(): Map<string, Phaser.GameObjects.Image> {
    return this.terrain
  }

  public getStructures(): Array<Structure> {
    return this.structures
  }

  public getUnits(): Array<Hero | BasicUnit> {
    return this.units
  }

  public getPlacedItems(): Map<string, Structure | Hero | BasicUnit> {
    return this.placedItems
  }

  public updateUICamera(): void {
    // Ensure UI camera ignores all health bars
    if (this.uiCamera) {
      [...this.structures, ...this.units].forEach(unit => {
        if (unit && unit.healthBar) {
          this.uiCamera.ignore(unit.healthBar.getContainer())
        }
      })
    }
  }

  public destroy(): void {
    this.clearAll()
  }
}