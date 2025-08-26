import Phaser from 'phaser'
import { Hero } from '../units'
import { HeroStats } from '../units'
import { StructureBuilder } from '../utils/StructureBuilder'
import { MapData } from './MapEditorScene'
import { InputManager, CameraController, MapManager, UnitManager, CombatSystem, UIManager } from '../managers'

export class GameScene extends Phaser.Scene {
  private playerHero!: Hero
  private unitCollisionGroup!: Phaser.Physics.Arcade.Group
  private projectileGroup!: Phaser.Physics.Arcade.Group
  
  // UI Elements
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  
  // Managers
  private inputManager!: InputManager
  private cameraController!: CameraController
  private mapManager!: MapManager
  private unitManager!: UnitManager
  private combatSystem!: CombatSystem
  private uiManager!: UIManager

  constructor() {
    super({ key: 'GameScene' })
  }
  
  private resetSceneState(): void {
    console.log('🔄 Resetting GameScene state')
    
    // Reset managers if they exist
    if (this.unitManager) this.unitManager.reset()
    if (this.combatSystem) this.combatSystem.reset()
    if (this.mapManager) this.mapManager.destroy()
    if (this.uiManager) this.uiManager.destroy()
    
    console.log('🔄 GameScene state reset complete')
  }

  preload() {
    // MapManager will handle graphics creation
  }

  create() {
    console.log('🎮 GameScene create() called')
    
    // Reset scene state to ensure clean initialization
    this.resetSceneState()
    
    // Create UI camera that stays at zoom level 1 and renders only UI elements
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.uiCamera.setZoom(1)
    
    this.setupPhysicsGroups()
    
    // Initialize managers
    this.initializeManagers()
    
    // Fade in effect
    this.cameraController.fadeIn(300)
    
    // Check if we have map data from the editor
    const sceneData = this.scene.settings.data as any
    console.log('🎮 GameScene received data:', {
      hasData: !!sceneData,
      hasMetadata: !!sceneData?.metadata,
      fromEditor: sceneData?.metadata?.fromEditor,
      structureCount: sceneData?.structures?.length || 0,
      unitCount: sceneData?.units?.length || 0,
      terrainCount: sceneData?.terrain?.length || 0
    })
    
    if (sceneData && sceneData.metadata?.fromEditor) {
      console.log('🎮 Creating game from editor data')
      this.uiManager.showLoadingMessage(sceneData.metadata)
      // Delay map creation to show loading message
      this.time.delayedCall(500, () => {
        this.createGameFromMapData(sceneData)
        this.uiManager.hideLoadingMessage()
      })
    } else if (sceneData && (sceneData.structures?.length > 0 || sceneData.units?.length > 0)) {
      console.log('🎮 Creating game from existing map data')
      this.createGameFromMapData(sceneData)
    } else {
      console.log('🎮 Creating test map (no valid data found)')
      this.createTestMap()
    }
    
    console.log('🎮 GameScene initialization complete')
  }

  update(time: number, delta: number) {
    // Update managers
    this.uiManager.ensureUIIgnoresPhysicsDebug()
    this.unitManager.updateUnits(time, delta, this.uiCamera)
    this.combatSystem.updateProjectiles(this.uiCamera)
    this.unitManager.cleanupDeadUnits()
    this.inputManager.handleInput()
  }

  private initializeManagers(): void {
    this.cameraController = new CameraController(this.cameras.main)
    this.mapManager = new MapManager(this, this.uiCamera)
    this.unitManager = new UnitManager(this, this.unitCollisionGroup)
    this.combatSystem = new CombatSystem(this, this.projectileGroup, this.unitCollisionGroup)
    this.uiManager = new UIManager(this, this.uiCamera)
    
    // Initialize InputManager with callbacks
    this.inputManager = new InputManager({
      scene: this,
      onHeroMove: (x: number, y: number) => this.handleHeroMove(x, y),
      onShoot: (targetX: number, targetY: number) => this.handleShoot(targetX, targetY),
      onCameraDrag: (deltaX: number, deltaY: number) => this.handleCameraDrag(deltaX, deltaY),
      onCameraZoom: (delta: number) => this.cameraController.handleZoom(delta),
      onEditorToggle: () => this.handleEditorToggle(),
      onCameraCenter: () => this.handleCameraCenter(),
      onZoomIn: () => this.cameraController.zoomIn(),
      onZoomOut: () => this.cameraController.zoomOut(),
      onZoomReset: () => this.cameraController.resetZoom()
    })
    
    this.uiManager.setupUICamera()
  }

  private handleHeroMove(x: number, y: number): void {
    if (!this.playerHero) return
    
    const path = this.unitManager.findPathForUnit(this.playerHero, x, y)
    if (path.length > 1) {
      console.log(`✅ GameScene: Path found, starting movement`)
      this.playerHero.followPath(path)
    } else {
      console.log(`❌ GameScene: No path found to target position`)
    }
  }
  
  private handleShoot(targetX: number, targetY: number): void {
    if (!this.playerHero) return
    this.combatSystem.shootProjectile(this.playerHero, targetX, targetY, 25, this.uiCamera)
  }
  
  private handleCameraDrag(deltaX: number, deltaY: number): void {
    const dragState = this.inputManager.getDragState()
    if (dragState.isDragging) {
      this.cameraController.handleDrag(deltaX, deltaY, dragState.cameraStartX, dragState.cameraStartY)
    } else {
      // Handle keyboard movement
      this.cameraController.handleKeyboardMovement(deltaX, deltaY)
    }
  }
  
  private handleCameraCenter(): void {
    if (this.playerHero) {
      this.cameraController.followSprite(this.playerHero.sprite)
    }
  }
  
