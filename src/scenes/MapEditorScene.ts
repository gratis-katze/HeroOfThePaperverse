import Phaser from 'phaser'
import { StructureType, HeroStats, ConfigurableUnit, ConfigurableHero, UnitConfig } from '../units'
import { IsometricGraphics } from '../graphics/IsometricGraphics'
import { EditorInputManager, EditorUIManager, GridManager, PlacementManager, MapDataManager, ToolManager, UnitConfigModal } from '../managers/editor'

export enum TerrainType {
  GRASS = 'grass',
  SNOW = 'snow',
  ROCK = 'rock',
  MUD = 'mud',
  SAND = 'sand'
}

export interface MapData {
  width: number
  height: number
  terrain: Array<{
    x: number
    y: number
    type: TerrainType
  }>
  structures: Array<{
    x: number
    y: number
    type: StructureType
  }>
  units: Array<{
    x: number
    y: number
    type: 'hero' | 'configurable' | string
    stats?: HeroStats | any
  }>
}

export enum EditorTool {
  ERASE = 'erase',
  EDIT = 'edit',
  DRAG = 'drag',
  NONE = 'none' // Default state for placing items
}

export class MapEditorScene extends Phaser.Scene {
  private zoomLevel: number = 1
  private readonly MIN_ZOOM = 0.25
  private readonly MAX_ZOOM = 2
  
  // UI Elements
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  
  // Managers
  private inputManager!: EditorInputManager
  private uiManager!: EditorUIManager
  private gridManager!: GridManager
  private placementManager!: PlacementManager
  private mapDataManager!: MapDataManager
  private toolManager!: ToolManager

  constructor() {
    super({ key: 'MapEditorScene' })
  }

  preload() {
    this.createAllGraphics()
    this.loadHeroAnimations()
  }

  create() {
    // MapEditorScene created
    
    // Add scene lifecycle event handlers
    this.events.once('shutdown', this.cleanup, this)
    this.events.once('destroy', this.cleanup, this)
    
    // Create UI camera that stays at zoom level 1 and renders only UI elements
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.uiCamera.setZoom(1)
    
    // Create hero animations for use with ConfigurableUnits
    this.createHeroAnimations()
    
    // Initialize managers
    this.initializeManagers()
    
    // Set up main camera with bounds for the current map size
    this.setupCamera()
    
    // Check if we're returning from a playtest and restore the map
    const sceneData = this.scene.settings.data as any
    if (sceneData && sceneData.metadata?.fromEditor) {
      // Restoring map from playtest
      this.loadMapData(sceneData)
    }
    
    // Ensure physics debug is ignored by UI camera after everything is set up
    this.time.delayedCall(100, () => {
      if (this.physics.world.debugGraphic) {
        this.uiCamera.ignore(this.physics.world.debugGraphic)
        // UI camera configured to ignore physics debug
      }
    })
    
    // Map Editor initialized
  }

  update() {
    // Handle continuous camera movement with keyboard
    const keyboardResult = this.inputManager.handleKeyboardMovement()
    if (keyboardResult.moved) {
      this.updateStatusText()
      this.gridManager.scheduleGridRedraw()
    }
  }

