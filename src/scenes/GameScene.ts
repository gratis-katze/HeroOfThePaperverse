import Phaser from 'phaser'
import { Hero, BasicUnit, Structure, Destructible, Unit } from '../units'
import { HeroStats, BasicUnitType, CombatStats, StructureType } from '../units'
import { IsometricGraphics } from '../graphics/IsometricGraphics'
import { StructureBuilder } from '../utils/StructureBuilder'
import { Pathfinding, PathfindingGrid } from '../utils/Pathfinding'
import { Projectile } from '../units/Projectile'
import { MapData, TerrainType } from './MapEditorScene'

export class GameScene extends Phaser.Scene implements PathfindingGrid {
  private units: Array<Hero | BasicUnit | Structure | Destructible> = []
  private playerHero!: Hero
  private structures: Array<Structure> = []
  private terrain: Map<string, Phaser.GameObjects.Image> = new Map()
  private occupiedPositions: Map<string, Unit> = new Map()
  private pathfinding: Pathfinding
  private projectiles: Array<Projectile> = []
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys & { q: Phaser.Input.Keyboard.Key }
  private unitCollisionGroup!: Phaser.Physics.Arcade.Group
  private projectileGroup!: Phaser.Physics.Arcade.Group
  private lastShotTime: number = 0
  private shotCooldown: number = 300
  private aimDirection: { x: number, y: number } | null = null
  
  // Camera controls
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private cameraStartX: number = 0
  private cameraStartY: number = 0
  private zoomLevel: number = 1
  private readonly MIN_ZOOM = 0.25
  private readonly MAX_ZOOM = 3
  private wasd!: any
  
