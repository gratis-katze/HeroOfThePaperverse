import Phaser from 'phaser'
import { Structure, ConfigurableUnit, ConfigurableHero, StructureType, UnitConfig, HeroStats } from '../../units'
import { TerrainType } from '../../scenes/MapEditorScene'
import { UnitConfigModal } from './UnitConfigModal'

export class PlacementManager {
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private terrain: Map<string, Phaser.GameObjects.Image> = new Map()
  private structures: Array<Structure> = []
  private units: Array<ConfigurableUnit | ConfigurableHero> = []
  private placedItems: Map<string, Structure | ConfigurableUnit | ConfigurableHero> = new Map()
  private unitConfigModal: UnitConfigModal
  private readonly ISO_WIDTH = 32
  private readonly ISO_HEIGHT = 16

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
    this.unitConfigModal = UnitConfigModal.getInstance(scene, uiCamera)
    // PlacementManager using UnitConfigModal singleton
  }

  public placeItem(isoX: number, isoY: number, itemType: 'terrain' | 'block' | 'unit', selectedType: any): void {
    const key = `${isoX},${isoY}`
    
    // Placing item
    
    if (itemType === 'terrain') {
      this.placeTerrain(isoX, isoY, selectedType as TerrainType)
    } else {
      // Remove existing item if present for blocks/units
      if (this.placedItems.has(key)) {
        this.eraseItem(isoX, isoY)
      }
      
      if (itemType === 'block') {
        this.placeBlock(isoX, isoY, selectedType as StructureType)
      } else if (itemType === 'unit') {
        // Showing unit config modal
        this.showUnitConfigModal(isoX, isoY, selectedType)
      }
    }
    
    // Item placed
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
    
    // Set depth for blocks (above terrain, below units)
    structure.sprite.setDepth(50 + isoX + isoY)
    
    this.structures.push(structure)
    this.placedItems.set(`${isoX},${isoY}`, structure)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
  }

  private showUnitConfigModal(isoX: number, isoY: number, unitType: string): void {
    // Showing unit config modal
    
    // Check if trying to place a hero when one already exists
    if (unitType === 'configurableHero') {
      const existingHeroes = this.units.filter(u => u instanceof ConfigurableHero)
      if (existingHeroes.length > 0) {
        console.warn('⚠️ Cannot place multiple heroes - only one hero allowed per map')
        // Could show an alert to the user here
        return
      }
    }
    
    // Get modal instance with updated scene references
    // Getting modal instance with updated scene references
    this.unitConfigModal = UnitConfigModal.getInstance(this.scene, this.uiCamera)
    
    // Calling modal.show()
    this.unitConfigModal.show(
      (config: UnitConfig) => {
        // Confirm callback triggered
        if (unitType === 'configurableHero') {
          this.placeConfigurableHero(isoX, isoY, config)
        } else {
          this.placeConfigurableUnit(isoX, isoY, config)
        }
      },
      () => {
        // Cancel callback triggered
        this.cancelUnitPlacement()
      }
    )
    // modal.show() called successfully
  }

  private placeConfigurableUnit(isoX: number, isoY: number, config: UnitConfig): void {
    // Placing configurable unit
    
    const unit = new ConfigurableUnit(
      this.scene,
      isoX,
      isoY,
      'Custom Unit',
      config
    )
    
    // Disable world bounds collision for editor - units should be placeable anywhere
    unit.sprite.setCollideWorldBounds(false)
    
    // Set appropriate depth for units (higher than terrain, blocks)
    unit.sprite.setDepth(100 + isoX + isoY)
    
    this.units.push(unit)
    this.placedItems.set(`${isoX},${isoY}`, unit)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(unit.sprite)
    
    // Make UI camera ignore health bar if it exists
    if (unit.healthBar) {
      this.uiCamera.ignore(unit.healthBar.getContainer())
    }
    
    // Successfully placed configurable unit
  }

  private placeConfigurableHero(isoX: number, isoY: number, config: UnitConfig): void {
    // Placing configurable hero
    
    // Default hero stats for configurable heroes
    const defaultStats: HeroStats = {
      strength: 10,
      intelligence: 10,
      agility: 10
    }
    
    const hero = new ConfigurableHero(
      this.scene,
      isoX,
      isoY,
      'Custom Hero',
      config,
      defaultStats
    )
    
    // Disable world bounds collision for editor - units should be placeable anywhere
    hero.sprite.setCollideWorldBounds(false)
    
    // Set appropriate depth for units (higher than terrain, blocks)
    hero.sprite.setDepth(100 + isoX + isoY)
    
    this.units.push(hero)
    this.placedItems.set(`${isoX},${isoY}`, hero)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(hero.sprite)
    
    // Make UI camera ignore health bar if it exists
    if (hero.healthBar) {
      this.uiCamera.ignore(hero.healthBar.getContainer())
    }
    
    // Make UI camera ignore level display elements
    if ((hero as any).levelText) {
      this.uiCamera.ignore((hero as any).levelText)
    }
    if ((hero as any).expCircle) {
      this.uiCamera.ignore((hero as any).expCircle)
    }
    if ((hero as any).expBackground) {
      this.uiCamera.ignore((hero as any).expBackground)
    }
    
    // Successfully placed configurable hero
  }

  private cancelUnitPlacement(): void {
    // Unit placement cancelled
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

  public editItem(isoX: number, isoY: number): void {
    const key = `${isoX},${isoY}`
    
    // Check if there's a configurable unit or hero at this location
    const item = this.placedItems.get(key)
    if (item && (item instanceof ConfigurableUnit || item instanceof ConfigurableHero)) {
      // Editing unit/hero
      
      // Get the current configuration
      const currentConfig = item.getConfig()
      
      // Show the unit config modal with current values pre-filled
      this.unitConfigModal = UnitConfigModal.getInstance(this.scene, this.uiCamera)
      this.unitConfigModal.show(
        (newConfig: UnitConfig) => {
          // Updating unit/hero config
          console.log(`🔧 PlacementManager: Received config update for ${item.name}:`, newConfig)
          console.log(`🔧 PlacementManager: AI config received:`, newConfig.ai)
          
          // Update the unit with new configuration
          item.updateConfig(newConfig)
          
          // Successfully updated unit/hero
          console.log(`🔧 PlacementManager: Successfully updated ${item.name}`)
        },
        () => {
          // Edit cancelled
        },
        currentConfig // Pass current config as pre-fill data
      )
    } else {
      // No configurable unit or hero found to edit
    }
  }

  public dragItem(fromIsoX: number, fromIsoY: number, toIsoX: number, toIsoY: number): void {
    const fromKey = `${fromIsoX},${fromIsoY}`
    const toKey = `${toIsoX},${toIsoY}`
    
    // Check if there's an item to drag from the source position
    const itemToDrag = this.placedItems.get(fromKey)
    if (!itemToDrag) {
      // Try to drag terrain if no structure/unit found
      const terrainToDrag = this.terrain.get(fromKey)
      if (terrainToDrag) {
        this.dragTerrain(fromIsoX, fromIsoY, toIsoX, toIsoY)
      }
      return
    }
    
    // Check if destination is occupied by another item (not terrain)
    const destinationItem = this.placedItems.get(toKey)
    if (destinationItem) {
      // Cannot drag to occupied position
      return
    }
    
    // Remove from source position
    this.placedItems.delete(fromKey)
    
    // Update item position and place at destination
    if (itemToDrag instanceof Structure) {
      this.dragStructure(itemToDrag, fromIsoX, fromIsoY, toIsoX, toIsoY)
    } else if (itemToDrag instanceof ConfigurableUnit || itemToDrag instanceof ConfigurableHero) {
      this.dragUnit(itemToDrag, fromIsoX, fromIsoY, toIsoX, toIsoY)
    }
    
    // Add to destination position
    this.placedItems.set(toKey, itemToDrag)
  }

  private dragTerrain(fromIsoX: number, fromIsoY: number, toIsoX: number, toIsoY: number): void {
    const fromKey = `${fromIsoX},${fromIsoY}`
    const toKey = `${toIsoX},${toIsoY}`
    
    const terrainToDrag = this.terrain.get(fromKey)
    if (!terrainToDrag) return
    
    // Get the terrain texture to determine type
    const terrainTexture = terrainToDrag.texture.key
    
    // Remove from source
    terrainToDrag.destroy()
    this.terrain.delete(fromKey)
    
    // Place at destination (this will replace any existing terrain)
    const toScreenPos = this.isometricToScreen(toIsoX, toIsoY)
    const newTerrain = this.scene.add.image(toScreenPos.x, toScreenPos.y, terrainTexture)
    newTerrain.setDepth(-1000)
    this.terrain.set(toKey, newTerrain)
    this.uiCamera.ignore(newTerrain)
  }

  private dragStructure(structure: Structure, _fromIsoX: number, _fromIsoY: number, toIsoX: number, toIsoY: number): void {
    // Update structure position
    const newScreenPos = this.isometricToScreen(toIsoX, toIsoY)
    structure.sprite.setPosition(newScreenPos.x, newScreenPos.y)
    structure.sprite.setDepth(50 + toIsoX + toIsoY)
    
    // Update structure's internal coordinates if it has them
    if (structure.setIsometricPosition) {
      structure.setIsometricPosition(toIsoX, toIsoY)
    }
  }

  private dragUnit(unit: ConfigurableUnit | ConfigurableHero, _fromIsoX: number, _fromIsoY: number, toIsoX: number, toIsoY: number): void {
    // Update unit position
    const newScreenPos = this.isometricToScreen(toIsoX, toIsoY)
    unit.sprite.setPosition(newScreenPos.x, newScreenPos.y)
    unit.sprite.setDepth(100 + toIsoX + toIsoY)
    
    // Update unit's internal coordinates if it has them
    if (unit.setIsometricPosition) {
      unit.setIsometricPosition(toIsoX, toIsoY)
    }
    
    // Update health bar position if it exists
    if (unit.healthBar) {
      unit.healthBar.setPosition(newScreenPos.x, newScreenPos.y)
    }
    
    // Update level display position for heroes
    if (unit instanceof ConfigurableHero) {
      if ((unit as any).levelText) {
        (unit as any).levelText.setPosition(newScreenPos.x + 20, newScreenPos.y - 30)
      }
      if ((unit as any).expCircle) {
        (unit as any).expCircle.setPosition(newScreenPos.x + 20, newScreenPos.y - 20)
      }
      if ((unit as any).expBackground) {
        (unit as any).expBackground.setPosition(newScreenPos.x + 20, newScreenPos.y - 20)
      }
    }
  }

  public eraseItem(isoX: number, isoY: number): void {
    const key = `${isoX},${isoY}`
    
    // First try to erase structures/units (higher priority)
    const item = this.placedItems.get(key)
    if (item) {
      item.destroy()
      this.placedItems.delete(key)
      
      // Remove from appropriate array
      if (item instanceof Structure) {
        const index = this.structures.indexOf(item)
        if (index > -1) this.structures.splice(index, 1)
        // Erased structure
      } else {
        const index = this.units.indexOf(item as ConfigurableUnit | ConfigurableHero)
        if (index > -1) this.units.splice(index, 1)
        // Erased unit
      }
      return // Don't erase terrain if we erased an item
    }
    
    // If no structures/units, then try to erase terrain
    const terrain = this.terrain.get(key)
    if (terrain) {
      terrain.destroy()
      this.terrain.delete(key)
      // Erased terrain
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
    // Map cleared
  }

  public getTerrain(): Map<string, Phaser.GameObjects.Image> {
    return this.terrain
  }

  public getStructures(): Array<Structure> {
    return this.structures
  }

  public getUnits(): Array<ConfigurableUnit | ConfigurableHero> {
    return this.units
  }

  public getPlacedItems(): Map<string, Structure | ConfigurableUnit | ConfigurableHero> {
    return this.placedItems
  }

  public updateUICamera(): void {
    // This method is kept for backward compatibility but optimized to do minimal work
    // UI camera ignore operations are now handled only during placement/creation
  }

  public destroy(): void {
    this.clearAll()
    // Don't destroy the singleton modal here - it will be managed by the singleton itself
    // this.unitConfigModal.destroy()
    // PlacementManager destroyed (modal singleton preserved)
  }
}