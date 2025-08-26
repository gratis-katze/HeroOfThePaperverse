import Phaser from 'phaser'
import { StructureType, BasicUnitType, CombatStats, HeroStats } from '../units'
import { IsometricGraphics } from '../graphics/IsometricGraphics'
import { EditorInputManager, EditorUIManager, GridManager, PlacementManager, MapDataManager, ToolManager } from '../managers/editor'

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
    type: 'hero' | BasicUnitType
    stats?: CombatStats | HeroStats
  }>
}

export enum EditorTool {
  PLACE = 'place',
  ERASE = 'erase'
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
  }

  create() {
    console.log('🎨 MapEditorScene create() called')
    
    // Create UI camera that stays at zoom level 1 and renders only UI elements
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.uiCamera.setZoom(1)
    
    // Initialize managers
    this.initializeManagers()
    
    // Set up main camera with bounds for the current map size
    this.setupCamera()
    
    // Check if we're returning from a playtest and restore the map
    const sceneData = this.scene.settings.data as any
    if (sceneData && sceneData.metadata?.fromEditor) {
      console.log('🔄 Restoring map from playtest with data:', {
        width: sceneData.width,
        height: sceneData.height,
        terrainCount: sceneData.terrain?.length || 0,
        structureCount: sceneData.structures?.length || 0,
        unitCount: sceneData.units?.length || 0
      })
      this.loadMapData(sceneData)
    }
    
    // Ensure physics debug is ignored by UI camera after everything is set up
    this.time.delayedCall(100, () => {
      if (this.physics.world.debugGraphic) {
        this.uiCamera.ignore(this.physics.world.debugGraphic)
        console.log('🔧 UI camera configured to ignore physics debug')
      }
    })
    
    console.log('🎨 Map Editor initialized successfully')
  }

  update() {
    // Continuously ensure UI camera ignores physics debug graphics
    if (this.physics.world.debugGraphic && this.uiCamera) {
      this.uiCamera.ignore(this.physics.world.debugGraphic)
    }
    
    // Update managers
    this.placementManager.updateUICamera()
    
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
          { label: 'Place', action: () => this.setTool(EditorTool.PLACE) },
          { label: 'Erase', action: () => this.setTool(EditorTool.ERASE) }
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
          { label: 'Hero', action: () => this.setUnitType('hero') },
          { label: 'Warrior', action: () => this.setUnitType(BasicUnitType.WARRIOR) },
          { label: 'Archer', action: () => this.setUnitType(BasicUnitType.ARCHER) }
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
    this.uiManager.setActiveCategory('blocks')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setUnitType(type: 'hero' | BasicUnitType): void {
    this.toolManager.setUnitType(type)
    this.uiManager.setActiveCategory('units')
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setTerrainType(type: TerrainType): void {
    this.toolManager.setTerrainType(type)
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
    console.log('🧹 Map cleared')
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
    console.log('🎮 Starting playtest from editor')
    this.saveMap()
    const mapData = this.getMapData()
    
    console.log('🎮 Sending map data to GameScene:', {
      width: mapData.width,
      height: mapData.height,
      terrainCount: mapData.terrain?.length || 0,
      structureCount: mapData.structures?.length || 0,
      unitCount: mapData.units?.length || 0
    })
    
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
      console.log('🔄 Starting loadMapData with:', mapData)
      
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
          this.toolManager.setUnitType(unitData.type)
          this.placementManager.placeItem(unitData.x, unitData.y, 'unit', unitData.type)
        })
      }
      
      console.log('📁 Map loaded successfully')
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
    
    // Calculate map bounds in screen coordinates
    const mapBoundsX = width * ISO_WIDTH * 2
    const mapBoundsY = height * ISO_HEIGHT * 2
    
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

  public cleanup(): void {
    if (this.inputManager) this.inputManager.destroy()
    if (this.uiManager) this.uiManager.destroy()
    if (this.gridManager) this.gridManager.destroy()
    if (this.placementManager) this.placementManager.destroy()
  }
}