  private initializeManagers(): void {
    this.toolManager = new ToolManager()
    this.placementManager = new PlacementManager(this, this.uiCamera)
    this.gridManager = new GridManager(this, this.uiCamera)
    this.mapDataManager = new MapDataManager()
    this.uiManager = new EditorUIManager(this, this.uiCamera)
    
    // Override UI manager methods to connect with tool manager
    this.uiManager.getCategoryItems = (categoryKey: string) => this.getCategoryItems(categoryKey)
    this.uiManager.isItemActive = (item: any, categoryKey: string) => this.isItemActive(item, categoryKey)
    
    this.inputManager = new EditorInputManager({
      scene: this,
      navBarHeight: this.uiManager.getNavBarHeight(),
      onPlaceItem: (isoX: number, isoY: number) => this.handlePlaceItem(isoX, isoY),
      onEraseItem: (isoX: number, isoY: number) => this.handleEraseItem(isoX, isoY),
      onEditItem: (isoX: number, isoY: number) => this.handleEditItem(isoX, isoY),
      onDragItem: (fromIsoX: number, fromIsoY: number, toIsoX: number, toIsoY: number) => this.handleDragItem(fromIsoX, fromIsoY, toIsoX, toIsoY),
      onCameraDrag: (deltaX: number, deltaY: number, startX: number, startY: number) => this.handleCameraDrag(deltaX, deltaY, startX, startY),
      onCameraZoom: (deltaY: number) => this.handleCameraZoom(deltaY),
      onStatusUpdate: () => this.updateStatusText(),
      onGridRedraw: () => this.gridManager.drawGrid()
    })
    
    // Sync initial tool state
    this.inputManager.setTool(this.toolManager.getCurrentTool())
  }

  private createAllGraphics() {
    IsometricGraphics.createHeroGraphic(this, 'hero')
    IsometricGraphics.createWarriorGraphic(this, 'warrior')
    IsometricGraphics.createArcherGraphic(this, 'archer')
    IsometricGraphics.createMageGraphic(this, 'mage')
    IsometricGraphics.createScoutGraphic(this, 'scout')
    IsometricGraphics.createWaterBlockGraphic(this, 'water_block')
    IsometricGraphics.createWallBlockGraphic(this, 'wall_block')
    IsometricGraphics.createRockBlockGraphic(this, 'rock_block')
    
    // Create terrain graphics
    IsometricGraphics.createGrassTerrainGraphic(this, 'grass_terrain')
    IsometricGraphics.createSnowTerrainGraphic(this, 'snow_terrain')
    IsometricGraphics.createRockTerrainGraphic(this, 'rock_terrain')
    IsometricGraphics.createMudTerrainGraphic(this, 'mud_terrain')
    IsometricGraphics.createSandTerrainGraphic(this, 'sand_terrain')
  }

  // Handler methods
  private handlePlaceItem(isoX: number, isoY: number): void {
    this.placementManager.placeItem(
      isoX, 
      isoY, 
      this.toolManager.getActiveItemType(),
      this.toolManager.getActiveItemType() === 'terrain' ? this.toolManager.getSelectedTerrainType() :
      this.toolManager.getActiveItemType() === 'block' ? this.toolManager.getSelectedBlockType() :
      this.toolManager.getSelectedUnitType()
    )
  }

  private handleEraseItem(isoX: number, isoY: number): void {
    this.placementManager.eraseItem(isoX, isoY)
  }

  private handleEditItem(isoX: number, isoY: number): void {
    this.placementManager.editItem(isoX, isoY)
  }

  private handleDragItem(fromIsoX: number, fromIsoY: number, toIsoX: number, toIsoY: number): void {
    this.placementManager.dragItem(fromIsoX, fromIsoY, toIsoX, toIsoY)
  }

  private handleCameraDrag(deltaX: number, deltaY: number, startX: number, startY: number): void {
    this.cameras.main.setScroll(
      startX + deltaX / this.zoomLevel,
      startY + deltaY / this.zoomLevel
    )
  }