  private async handleEditorToggle(): Promise<void> {
    console.log('↩️ Returning to Map Editor')
    await this.cameraController.fadeOut(300)
    
    // Get the original scene data and ensure it has the proper structure for the editor
    const originalSceneData = this.scene.settings.data as any
    
    // Create a clean data structure that the editor expects
    const editorData = {
      width: originalSceneData.width || 50,
      height: originalSceneData.height || 50,
      terrain: originalSceneData.terrain || [],
      structures: originalSceneData.structures || [],
      units: originalSceneData.units || [],
      metadata: {
        fromEditor: true,
        wasSaved: originalSceneData.metadata?.wasSaved || false,
        createdAt: originalSceneData.metadata?.createdAt || new Date().toISOString()
      }
    }
    
    console.log('📤 Returning to editor with cleaned data structure:', {
      width: editorData.width,
      height: editorData.height,
      terrainCount: editorData.terrain.length,
      structureCount: editorData.structures.length,
      unitCount: editorData.units.length
    })
    
    // Use scene.stop to ensure clean shutdown, then start the editor
    this.scene.stop()
    this.scene.start('MapEditorScene', editorData)
  }

  private setupPhysicsGroups(): void {
    this.unitCollisionGroup = this.physics.add.group()
    this.projectileGroup = this.physics.add.group()
  }

  private createTestMap() {
    // Create all graphics first
    this.mapManager.createAllGraphics()
    
    // Center camera
    this.cameraController.setZoom(1)
    this.cameraController.centerOn(512, 384)
    
    // Create player hero near the center
    const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
    this.playerHero = this.mapManager.createHero(16, 12, heroStats, this.unitCollisionGroup)
    this.unitManager.addUnit(this.playerHero)
    this.unitManager.registerUnitPosition(this.playerHero, 16, 12)
    
    // Create some enemy units for testing combat
    this.mapManager.createEnemyUnits(
      this.unitManager.getUnits(), 
      this.unitCollisionGroup, 
      (unit, x, y) => this.unitManager.registerUnitPosition(unit, x, y)
    )
    
    this.createRiver()
    
    // Add info text
    this.uiManager.createInfoText(false)
  }



  private createRiver() {
    // Create a river flowing vertically, avoiding the building area
    // First segment: from top to before building
    const upperRiver = StructureBuilder.createRiver(
      this,
      { x: 50, y: 10 },   // start
      { x: 10, y: 20 },  // end (before building)
      3  // width
    )
    
    // Add structures to managers
    upperRiver.forEach(water => {
      this.unitManager.addStructure(water)
      this.unitManager.registerUnitPosition(water, water.isometricX, water.isometricY)
      // Make UI camera ignore world objects
      this.uiCamera.ignore(water.sprite)
    })
  }















  


  private createGameFromMapData(mapData: MapData): void {
    console.log('🏗️ createGameFromMapData called with:', {
      width: mapData.width,
      height: mapData.height,
      terrainCount: mapData.terrain?.length || 0,
      structureCount: mapData.structures?.length || 0,
      unitCount: mapData.units?.length || 0
    })
    
    try {
      // Create all graphics first
      this.mapManager.createAllGraphics()
      
      // Center camera
      this.cameraController.setZoom(1)
      this.cameraController.centerOn(512, 384)
      
      // Create player hero if none exists in the map data
      const hasHero = mapData.units && mapData.units.some(unit => unit.type === 'hero')
      console.log('🏗️ Hero check:', { hasHero, unitsArray: mapData.units })
      
      if (!hasHero) {
        console.log('🏗️ Creating default hero')
        const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
        this.playerHero = this.mapManager.createHero(16, 12, heroStats, this.unitCollisionGroup)
        this.unitManager.addUnit(this.playerHero)
        this.unitManager.registerUnitPosition(this.playerHero, 16, 12)
      }
      
      // Load map data
      console.log('🏗️ Loading map data...')
      this.mapManager.loadMapFromData(
        mapData,
        this.unitManager.getStructures(),
        this.unitManager.getUnits(),
        this.unitCollisionGroup,
        (unit, x, y) => this.unitManager.registerUnitPosition(unit, x, y),
        (unit, x, y) => this.unitManager.removeUnitPosition(unit, x, y)
      )
      
      // Add info text with metadata info
      const metadata = (mapData as any).metadata
      this.uiManager.createInfoText(true, metadata)
      
      console.log('🏗️ createGameFromMapData completed successfully')
    } catch (error) {
      console.error('❌ Error in createGameFromMapData:', error)
      console.error('❌ Failed with map data:', mapData)
      // Fall back to test map if creation fails
      this.createTestMap()
    }
  }

  public createMapFromEditor(): void {
    // This will be called when switching from the editor
    // The editor can pass map data through the scene data
    const mapData = this.scene.settings.data as MapData
    if (mapData) {
      this.createGameFromMapData(mapData)
    }
  }

  // Delegate methods for unit pathfinding compatibility
  public canUnitMoveTo(unit: any, targetX: number, targetY: number): boolean {
    return this.unitManager.canUnitMoveTo(unit, targetX, targetY)
  }

  public updateUnitPosition(unit: any, oldX: number, oldY: number, newX: number, newY: number): void {
    this.unitManager.updateUnitPosition(unit, oldX, oldY, newX, newY)
  }

  public findPathForUnit(unit: any, targetX: number, targetY: number): Array<{x: number, y: number}> {
    return this.unitManager.findPathForUnit(unit, targetX, targetY)
  }

  public cleanup(): void {
    if (this.inputManager) this.inputManager.destroy()
    if (this.mapManager) this.mapManager.destroy()
    if (this.unitManager) this.unitManager.destroy()
    if (this.combatSystem) this.combatSystem.destroy()
    if (this.uiManager) this.uiManager.destroy()
  }
}