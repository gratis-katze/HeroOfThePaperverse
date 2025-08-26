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
    console.log('🎨 PlacementManager using UnitConfigModal singleton')
  }

  public placeItem(isoX: number, isoY: number, itemType: 'terrain' | 'block' | 'unit', selectedType: any): void {
    const key = `${isoX},${isoY}`
    
    console.log(`🎨 PlacementManager.placeItem called: itemType=${itemType}, selectedType=${selectedType}, position=(${isoX},${isoY})`)
    
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
        console.log(`🎨 About to show unit config modal for ${selectedType}`)
        this.showUnitConfigModal(isoX, isoY, selectedType)
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
    
    // Set depth for blocks (above terrain, below units)
    structure.sprite.setDepth(50 + isoX + isoY)
    
    this.structures.push(structure)
    this.placedItems.set(`${isoX},${isoY}`, structure)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
  }

  private showUnitConfigModal(isoX: number, isoY: number, unitType: string): void {
    console.log(`🎭 showUnitConfigModal called for position (${isoX}, ${isoY}) - ${unitType}`)
    console.log(`🎭 Current scene:`, this.scene.scene.key)
    console.log(`🎭 Current uiCamera:`, !!this.uiCamera)
    
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
    console.log(`🎭 Getting modal instance with updated scene references...`)
    this.unitConfigModal = UnitConfigModal.getInstance(this.scene, this.uiCamera)
    console.log(`🎭 Modal instance obtained:`, !!this.unitConfigModal)
    
    console.log(`🎭 About to call modal.show()...`)
    this.unitConfigModal.show(
      (config: UnitConfig) => {
        console.log(`🎯 Confirm callback triggered for position (${isoX}, ${isoY}) with config:`, config)
        if (unitType === 'configurableHero') {
          this.placeConfigurableHero(isoX, isoY, config)
        } else {
          this.placeConfigurableUnit(isoX, isoY, config)
        }
      },
      () => {
        console.log(`🎯 Cancel callback triggered for position (${isoX}, ${isoY})`)
        this.cancelUnitPlacement()
      }
    )
    console.log(`🎭 modal.show() called successfully`)
  }

  private placeConfigurableUnit(isoX: number, isoY: number, config: UnitConfig): void {
    console.log(`🎨 placeConfigurableUnit called for (${isoX}, ${isoY}) with config:`, config)
    
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
    
    console.log(`✅ Successfully placed configurable unit at (${isoX}, ${isoY}) with stats:`, {
      health: config.health,
      attack: config.attack,
      defense: config.defense,
      goldOnDeath: config.goldOnDeath,
      expOnDeath: config.expOnDeath,
      texture: config.texture
    })
    
    console.log(`🔍 Full config object:`, config)
  }

  private placeConfigurableHero(isoX: number, isoY: number, config: UnitConfig): void {
    console.log(`🦸 placeConfigurableHero called for (${isoX}, ${isoY}) with config:`, config)
    
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
    
    console.log(`✅ Successfully placed configurable hero at (${isoX}, ${isoY}) with stats:`, {
      health: config.health,
      attack: config.attack,
      defense: config.defense,
      goldOnDeath: config.goldOnDeath,
      expOnDeath: config.expOnDeath,
      texture: config.texture,
      heroStats: defaultStats
    })
    
    console.log(`🔍 Full hero config object:`, config)
  }

  private cancelUnitPlacement(): void {
    console.log(`❌ Unit placement cancelled - modal closed without placing unit`)
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
      console.log(`✏️ Editing ${item instanceof ConfigurableHero ? 'hero' : 'unit'} at (${isoX}, ${isoY})`)
      
      // Get the current configuration
      const currentConfig = item.getConfig()
      
      // Show the unit config modal with current values pre-filled
      this.unitConfigModal = UnitConfigModal.getInstance(this.scene, this.uiCamera)
      this.unitConfigModal.show(
        (newConfig: UnitConfig) => {
          console.log(`✏️ Updating ${item instanceof ConfigurableHero ? 'hero' : 'unit'} config:`, newConfig)
          
          // Update the unit with new configuration
          item.updateConfig(newConfig)
          
          console.log(`✅ Successfully updated ${item instanceof ConfigurableHero ? 'hero' : 'unit'} at (${isoX}, ${isoY})`)
        },
        () => {
          console.log(`❌ Edit cancelled for ${item instanceof ConfigurableHero ? 'hero' : 'unit'} at (${isoX}, ${isoY})`)
        },
        currentConfig // Pass current config as pre-fill data
      )
    } else {
      console.log(`⚠️ No configurable unit or hero found at (${isoX}, ${isoY}) to edit`)
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
        console.log(`🗑️ Erased structure at (${isoX}, ${isoY})`)
      } else {
        const index = this.units.indexOf(item as ConfigurableUnit | ConfigurableHero)
        if (index > -1) this.units.splice(index, 1)
        console.log(`🗑️ Erased unit at (${isoX}, ${isoY})`)
      }
      return // Don't erase terrain if we erased an item
    }
    
    // If no structures/units, then try to erase terrain
    const terrain = this.terrain.get(key)
    if (terrain) {
      terrain.destroy()
      this.terrain.delete(key)
      console.log(`🗑️ Erased terrain at (${isoX}, ${isoY})`)
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

  public getUnits(): Array<ConfigurableUnit | ConfigurableHero> {
    return this.units
  }

  public getPlacedItems(): Map<string, Structure | ConfigurableUnit | ConfigurableHero> {
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
    // Don't destroy the singleton modal here - it will be managed by the singleton itself
    // this.unitConfigModal.destroy()
    console.log('🎨 PlacementManager destroyed (modal singleton preserved)')
  }
}