  // UI Elements
  private uiCamera!: Phaser.Cameras.Scene2D.Camera
  private loadingContainer!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'GameScene' })
    this.pathfinding = new Pathfinding(this)
  }
  
  private resetSceneState(): void {
    console.log('🔄 Resetting GameScene state')
    
    // Clear arrays
    this.units = []
    this.structures = []
    this.projectiles = []
    
    // Clear maps
    this.terrain.clear()
    this.occupiedPositions.clear()
    
    // Reset camera properties
    this.isDragging = false
    this.zoomLevel = 1
    
    // Reset shooting properties  
    this.lastShotTime = 0
    this.aimDirection = null
    
    console.log('🔄 GameScene state reset complete')
  }

  preload() {
    this.createAllGraphics()
  }

  create() {
    console.log('🎮 GameScene create() called')
    
    // Reset scene state to ensure clean initialization
    this.resetSceneState()
    
    // Create UI camera that stays at zoom level 1 and renders only UI elements
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.uiCamera.setZoom(1)
    
    // Ensure physics debug is ignored by UI camera after everything is set up
    this.time.delayedCall(100, () => {
      if (this.physics.world.debugGraphic) {
        this.uiCamera.ignore(this.physics.world.debugGraphic)
        console.log('🔧 UI camera configured to ignore physics debug')
      }
    })
    
    // Fade in effect
    this.cameras.main.fadeIn(300, 0, 0, 0)
    
    this.setupPhysicsGroups()
    
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
      this.showLoadingMessage(sceneData.metadata)
      // Delay map creation to show loading message
      this.time.delayedCall(500, () => {
        this.createGameFromMapData(sceneData)
        this.hideLoadingMessage()
      })
    } else if (sceneData && (sceneData.structures?.length > 0 || sceneData.units?.length > 0)) {
      console.log('🎮 Creating game from existing map data')
      this.createGameFromMapData(sceneData)
    } else {
      console.log('🎮 Creating test map (no valid data found)')
      this.createTestMap()
    }
    
    this.setupMouseInput()
    this.setupKeyboardInput()
    
    console.log('🎮 GameScene initialization complete')
  }

  update(time: number, delta: number) {
    // Continuously ensure UI camera ignores physics debug graphics
    if (this.physics.world.debugGraphic && this.uiCamera) {
      this.uiCamera.ignore(this.physics.world.debugGraphic)
    }
    
    // Ensure UI camera ignores all health bars
    if (this.uiCamera) {
      this.units.forEach(unit => {
        if (unit && unit.healthBar) {
          this.uiCamera.ignore(unit.healthBar.getContainer())
        }
      })
      
      // Ensure UI camera ignores all projectiles
      this.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite) {
          this.uiCamera.ignore(projectile.sprite)
        }
      })
    }
    this.units.forEach(unit => {
      if (unit && typeof unit.update === 'function') {
        unit.update(time, delta)
      }
    })
    
    this.projectiles.forEach((projectile, index) => {
      if (projectile && projectile.sprite && projectile.sprite.scene) {
        projectile.update()
      } else {
        this.projectiles.splice(index, 1)
      }
    })
    
    this.cleanupDeadUnits()
    this.handleInput()
    this.handleCameraMovement()
  }

  private cleanupDeadUnits(): void {
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

  private createAllGraphics() {
    IsometricGraphics.createHeroGraphic(this, 'hero')
    IsometricGraphics.createWarriorGraphic(this, 'warrior')
    IsometricGraphics.createArcherGraphic(this, 'archer')
    IsometricGraphics.createWaterBlockGraphic(this, 'water_block')
    IsometricGraphics.createWallBlockGraphic(this, 'wall_block')
    IsometricGraphics.createRockBlockGraphic(this, 'rock_block')
    IsometricGraphics.createTreeGraphic(this, 'tree')
    IsometricGraphics.createRockGraphic(this, 'rock')
    IsometricGraphics.createProjectileGraphic(this, 'projectile')
    
    // Create terrain graphics
    IsometricGraphics.createGrassTerrainGraphic(this, 'grass_terrain')
    IsometricGraphics.createSnowTerrainGraphic(this, 'snow_terrain')
    IsometricGraphics.createRockTerrainGraphic(this, 'rock_terrain')
    IsometricGraphics.createMudTerrainGraphic(this, 'mud_terrain')
    IsometricGraphics.createSandTerrainGraphic(this, 'sand_terrain')
  }

  private setupPhysicsGroups(): void {
    this.unitCollisionGroup = this.physics.add.group()
    this.projectileGroup = this.physics.add.group()
  }

  private createTestMap() {
    // Center camera
    this.cameras.main.setZoom(1)
    this.cameras.main.centerOn(512, 384)
    
    // Create player hero near the center
    const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
    this.playerHero = new Hero(this, 16, 12, 'hero', 'Player Hero', heroStats)
    this.units.push(this.playerHero)
    this.registerUnitPosition(this.playerHero, 16, 12)
    this.unitCollisionGroup.add(this.playerHero.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(this.playerHero.sprite)
    if (this.playerHero.healthBar) {
      this.uiCamera.ignore(this.playerHero.healthBar.getContainer())
    }
    
    // Create some enemy units for testing combat
    this.createEnemyUnits()
    
    this.createRiver()
    
    // Add info text
    const infoText = this.add.text(10, 10, 'Combat Test Map\nLeft Click: Move hero | Right Click + Drag: Pan camera\nWASD: Move camera | Mouse Wheel: Zoom | +/-: Zoom | 0: Reset zoom\nHold Q: Shoot projectiles | Home: Center on hero | E: Map Editor', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    // Make only the UI camera render info text
    this.cameras.main.ignore(infoText)
  }

  private createEnemyUnits(): void {
    // Create warrior enemy
    const warriorStats: CombatStats = { health: 60, attack: 15, defense: 3, attackSpeed: 1, movementSpeed: 100 }
    const warrior = new BasicUnit(this, 60, 15, 'warrior', 'Enemy Warrior', BasicUnitType.WARRIOR, warriorStats)
    this.units.push(warrior)
    this.registerUnitPosition(warrior, 60, 15)
    this.unitCollisionGroup.add(warrior.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(warrior.sprite)
    if (warrior.healthBar) {
      this.uiCamera.ignore(warrior.healthBar.getContainer())
    }
    
    // Create archer enemy  
    const archerStats: CombatStats = { health: 40, attack: 20, defense: 1, attackSpeed: 1.5, movementSpeed: 120 }
    const archer = new BasicUnit(this, 18, 8, 'archer', 'Enemy Archer', BasicUnitType.ARCHER, archerStats)
    this.units.push(archer)
    this.registerUnitPosition(archer, 18, 8)
    this.unitCollisionGroup.add(archer.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(archer.sprite)
    if (archer.healthBar) {
      this.uiCamera.ignore(archer.healthBar.getContainer())
    }
    
    console.log(`💀 Created ${this.units.filter(u => u instanceof BasicUnit).length} enemy units for combat testing`)
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
    this.units.push(...upperRiver)
    this.structures.push(...upperRiver)
    // Register positions for upper river
    upperRiver.forEach(water => {
      this.registerUnitPosition(water, water.isometricX, water.isometricY)
      // Make UI camera ignore world objects
      this.uiCamera.ignore(water.sprite)
    })

  }

  private setupMouseInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        // Right click starts camera drag
        this.isDragging = true
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.cameraStartX = this.cameras.main.scrollX
        this.cameraStartY = this.cameras.main.scrollY
        this.input.setDefaultCursor('grabbing')
      } else {
        // Left click for unit movement
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const isoX = Math.floor((worldPoint.x / 32 + worldPoint.y / 16) / 2)
        const isoY = Math.floor((worldPoint.y / 16 - worldPoint.x / 32) / 2)
        
        console.log(`🖱️ Mouse clicked: screen(${Math.round(pointer.x)}, ${Math.round(pointer.y)}) -> world(${Math.round(worldPoint.x)}, ${Math.round(worldPoint.y)}) -> iso(${isoX}, ${isoY})`)
        
        // Use pathfinding to find a valid route
        const path = this.findPathForUnit(this.playerHero, isoX, isoY)
        if (path.length > 1) {
          console.log(`✅ GameScene: Path found, starting movement`)
          this.playerHero.followPath(path)
        } else {
          console.log(`❌ GameScene: No path found to target position`)
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
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.rightButtonReleased()) {
        this.isDragging = false
        this.input.setDefaultCursor('default')
      }
    })

    // Mouse wheel for zooming
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1
      const newZoom = Phaser.Math.Clamp(this.zoomLevel * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM)
      
      if (newZoom !== this.zoomLevel) {
        this.zoomLevel = newZoom
        this.cameras.main.setZoom(this.zoomLevel)
        console.log(`🔍 Zoom: ${this.zoomLevel.toFixed(2)}x`)
      }
    })
  }

  private setupKeyboardInput(): void {
    this.keys = this.input.keyboard!.addKeys({
      up: 'UP',
      down: 'DOWN', 
      left: 'LEFT',
      right: 'RIGHT',
      q: 'Q'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & { q: Phaser.Input.Keyboard.Key }

    // Add WASD for camera movement
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D')

    // Return to Editor hotkey
    this.input.keyboard!.on('keydown-E', () => {
      console.log('↩️ Returning to Map Editor')
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
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
      })
    })

    // Zoom shortcuts
    this.input.keyboard!.on('keydown-PLUS', () => this.zoomIn())
    this.input.keyboard!.on('keydown-MINUS', () => this.zoomOut())
    this.input.keyboard!.on('keydown-ZERO', () => this.resetZoom())

    // Center camera on player
    this.input.keyboard!.on('keydown-HOME', () => {
      if (this.playerHero) {
        this.cameras.main.startFollow(this.playerHero.sprite)
        this.cameras.main.stopFollow()
        console.log('📍 Camera centered on player hero')
      }
    })

    // Set up collision detection
    this.physics.add.overlap(
      this.projectileGroup,
      this.unitCollisionGroup,
      (projectileSprite, unitSprite) => {
        const projectileGameObject = projectileSprite as Phaser.Physics.Arcade.Sprite
        const unitGameObject = unitSprite as Phaser.Physics.Arcade.Sprite
        const projectile = projectileGameObject.getData('projectile') as Projectile
        const unit = unitGameObject.getData('unit') as Unit
        
        if (projectile && unit && unit !== projectile.owner) {
          projectile.onHit(unit)
        }
      }
    )
  }

  private handleInput(): void {
    if (this.keys.q.isDown) {
      // Capture aim direction when Q is first pressed
      if (!this.aimDirection) {
        const pointer = this.input.activePointer
        // Convert screen coordinates to world coordinates
        const worldX = pointer.worldX
        const worldY = pointer.worldY
        this.aimDirection = { x: worldX, y: worldY }
      }
      
      const currentTime = this.time.now
      if (currentTime - this.lastShotTime >= this.shotCooldown) {
        this.shootProjectileInDirection()
        this.lastShotTime = currentTime
      }
    } else {
      // Reset aim direction when Q is released
      this.aimDirection = null
    }
  }

  private shootProjectileInDirection(): void {
    if (!this.aimDirection) return
    
    const targetX = this.aimDirection.x
    const targetY = this.aimDirection.y
    
    const projectile = new Projectile(
      this,
      this.playerHero.sprite.x,
      this.playerHero.sprite.y,
      targetX,
      targetY,
      25,
      this.playerHero,
      this.projectileGroup
    )
    
    this.projectiles.push(projectile)
    
    // Make UI camera ignore the projectile sprite
    if (this.uiCamera) {
      this.uiCamera.ignore(projectile.sprite)
    }
    
    console.log(`🏹 Hero shot projectile towards aim direction at (${Math.round(targetX)}, ${Math.round(targetY)})`)
    console.log(`🏹 Projectile sprite position:`, projectile.sprite.x, projectile.sprite.y)
    console.log(`🏹 Projectile group size:`, this.projectileGroup.children.size)
  }

  private handleCameraMovement(): void {
    const cameraSpeed = 300 / this.zoomLevel // Faster when zoomed out

    // WASD camera movement
    if (this.wasd.W.isDown) {
      this.cameras.main.scrollY -= cameraSpeed * (1/60) // Assuming 60 FPS
    }
    if (this.wasd.S.isDown) {
      this.cameras.main.scrollY += cameraSpeed * (1/60)
    }
    if (this.wasd.A.isDown) {
      this.cameras.main.scrollX -= cameraSpeed * (1/60)
    }
    if (this.wasd.D.isDown) {
      this.cameras.main.scrollX += cameraSpeed * (1/60)
    }

    // You can still use arrow keys for camera if not using them for hero movement
    // (currently arrow keys aren't used in the game scene)
  }

  private zoomIn(): void {
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * 1.2, this.MIN_ZOOM, this.MAX_ZOOM)
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.cameras.main.setZoom(this.zoomLevel)
      console.log(`🔍 Zoom In: ${this.zoomLevel.toFixed(2)}x`)
    }
  }

  private zoomOut(): void {
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * 0.8, this.MIN_ZOOM, this.MAX_ZOOM)
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.cameras.main.setZoom(this.zoomLevel)
      console.log(`🔍 Zoom Out: ${this.zoomLevel.toFixed(2)}x`)
    }
  }

  private resetZoom(): void {
    this.zoomLevel = 1
    this.cameras.main.setZoom(this.zoomLevel)
    console.log(`🔍 Zoom Reset: ${this.zoomLevel.toFixed(2)}x`)
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

  public loadMapFromData(mapData: MapData): void {
    // Clear existing terrain
    this.terrain.forEach(terrainSprite => terrainSprite.destroy())
    this.terrain.clear()
    
    // Clear existing structures and units (except player hero)
    this.structures.forEach(structure => {
      structure.destroy()
      this.removeUnitPosition(structure, structure.isometricX, structure.isometricY)
    })
    this.structures = []

    // Remove non-hero units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]
      if (!(unit instanceof Hero)) {
        if (unit instanceof BasicUnit) {
          this.unitCollisionGroup.remove(unit.sprite)
        }
        unit.destroy()
        this.removeUnitPosition(unit as Unit, unit.isometricX, unit.isometricY)
        this.units.splice(i, 1)
      }
    }

    // Load terrain from map data
    if (mapData.terrain) {
      mapData.terrain.forEach(terrainData => {
        this.loadTerrain(terrainData.x, terrainData.y, terrainData.type)
      })
    }

    // Load structures from map data
    mapData.structures.forEach(structData => {
      this.loadStructure(structData.x, structData.y, structData.type)
    })

    // Load units from map data
    mapData.units.forEach(unitData => {
      if (unitData.type !== 'hero') { // Don't replace the player hero
        this.loadUnit(unitData.x, unitData.y, unitData.type, unitData.stats as CombatStats)
      }
    })

    console.log(`📁 Loaded map with ${mapData.terrain?.length || 0} terrain tiles, ${mapData.structures.length} structures and ${mapData.units.length} units`)
  }

  private loadStructure(x: number, y: number, type: StructureType): void {
    const textureMap = {
      [StructureType.WATER]: 'water_block',
      [StructureType.WALL]: 'wall_block',
      [StructureType.ROCK]: 'rock_block'
    }

    const structure = new Structure(
      this,
      x,
      y,
      textureMap[type],
      `${type} Block`,
      type
    )

    this.structures.push(structure)
    this.units.push(structure)
    this.registerUnitPosition(structure, x, y)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
  }

  private loadTerrain(x: number, y: number, type: TerrainType): void {
    const key = `${x},${y}`
    const screenPos = this.isometricToScreen(x, y)
    
    const textureMap = {
      [TerrainType.GRASS]: 'grass_terrain',
      [TerrainType.SNOW]: 'snow_terrain',
      [TerrainType.ROCK]: 'rock_terrain',
      [TerrainType.MUD]: 'mud_terrain',
      [TerrainType.SAND]: 'sand_terrain'
    }
    
    const terrainSprite = this.add.image(screenPos.x, screenPos.y, textureMap[type])
    terrainSprite.setDepth(-1000) // Render behind everything else
    this.terrain.set(key, terrainSprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(terrainSprite)
  }
  
  private isometricToScreen(isoX: number, isoY: number): {x: number, y: number} {
    const x = (isoX - isoY) * 32
    const y = (isoX + isoY) * 16
    return { x, y }
  }

  private loadUnit(x: number, y: number, type: BasicUnitType, stats: CombatStats): void {
    const unit = new BasicUnit(this, x, y, type, `Loaded ${type}`, type, stats)
    this.units.push(unit)
    this.registerUnitPosition(unit, x, y)
    this.unitCollisionGroup.add(unit.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(unit.sprite)
    if (unit.healthBar) {
      this.uiCamera.ignore(unit.healthBar.getContainer())
    }
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
      // Center camera
      this.cameras.main.setZoom(1)
      this.cameras.main.centerOn(512, 384)
      
      // Create player hero if none exists in the map data
      const hasHero = mapData.units && mapData.units.some(unit => unit.type === 'hero')
      console.log('🏗️ Hero check:', { hasHero, unitsArray: mapData.units })
      
      if (!hasHero) {
        console.log('🏗️ Creating default hero')
        const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
        this.playerHero = new Hero(this, 16, 12, 'hero', 'Player Hero', heroStats)
        this.units.push(this.playerHero)
        this.registerUnitPosition(this.playerHero, 16, 12)
        this.unitCollisionGroup.add(this.playerHero.sprite)
        
        // Make UI camera ignore world objects
        this.uiCamera.ignore(this.playerHero.sprite)
        if (this.playerHero.healthBar) {
          this.uiCamera.ignore(this.playerHero.healthBar.getContainer())
        }
      }
      
      // Load map data
      console.log('🏗️ Loading map data...')
      this.loadMapFromData(mapData)
      
      // Add info text with metadata info
      const metadata = (mapData as any).metadata
      let titleText = 'Custom Map'
      if (metadata?.fromEditor) {
        titleText += metadata.wasSaved ? ' (Saved)' : ' (Unsaved)'
      }
      titleText += '!'
      
      console.log('🏗️ Creating info text')
      const customMapInfoText = this.add.text(10, 10, `${titleText}\nLeft Click: Move hero | Right Click + Drag: Pan camera\nWASD: Move camera | Mouse Wheel: Zoom | +/-: Zoom | 0: Reset zoom\nHold Q: Shoot projectiles | Home: Center on hero | E: Return to Editor`, {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
      })
      // Make only the UI camera render info text
      this.cameras.main.ignore(customMapInfoText)
      
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
      this.loadMapFromData(mapData)
    }
  }

  private showLoadingMessage(metadata: any): void {
    // Create loading overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    )

    // Create loading container
    this.loadingContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY)

    // Loading message
    const title = this.add.text(0, -30, '⚡ Loading Custom Map...', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    title.setOrigin(0.5, 0.5)

    // Status message
    const status = metadata.wasSaved ? 'Map was saved to your downloads' : 'Unsaved map from editor'
    const statusText = this.add.text(0, 10, status, {
      fontSize: '14px',
      color: '#cccccc'
    })
    statusText.setOrigin(0.5, 0.5)

    // Loading animation - create spinning isometric cube
    const spinner = this.add.text(0, 40, '🎲', {
      fontSize: '32px'
    })
    spinner.setOrigin(0.5, 0.5)
    
    // Animate the spinner
    this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    })

    this.loadingContainer.add([overlay, title, statusText, spinner])
    
    // Make only the UI camera render loading UI
    this.cameras.main.ignore([overlay, this.loadingContainer])
  }

  private hideLoadingMessage(): void {
    if (this.loadingContainer) {
      this.tweens.add({
        targets: this.loadingContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.loadingContainer.destroy()
        }
      })
    }
  }
}