  private handleCameraZoom(deltaY: number): void {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM)
    
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.cameras.main.setZoom(this.zoomLevel)
      this.updateStatusText()
      this.gridManager.drawGrid()
    }
  }

  // Category and tool management methods
  private getCategoryItems(categoryKey: string): Array<{label: string, action: () => void}> {
    switch (categoryKey) {
      case 'tools':
        return [
          { label: 'Edit', action: () => this.setTool(EditorTool.EDIT) },
          { label: 'Erase', action: () => this.setTool(EditorTool.ERASE) },
          { label: 'Drag', action: () => this.setTool(EditorTool.DRAG) }
        ]
      case 'terrain':
        return [
          { label: 'Grass', action: () => this.setTerrainType(TerrainType.GRASS) },
          { label: 'Snow', action: () => this.setTerrainType(TerrainType.SNOW) },
          { label: 'Rock', action: () => this.setTerrainType(TerrainType.ROCK) },
          { label: 'Mud', action: () => this.setTerrainType(TerrainType.MUD) },
          { label: 'Sand', action: () => this.setTerrainType(TerrainType.SAND) }
        ]
      case 'blocks':
        return [
          { label: 'Water', action: () => this.setBlockType(StructureType.WATER) },
          { label: 'Wall', action: () => this.setBlockType(StructureType.WALL) },
          { label: 'Rock', action: () => this.setBlockType(StructureType.ROCK) }
        ]
      case 'units':
        return [
          { label: 'Configurable Unit', action: () => this.setUnitType('configurable') },
          { label: 'Configurable Hero', action: () => this.setUnitType('configurableHero') }
        ]
      case 'map':
        return [
          { label: '25x25', action: () => this.setMapSize(25, 25) },
          { label: '50x50', action: () => this.setMapSize(50, 50) },
          { label: '100x100', action: () => this.setMapSize(100, 100) },
          { label: 'Clear', action: () => this.clearMap() },
          { label: 'Save', action: () => this.saveMap() },
          { label: 'Load', action: () => this.loadMap() },
          { label: 'Test', action: () => this.playTest() }
        ]
      default:
        return []
    }
  }

  private isItemActive(item: {label: string, action: () => void}, categoryKey: string): boolean {
    switch (categoryKey) {
      case 'tools':
        return this.toolManager.isToolActive(item.label)
      case 'terrain':
        return this.toolManager.isTerrainActive(item.label)
      case 'blocks':
        return this.toolManager.isBlockActive(item.label)
      case 'units':
        return this.toolManager.isUnitActive(item.label)
      default:
        return false
    }
  }

  // Tool setter methods
  private setTool(tool: EditorTool): void {
    this.toolManager.setTool(tool)
    this.inputManager.setTool(tool)
    this.uiManager.setActiveCategory('tools')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setBlockType(type: StructureType): void {
    this.toolManager.setBlockType(type)
    this.toolManager.setTool(EditorTool.NONE) // Switch to placement mode
    this.inputManager.setTool(EditorTool.NONE)
    this.uiManager.setActiveCategory('blocks')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setUnitType(type: string): void {
    this.toolManager.setUnitType(type)
    this.toolManager.setTool(EditorTool.NONE) // Switch to placement mode
    this.inputManager.setTool(EditorTool.NONE)
    this.uiManager.setActiveCategory('units')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setTerrainType(type: TerrainType): void {
    this.toolManager.setTerrainType(type)
    this.toolManager.setTool(EditorTool.NONE) // Switch to placement mode
    this.inputManager.setTool(EditorTool.NONE)
    this.uiManager.setActiveCategory('terrain')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setMapSize(width: number, height: number): void {
    this.toolManager.setMapSize(width, height)
    this.updateStatusText()
    this.setupCamera()
  }

  // Map operations
  private clearMap(): void {
    this.placementManager.clearAll()
    // Map cleared
  }

  private saveMap(): void {
    const mapData = this.getMapData()
    this.mapDataManager.saveMapToFile(mapData)
  }

  private async loadMap(): Promise<void> {
    try {
      const mapData = await this.mapDataManager.loadMapFromFile()
      this.loadMapData(mapData)
    } catch (error) {
      console.error('❌ Failed to load map:', error)
    }
  }

  private playTest(): void {
    // Starting playtest from editor
    this.saveMap()
    const mapData = this.getMapData()
    
    // Sending map data to GameScene
    
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const gameSceneData = this.mapDataManager.createGameSceneData(mapData)
      
      // Use scene.stop to ensure clean shutdown, then start the new scene
      this.scene.stop()
      this.scene.start('GameScene', gameSceneData)
    })
  }

  private loadMapData(mapData: MapData): void {
    try {
      // Starting loadMapData
      
      const validatedData = this.mapDataManager.validateMapData(mapData)
      if (!validatedData) {
        throw new Error('Invalid map data')
      }

      this.clearMap()
      
      // Update map size with validation
      const { width, height } = validatedData
      this.setMapSize(width, height)
      
      // Load terrain, structures, and units using placement manager
      if (validatedData.terrain) {
        validatedData.terrain.forEach(terrainData => {
          this.toolManager.setTerrainType(terrainData.type)
          this.placementManager.placeItem(terrainData.x, terrainData.y, 'terrain', terrainData.type)
        })
      }
      
      if (validatedData.structures) {
        validatedData.structures.forEach(structData => {
          this.toolManager.setBlockType(structData.type)
          this.placementManager.placeItem(structData.x, structData.y, 'block', structData.type)
        })
      }
      
      if (validatedData.units) {
        validatedData.units.forEach(unitData => {
          if (unitData.type === 'configurable' && unitData.stats) {
            // Create configurable unit directly for loading
            const config = unitData.stats as UnitConfig
            const unit = new ConfigurableUnit(
              this,
              unitData.x,
              unitData.y,
              'Custom Unit',
              config
            )
            unit.sprite.setCollideWorldBounds(false)
            unit.sprite.setDepth(100 + unitData.x + unitData.y)
            this.placementManager.getUnits().push(unit)
            this.placementManager.getPlacedItems().set(`${unitData.x},${unitData.y}`, unit)
            this.uiCamera.ignore(unit.sprite)
            if (unit.healthBar) {
              this.uiCamera.ignore(unit.healthBar.getContainer())
            }
          } else if (unitData.type === 'configurableHero' && unitData.stats) {
            // Create configurable hero directly for loading
            const heroData = unitData.stats as { config: UnitConfig, heroStats: HeroStats }
            const hero = new ConfigurableHero(
              this,
              unitData.x,
              unitData.y,
              'Custom Hero',
              heroData.config,
              heroData.heroStats
            )
            hero.sprite.setCollideWorldBounds(false)
            hero.sprite.setDepth(100 + unitData.x + unitData.y)
            this.placementManager.getUnits().push(hero)
            this.placementManager.getPlacedItems().set(`${unitData.x},${unitData.y}`, hero)
            this.uiCamera.ignore(hero.sprite)
            if (hero.healthBar) {
              this.uiCamera.ignore(hero.healthBar.getContainer())
            }
            // Handle level display UI elements
            if ((hero as any).levelText) {
              this.uiCamera.ignore((hero as any).levelText)
            }
            if ((hero as any).expCircle) {
              this.uiCamera.ignore((hero as any).expCircle)
            }
            if ((hero as any).expBackground) {
              this.uiCamera.ignore((hero as any).expBackground)
            }
          } else {
            // Handle old unit types (for backward compatibility)
            this.toolManager.setUnitType('unit')
            this.placementManager.placeItem(unitData.x, unitData.y, 'unit', unitData.type)
          }
        })
      }
      
      // Map loaded successfully
    } catch (error) {
      console.error('❌ Error loading map data:', error)
      this.clearMap()
    }
  }

  // Utility methods
  private updateStatusText(): void {
    const cameraInfo = this.getCameraInfoText()
    const statusText = this.toolManager.getStatusText(cameraInfo)
    this.uiManager.updateStatusText(statusText)
  }

  private refreshNavBar(): void {
    this.uiManager.refreshNavBar()
  }

  private setupCamera(): void {
    const { width, height } = this.toolManager.getMapSize()
    const ISO_WIDTH = 32
    const ISO_HEIGHT = 16
    
    // Calculate map bounds in screen coordinates with larger buffer for units
    const mapBoundsX = width * ISO_WIDTH * 4
    const mapBoundsY = height * ISO_HEIGHT * 4
    
    this.cameras.main.setZoom(this.zoomLevel)
    this.cameras.main.setBounds(-mapBoundsX, -mapBoundsY, mapBoundsX * 2, mapBoundsY * 2)
    this.cameras.main.centerOn(0, 0)
    
    this.updateStatusText()
  }

  private getCameraInfoText(): string {
    const camX = Math.round(this.cameras.main.scrollX)
    const camY = Math.round(this.cameras.main.scrollY)
    return `Camera: (${camX}, ${camY}) | Zoom: ${this.zoomLevel.toFixed(2)}x`
  }

  public getMapData(): MapData {
    const { width, height } = this.toolManager.getMapSize()
    return this.mapDataManager.createMapData(
      width,
      height,
      this.placementManager.getTerrain(),
      this.placementManager.getStructures(),
      this.placementManager.getUnits()
    )
  }

  private loadHeroAnimations(): void {
    // Load hero animation spritesheets for all idle directions
    const idleAnimations = [
      { key: 'hero_idle', file: 'Idle.png' },
      { key: 'hero_idle_down', file: 'Idle_Down.png' },
      { key: 'hero_idle_up', file: 'Idle_Up.png' },
      { key: 'hero_idle_left_down', file: 'Idle_Left_Down.png' },
      { key: 'hero_idle_left_up', file: 'Idle_Left_Up.png' },
      { key: 'hero_idle_right_down', file: 'Idle_Right_Down.png' },
      { key: 'hero_idle_right_up', file: 'Idle_Right_Up.png' }
    ]
    
    // Load hero animation spritesheets for all walk directions
    const walkAnimations = [
      { key: 'hero_walk', file: 'walk.png' },
      { key: 'hero_walk_down', file: 'walk_Down.png' },
      { key: 'hero_walk_up', file: 'walk_Up.png' },
      { key: 'hero_walk_left_down', file: 'walk_Left_Down.png' },
      { key: 'hero_walk_left_up', file: 'walk_Left_Up.png' },
      { key: 'hero_walk_right_down', file: 'walk_Right_Down.png' },
      { key: 'hero_walk_right_up', file: 'walk_Right_Up.png' }
    ]
    
    idleAnimations.forEach(anim => {
      this.load.spritesheet(anim.key, `assets/sprites/hero/${anim.file}`, {
        frameWidth: 48,
        frameHeight: 64
      })
    })
    
    walkAnimations.forEach(anim => {
      this.load.spritesheet(anim.key, `assets/sprites/hero/${anim.file}`, {
        frameWidth: 48,
        frameHeight: 64
      })
    })
  }

  private createHeroAnimations(): void {
    // Create all idle animations
    const idleAnimations = [
      'hero_idle',
      'hero_idle_down',
      'hero_idle_up', 
      'hero_idle_left_down',
      'hero_idle_left_up',
      'hero_idle_right_down',
      'hero_idle_right_up'
    ]
    
    // Create all walk animations
    const walkAnimations = [
      'hero_walk',
      'hero_walk_down',
      'hero_walk_up',
      'hero_walk_left_down',
      'hero_walk_left_up',
      'hero_walk_right_down',
      'hero_walk_right_up'
    ]
    
    idleAnimations.forEach(animKey => {
      if (this.textures.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 7 }),
          frameRate: 8,
          repeat: -1
        })
      }
    })
    
    walkAnimations.forEach(animKey => {
      if (this.textures.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 7 }),
          frameRate: 12, // Slightly faster frame rate for walking
          repeat: -1
        })
      }
    })
  }

  public cleanup(): void {
    if (this.inputManager) this.inputManager.destroy()
    if (this.uiManager) this.uiManager.destroy()
    if (this.gridManager) this.gridManager.destroy()
    if (this.placementManager) this.placementManager.destroy()
    
    // Destroy the UnitConfigModal singleton when scene is cleaned up
    UnitConfigModal.destroyInstance()
    // MapEditorScene cleanup complete - modal singleton destroyed
  }
}