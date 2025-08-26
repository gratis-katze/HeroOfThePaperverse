import Phaser from 'phaser'
import { Structure, StructureType, BasicUnit, BasicUnitType, Hero, CombatStats, HeroStats } from '../units'
import { IsometricGraphics } from '../graphics/IsometricGraphics'

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
  private currentTool: EditorTool = EditorTool.PLACE
  private selectedBlockType: StructureType = StructureType.WALL
  private selectedUnitType: 'hero' | BasicUnitType = 'hero'
  private selectedTerrainType: TerrainType = TerrainType.GRASS
  private activeItemType: 'terrain' | 'block' | 'unit' = 'terrain'
  
  private terrain: Map<string, Phaser.GameObjects.Image> = new Map()
  private structures: Array<Structure> = []
  private units: Array<Hero | BasicUnit> = []
  private placedItems: Map<string, Structure | Hero | BasicUnit> = new Map()
  
  // Map settings
  private mapWidth: number = 50
  private mapHeight: number = 50
  
  // Camera controls
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private cameraStartX: number = 0
  private cameraStartY: number = 0
  private zoomLevel: number = 1
  private readonly MIN_ZOOM = 0.25
  private readonly MAX_ZOOM = 2
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  
  // UI Elements
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private navBar!: Phaser.GameObjects.Container
  private gridOverlay!: Phaser.GameObjects.Graphics
  private statusText!: Phaser.GameObjects.Text
  private categoryButtons: Map<string, {bg: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text}> = new Map()
  private subCategoryContainer!: Phaser.GameObjects.Container
  private activeCategory: string = 'terrain'
  private navBarHeight: number = 80
  
  // Grid settings
  private readonly ISO_WIDTH = 32
  private readonly ISO_HEIGHT = 16
  private showGrid = true
  private gridRedrawPending = false
  
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
    
    // Set up main camera with bounds for the current map size
    this.setupCamera()
    
    this.createUI()
    this.createGridOverlay()
    this.setupInput()
    
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
    
    // Ensure UI camera ignores all health bars
    if (this.uiCamera) {
      [...this.structures, ...this.units].forEach(unit => {
        if (unit && unit.healthBar) {
          this.uiCamera.ignore(unit.healthBar.getContainer())
        }
      })
    }
    // Handle continuous camera movement with keyboard
    const cameraSpeed = 300 / this.zoomLevel // Faster when zoomed out
    let moved = false

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.cameras.main.scrollX -= cameraSpeed * (1/60) // Assuming 60 FPS
      moved = true
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.cameras.main.scrollX += cameraSpeed * (1/60)
      moved = true
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.cameras.main.scrollY -= cameraSpeed * (1/60)
      moved = true
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.cameras.main.scrollY += cameraSpeed * (1/60)
      moved = true
    }

    if (moved) {
      this.updateStatusText()
      // Throttled grid redraw for performance
      if (this.showGrid && !this.gridRedrawPending) {
        this.gridRedrawPending = true
        this.time.delayedCall(50, () => {
          this.drawGrid()
          this.gridRedrawPending = false
        })
      }
    }
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

  private createUI() {
    this.createNavBar()
    this.createStatusBar()
  }

  private createNavBar() {
    // Create navigation bar container
    this.navBar = this.add.container(0, 0)
    this.navBar.setDepth(1000)

    // Nav bar background
    const screenWidth = this.cameras.main.width
    const navBg = this.add.rectangle(screenWidth / 2, this.navBarHeight / 2, screenWidth, this.navBarHeight, 0x2a2a2a, 0.95)
    navBg.setDepth(999)

    // Make only the UI camera render these elements
    this.cameras.main.ignore([this.navBar, navBg])
    this.uiCamera.ignore([]) // UI camera renders everything except what we tell it to ignore

    // Create categorized navigation system
    this.createCategorizedNav()
  }

  private createCategorizedNav() {
    const screenWidth = this.cameras.main.width
    const categorySpacing = 90
    const startX = 80
    const categoryY = 25
    const subCategoryY = 55

    // Create category buttons (Tools, Terrain, Blocks, Units, Map)
    const categories = [
      { key: 'tools', label: 'Tools', items: [
        { label: 'Place', action: () => this.setTool(EditorTool.PLACE) },
        { label: 'Erase', action: () => this.setTool(EditorTool.ERASE) }
      ]},
      { key: 'terrain', label: 'Terrain', items: [
        { label: 'Grass', action: () => this.setTerrainType(TerrainType.GRASS) },
        { label: 'Snow', action: () => this.setTerrainType(TerrainType.SNOW) },
        { label: 'Rock', action: () => this.setTerrainType(TerrainType.ROCK) },
        { label: 'Mud', action: () => this.setTerrainType(TerrainType.MUD) },
        { label: 'Sand', action: () => this.setTerrainType(TerrainType.SAND) }
      ]},
      { key: 'blocks', label: 'Blocks', items: [
        { label: 'Water', action: () => this.setBlockType(StructureType.WATER) },
        { label: 'Wall', action: () => this.setBlockType(StructureType.WALL) },
        { label: 'Rock', action: () => this.setBlockType(StructureType.ROCK) }
      ]},
      { key: 'units', label: 'Units', items: [
        { label: 'Hero', action: () => this.setUnitType('hero') },
        { label: 'Warrior', action: () => this.setUnitType(BasicUnitType.WARRIOR) },
        { label: 'Archer', action: () => this.setUnitType(BasicUnitType.ARCHER) }
      ]},
      { key: 'map', label: 'Map', items: [
        { label: '25x25', action: () => this.setMapSize(25, 25) },
        { label: '50x50', action: () => this.setMapSize(50, 50) },
        { label: '100x100', action: () => this.setMapSize(100, 100) },
        { label: 'Clear', action: () => this.clearMap() },
        { label: 'Save', action: () => this.saveMap() },
        { label: 'Load', action: () => this.loadMap() },
        { label: 'Test', action: () => this.playTest() }
      ]}
    ]

    // Create category buttons
    let currentX = startX
    categories.forEach(category => {
      const isActive = this.activeCategory === category.key
      const button = this.createFixedNavButton(currentX, categoryY, category.label, 
        () => this.setActiveCategory(category.key), isActive)
      
      this.categoryButtons.set(category.key, button)
      currentX += categorySpacing
    })

    // Create sub-category container
    this.subCategoryContainer = this.add.container(0, 0)
    this.subCategoryContainer.setDepth(1001)
    
    // Make only the UI camera render the sub-category container
    this.cameras.main.ignore(this.subCategoryContainer)

    // Initialize with terrain category
    this.updateSubCategories()
  }

  private setActiveCategory(categoryKey: string) {
    this.activeCategory = categoryKey
    this.updateCategoryButtons()
    this.updateSubCategories()
    console.log(`📂 Active category: ${categoryKey}`)
  }

  private updateCategoryButtons() {
    this.categoryButtons.forEach((button, key) => {
      const isActive = key === this.activeCategory
      button.bg.setFillStyle(isActive ? 0x4a9eff : 0x404040)
      button.label.setStyle({ 
        color: isActive ? '#ffffff' : '#cccccc',
        fontStyle: isActive ? 'bold' : 'normal'
      })
    })
  }

  private updateSubCategories() {
    // Clear existing sub-category buttons
    this.subCategoryContainer.removeAll(true)

    const subCategoryY = 55
    const buttonSpacing = 70
    let startX = 80

    // Get items for active category
    const categoryItems = this.getCategoryItems(this.activeCategory)
    
    categoryItems.forEach((item, index) => {
      const isActive = this.isItemActive(item, this.activeCategory)
      const button = this.createFixedNavButton(startX + (index * buttonSpacing), subCategoryY, 
        item.label, item.action, isActive)
      
      this.subCategoryContainer.add([button.bg, button.label])
    })
  }

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
        return (item.label === 'Place' && this.currentTool === EditorTool.PLACE) ||
               (item.label === 'Erase' && this.currentTool === EditorTool.ERASE)
      case 'terrain':
        return this.activeItemType === 'terrain' && 
               ((item.label === 'Grass' && this.selectedTerrainType === TerrainType.GRASS) ||
                (item.label === 'Snow' && this.selectedTerrainType === TerrainType.SNOW) ||
                (item.label === 'Rock' && this.selectedTerrainType === TerrainType.ROCK) ||
                (item.label === 'Mud' && this.selectedTerrainType === TerrainType.MUD) ||
                (item.label === 'Sand' && this.selectedTerrainType === TerrainType.SAND))
      case 'blocks':
        return this.activeItemType === 'block' &&
               ((item.label === 'Water' && this.selectedBlockType === StructureType.WATER) ||
                (item.label === 'Wall' && this.selectedBlockType === StructureType.WALL) ||
                (item.label === 'Rock' && this.selectedBlockType === StructureType.ROCK))
      case 'units':
        return this.activeItemType === 'unit' &&
               ((item.label === 'Hero' && this.selectedUnitType === 'hero') ||
                (item.label === 'Warrior' && this.selectedUnitType === BasicUnitType.WARRIOR) ||
                (item.label === 'Archer' && this.selectedUnitType === BasicUnitType.ARCHER))
      default:
        return false
    }
  }

  private createStatusBar() {
    // Status text at bottom of screen
    this.statusText = this.add.text(10, this.cameras.main.height - 30, this.getStatusText(), {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setDepth(1000)
    
    // Make only the UI camera render the status text
    this.cameras.main.ignore(this.statusText)
  }

  private createFixedNavButton(x: number, y: number, text: string, onClick: () => void, isActive: boolean = false) {
    const bg = this.add.rectangle(x, y, 70, 25, isActive ? 0x4a9eff : 0x404040)
    bg.setDepth(1001)
    bg.setInteractive({ useHandCursor: true })
    
    const label = this.add.text(x, y, text, { 
      fontSize: '10px', 
      color: isActive ? '#ffffff' : '#cccccc',
      fontStyle: isActive ? 'bold' : 'normal'
    })
    label.setOrigin(0.5, 0.5)
    label.setDepth(1002)
    
    // Make only the UI camera render these button elements
    this.cameras.main.ignore([bg, label])
    
    bg.on('pointerover', () => {
      if (!isActive) bg.setFillStyle(0x555555)
      label.setStyle({ color: '#ffffff' })
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(isActive ? 0x4a9eff : 0x404040)
      label.setStyle({ color: isActive ? '#ffffff' : '#cccccc' })
    })
    bg.on('pointerdown', () => {
      console.log(`🔘 Nav button clicked: ${text}`)
      onClick()
    })
    
    return { bg, label }
  }

  private getStatusText(): string {
    const mode = this.activeItemType === 'terrain' ? `Terrain: ${this.selectedTerrainType}` :
                 this.activeItemType === 'block' ? `Block: ${this.selectedBlockType}` : 
                 `Unit: ${this.selectedUnitType}`
    return `${this.currentTool.toUpperCase()} - ${mode} | Map: ${this.mapWidth}x${this.mapHeight} | ${this.getCameraInfoText()}`
  }

  private playTest() {
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
      const gameSceneData = {
        ...mapData,
        metadata: {
          fromEditor: true,
          wasSaved: true,
          createdAt: new Date().toISOString()
        }
      }
      
      // Use scene.stop to ensure clean shutdown, then start the new scene
      this.scene.stop()
      this.scene.start('GameScene', gameSceneData)
    })
  }

  private createGridOverlay() {
    this.gridOverlay = this.add.graphics()
    this.drawGrid()
    
    // Make UI camera ignore grid overlay
    this.uiCamera.ignore(this.gridOverlay)
  }

  private drawGrid() {
    this.gridOverlay.clear()
    
    if (!this.showGrid) return

    this.gridOverlay.lineStyle(1, 0x444444, 0.5)

    const bounds = this.cameras.main.getBounds()
    
    // Only draw grid lines that are actually visible, with larger spacing for performance
    const gridSpacing = Math.max(64, 128 / this.zoomLevel) // Adaptive spacing based on zoom
    const startX = Math.floor(bounds.x / gridSpacing) * gridSpacing
    const startY = Math.floor(bounds.y / gridSpacing) * gridSpacing
    const endX = bounds.x + bounds.width + gridSpacing
    const endY = bounds.y + bounds.height + gridSpacing

    // Draw simple grid lines instead of individual diamonds for performance
    this.gridOverlay.beginPath()
    
    // Vertical lines
    for (let x = startX; x < endX; x += gridSpacing) {
      this.gridOverlay.moveTo(x, bounds.y - 50)
      this.gridOverlay.lineTo(x, bounds.y + bounds.height + 50)
    }
    
    // Horizontal lines
    for (let y = startY; y < endY; y += gridSpacing) {
      this.gridOverlay.moveTo(bounds.x - 50, y)
      this.gridOverlay.lineTo(bounds.x + bounds.width + 50, y)
    }
    
    this.gridOverlay.strokePath()
    
    // Optional: Draw fewer isometric diamonds only when zoomed in
    if (this.zoomLevel > 0.5) {
      this.drawIsometricGridPoints(bounds, gridSpacing)
    }
  }

  private drawIsometricGridPoints(bounds: Phaser.Geom.Rectangle, spacing: number) {
    // Only draw isometric grid points when zoomed in for better performance
    const pointSpacing = spacing * 2 // Even fewer points
    const startX = Math.floor(bounds.x / pointSpacing) * pointSpacing
    const startY = Math.floor(bounds.y / pointSpacing) * pointSpacing
    const endX = bounds.x + bounds.width + pointSpacing
    const endY = bounds.y + bounds.height + pointSpacing

    this.gridOverlay.lineStyle(1, 0x666666, 0.3)
    
    for (let screenX = startX; screenX < endX; screenX += pointSpacing) {
      for (let screenY = startY; screenY < endY; screenY += pointSpacing) {
        const isoX = Math.floor((screenX / this.ISO_WIDTH + screenY / this.ISO_HEIGHT) / 2)
        const isoY = Math.floor((screenY / this.ISO_HEIGHT - screenX / this.ISO_WIDTH) / 2)
        
        const drawX = (isoX - isoY) * this.ISO_WIDTH
        const drawY = (isoX + isoY) * this.ISO_HEIGHT
        
        // Draw small diamond
        const size = 8
        this.gridOverlay.beginPath()
        this.gridOverlay.moveTo(drawX, drawY - size)
        this.gridOverlay.lineTo(drawX + size, drawY)
        this.gridOverlay.lineTo(drawX, drawY + size)
        this.gridOverlay.lineTo(drawX - size, drawY)
        this.gridOverlay.closePath()
        this.gridOverlay.strokePath()
      }
    }
  }

  private setupInput() {
    // Mouse input for placement/erasure and camera dragging
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't interact in nav bar area
      if (pointer.y < this.navBarHeight) return
      
      if (pointer.rightButtonDown()) {
        // Right click starts camera drag
        this.isDragging = true
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.cameraStartX = this.cameras.main.scrollX
        this.cameraStartY = this.cameras.main.scrollY
        this.input.setDefaultCursor('grabbing')
      } else {
        // Left click for placement/erasure
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const isoCoords = this.screenToIsometric(worldPoint.x, worldPoint.y)
        
        if (this.currentTool === EditorTool.PLACE) {
          this.placeItem(isoCoords.x, isoCoords.y)
        } else {
          this.eraseItem(isoCoords.x, isoCoords.y)
        }
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = this.dragStartX - pointer.x
        const deltaY = this.dragStartY - pointer.y
        
        this.cameras.main.setScroll(
          this.cameraStartX + deltaX / this.zoomLevel,
          this.cameraStartY + deltaY / this.zoomLevel
        )
        
        this.updateStatusText()
        
        // Throttled grid redraw during drag
        if (this.showGrid && !this.gridRedrawPending) {
          this.gridRedrawPending = true
          this.time.delayedCall(100, () => {
            this.drawGrid()
            this.gridRedrawPending = false
          })
        }
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.rightButtonReleased()) {
        this.isDragging = false
        this.input.setDefaultCursor('default')
      }
    })

    // Mouse wheel for zooming
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      // Don't zoom in nav bar area
      if (pointer.y < this.navBarHeight) return
      
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1
      const newZoom = Phaser.Math.Clamp(this.zoomLevel * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM)
      
      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom
        this.cameras.main.setZoom(this.zoomLevel)
        this.updateStatusText()
        this.drawGrid() // Redraw grid for new zoom level
      }
    })

    // Camera movement with arrow keys only (for basic navigation)
    const cursors = this.input.keyboard!.createCursorKeys()
    const wasd = this.input.keyboard!.addKeys('W,S,A,D')
    
    // Store references for update loop
    this.cursors = cursors
    this.wasd = wasd
  }

  private screenToIsometric(screenX: number, screenY: number): {x: number, y: number} {
    const isoX = Math.floor((screenX / this.ISO_WIDTH + screenY / this.ISO_HEIGHT) / 2)
    const isoY = Math.floor((screenY / this.ISO_HEIGHT - screenX / this.ISO_WIDTH) / 2)
    return { x: isoX, y: isoY }
  }

  private placeItem(isoX: number, isoY: number) {
    const key = `${isoX},${isoY}`
    
    if (this.activeItemType === 'terrain') {
      this.placeTerrain(isoX, isoY)
    } else {
      // Remove existing item if present for blocks/units
      if (this.placedItems.has(key)) {
        this.eraseItem(isoX, isoY)
      }
      
      if (this.activeItemType === 'block') {
        this.placeBlock(isoX, isoY)
      } else {
        this.placeUnit(isoX, isoY)
      }
    }
    
    const itemType = this.activeItemType === 'terrain' ? this.selectedTerrainType : 
                    this.activeItemType === 'block' ? this.selectedBlockType : this.selectedUnitType
    console.log(`🎨 Placed ${itemType} at (${isoX}, ${isoY})`)
  }

  private placeBlock(isoX: number, isoY: number) {
    const textureMap = {
      [StructureType.WATER]: 'water_block',
      [StructureType.WALL]: 'wall_block',
      [StructureType.ROCK]: 'rock_block'
    }
    
    const structure = new Structure(
      this,
      isoX,
      isoY,
      textureMap[this.selectedBlockType],
      `${this.selectedBlockType} Block`,
      this.selectedBlockType
    )
    
    this.structures.push(structure)
    this.placedItems.set(`${isoX},${isoY}`, structure)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
  }

  private placeUnit(isoX: number, isoY: number) {
    let unit: Hero | BasicUnit
    
    if (this.selectedUnitType === 'hero') {
      const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
      unit = new Hero(this, isoX, isoY, 'hero', 'Editor Hero', heroStats)
    } else {
      const unitStats: CombatStats = this.getDefaultUnitStats(this.selectedUnitType)
      unit = new BasicUnit(this, isoX, isoY, this.selectedUnitType, `Editor ${this.selectedUnitType}`, this.selectedUnitType, unitStats)
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

  private placeTerrain(isoX: number, isoY: number) {
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
    
    const terrainSprite = this.add.image(screenPos.x, screenPos.y, textureMap[this.selectedTerrainType])
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

  private eraseItem(isoX: number, isoY: number) {
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

  private setTool(tool: EditorTool) {
    console.log(`🔧 Tool changed to: ${tool}`)
    this.currentTool = tool
    this.activeCategory = 'tools'
    this.updateStatusText()
    this.refreshNavBar()
  }

  private setBlockType(type: StructureType) {
    this.selectedBlockType = type
    this.activeItemType = 'block'
    this.activeCategory = 'blocks'
    this.updateStatusText()
    this.refreshNavBar()
    console.log(`🧱 Selected block: ${type}`)
  }

  private setUnitType(type: 'hero' | BasicUnitType) {
    this.selectedUnitType = type
    this.activeItemType = 'unit'
    this.activeCategory = 'units'
    this.updateStatusText()
    this.refreshNavBar()
    console.log(`👥 Selected unit: ${type}`)
  }

  private setTerrainType(type: TerrainType) {
    this.selectedTerrainType = type
    this.activeItemType = 'terrain'
    this.activeCategory = 'terrain'
    this.updateStatusText()
    this.refreshNavBar()
    console.log(`🌱 Selected terrain: ${type}`)
  }

  private setMapSize(width: number, height: number) {
    console.log(`📏 setMapSize called: ${width} x ${height}`)
    this.mapWidth = width
    this.mapHeight = height
    this.updateStatusText()
    console.log(`📏 Map size changed to ${width} x ${height}`)
    this.setupCamera() // Update camera bounds when map size changes
  }

  private updateStatusText() {
    if (this.statusText) {
      this.statusText.setText(this.getStatusText())
    }
  }

  private refreshNavBar() {
    // Update category and sub-category buttons to reflect current state
    this.updateCategoryButtons()
    this.updateSubCategories()
  }

  private setupCamera() {
    // Calculate map bounds in screen coordinates
    const mapBoundsX = this.mapWidth * this.ISO_WIDTH * 2
    const mapBoundsY = this.mapHeight * this.ISO_HEIGHT * 2
    
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


  private clearMap() {
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

  private saveMap() {
    const terrainData: Array<{x: number, y: number, type: TerrainType}> = []
    this.terrain.forEach((sprite, key) => {
      const [x, y] = key.split(',').map(Number)
      // Find terrain type by checking which texture was used
      const textureKey = sprite.texture.key
      const terrainType = Object.entries({
        [TerrainType.GRASS]: 'grass_terrain',
        [TerrainType.SNOW]: 'snow_terrain',
        [TerrainType.ROCK]: 'rock_terrain',
        [TerrainType.MUD]: 'mud_terrain',
        [TerrainType.SAND]: 'sand_terrain'
      }).find(([_, texture]) => texture === textureKey)?.[0] as TerrainType
      
      if (terrainType) {
        terrainData.push({ x, y, type: terrainType })
      }
    })
    
    const mapData: MapData = {
      width: this.mapWidth,
      height: this.mapHeight,
      terrain: terrainData,
      structures: this.structures.map(s => ({
        x: s.isometricX,
        y: s.isometricY,
        type: s.structureType
      })),
      units: this.units.map(u => {
        if (u instanceof Hero) {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: 'hero' as const,
            stats: { strength: u.stats.strength, intelligence: u.stats.intelligence, agility: u.stats.agility }
          }
        } else {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: u.basicUnitType,
            stats: {
              health: u.maxHealth,
              attack: u.attack,
              defense: u.defense,
              attackSpeed: u.attackSpeed,
              movementSpeed: u.movementSpeed
            }
          }
        }
      })
    }
    
    const jsonData = JSON.stringify(mapData, null, 2)
    this.downloadFile('map.json', jsonData)
    console.log('💾 Map saved')
  }

  private loadMap() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const mapData: MapData = JSON.parse(e.target?.result as string)
            this.loadMapData(mapData)
          } catch (error) {
            console.error('❌ Failed to load map:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  private loadMapData(mapData: MapData) {
    try {
      console.log('🔄 Starting loadMapData with:', mapData)
      
      this.clearMap()
      
      // Update map size with validation
      const width = mapData.width || 50
      const height = mapData.height || 50
      this.setMapSize(width, height)
      
      // Load terrain (if present)
      if (mapData.terrain && Array.isArray(mapData.terrain)) {
        mapData.terrain.forEach(terrainData => {
          if (terrainData && terrainData.type && typeof terrainData.x === 'number' && typeof terrainData.y === 'number') {
            this.selectedTerrainType = terrainData.type
            this.placeTerrain(terrainData.x, terrainData.y)
          }
        })
        console.log(`📁 Loaded ${mapData.terrain.length} terrain tiles`)
      }
      
      // Load structures with validation
      if (mapData.structures && Array.isArray(mapData.structures)) {
        mapData.structures.forEach(structData => {
          if (structData && structData.type && typeof structData.x === 'number' && typeof structData.y === 'number') {
            this.selectedBlockType = structData.type
            this.placeBlock(structData.x, structData.y)
          }
        })
        console.log(`📁 Loaded ${mapData.structures.length} structures`)
      }
      
      // Load units with validation
      if (mapData.units && Array.isArray(mapData.units)) {
        mapData.units.forEach(unitData => {
          if (unitData && unitData.type && typeof unitData.x === 'number' && typeof unitData.y === 'number') {
            this.selectedUnitType = unitData.type
            if (unitData.type === 'hero') {
              const heroStats = unitData.stats as HeroStats
              if (heroStats) {
                const hero = new Hero(this, unitData.x, unitData.y, 'hero', 'Loaded Hero', heroStats)
                this.units.push(hero)
                this.placedItems.set(`${unitData.x},${unitData.y}`, hero)
                
                // Make UI camera ignore world objects
                this.uiCamera.ignore(hero.sprite)
                if (hero.healthBar) {
                  this.uiCamera.ignore(hero.healthBar.getContainer())
                }
              }
            } else {
              const unitStats = unitData.stats as CombatStats
              if (unitStats) {
                const unit = new BasicUnit(this, unitData.x, unitData.y, unitData.type, `Loaded ${unitData.type}`, unitData.type, unitStats)
                this.units.push(unit)
                this.placedItems.set(`${unitData.x},${unitData.y}`, unit)
                
                // Make UI camera ignore world objects
                this.uiCamera.ignore(unit.sprite)
                if (unit.healthBar) {
                  this.uiCamera.ignore(unit.healthBar.getContainer())
                }
              }
            }
          }
        })
        console.log(`📁 Loaded ${mapData.units.length} units`)
      }
      
      console.log('📁 Map loaded successfully')
    } catch (error) {
      console.error('❌ Error loading map data:', error)
      console.error('❌ Map data that failed:', mapData)
      // Fall back to clearing the map if loading fails
      this.clearMap()
    }
  }

  private downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }



  public getMapData(): MapData {
    const terrainData: Array<{x: number, y: number, type: TerrainType}> = []
    this.terrain.forEach((sprite, key) => {
      const [x, y] = key.split(',').map(Number)
      // Find terrain type by checking which texture was used
      const textureKey = sprite.texture.key
      const terrainType = Object.entries({
        [TerrainType.GRASS]: 'grass_terrain',
        [TerrainType.SNOW]: 'snow_terrain',
        [TerrainType.ROCK]: 'rock_terrain',
        [TerrainType.MUD]: 'mud_terrain',
        [TerrainType.SAND]: 'sand_terrain'
      }).find(([_, texture]) => texture === textureKey)?.[0] as TerrainType
      
      if (terrainType) {
        terrainData.push({ x, y, type: terrainType })
      }
    })
    
    return {
      width: this.mapWidth,
      height: this.mapHeight,
      terrain: terrainData,
      structures: this.structures.map(s => ({
        x: s.isometricX,
        y: s.isometricY,
        type: s.structureType
      })),
      units: this.units.map(u => {
        if (u instanceof Hero) {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: 'hero' as const,
            stats: { strength: u.stats.strength, intelligence: u.stats.intelligence, agility: u.stats.agility }
          }
        } else {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: u.basicUnitType,
            stats: {
              health: u.maxHealth,
              attack: u.attack,
              defense: u.defense,
              attackSpeed: u.attackSpeed,
              movementSpeed: u.movementSpeed
            }
          }
        }
      })
    }
  }
}