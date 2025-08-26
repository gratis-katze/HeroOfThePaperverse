import Phaser from 'phaser'
import { ConfigurableHero } from '../units'
import { HeroStats } from '../units'
import { AttackType, UnitConfig } from '../units/UnitConfig'
import { AnimationType } from '../units/AnimationTypes'
import { StructureBuilder } from '../utils/StructureBuilder'
import { MapData } from './MapEditorScene'
import { InputManager, CameraController, MapManager, UnitManager, CombatSystem, UIManager } from '../managers'

export class GameScene extends Phaser.Scene {
  private playerHero: ConfigurableHero | null = null
  private unitCollisionGroup!: Phaser.Physics.Arcade.Group
  private projectileGroup!: Phaser.Physics.Arcade.Group
  private structureCollisionGroup!: Phaser.Physics.Arcade.Group
  
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
    
    // Clear player hero reference before resetting managers
    this.playerHero = null
    
    // Reset managers if they exist
    if (this.unitManager) this.unitManager.reset()
    if (this.combatSystem) this.combatSystem.reset()
    if (this.mapManager) this.mapManager.destroy()
    if (this.uiManager) this.uiManager.destroy()
    
    console.log('🔄 GameScene state reset complete')
  }

  preload() {
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
    
    // Load samurai animation spritesheets
    this.load.spritesheet('samurai_idle', 'assets/sprites/samurai/idle.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('samurai_walk', 'assets/sprites/samurai/run.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('samurai_attack', 'assets/sprites/samurai/attack.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    // Load skeleton animation spritesheets
    this.load.spritesheet('skeleton_idle', 'assets/sprites/skeleton/Idle.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('skeleton_walk', 'assets/sprites/skeleton/Walk.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('skeleton_attack', 'assets/sprites/skeleton/Attack.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('skeleton_death', 'assets/sprites/skeleton/Death.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('skeleton_take_hit', 'assets/sprites/skeleton/Take Hit.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    // Load Flying Eye animation spritesheets
    this.load.spritesheet('flying_eye_flight', 'assets/sprites/flying_eye/Flight.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('flying_eye_attack', 'assets/sprites/flying_eye/Attack.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('flying_eye_death', 'assets/sprites/flying_eye/Death.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('flying_eye_take_hit', 'assets/sprites/flying_eye/Take Hit.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    // Load Goblin animation spritesheets
    this.load.spritesheet('goblin_idle', 'assets/sprites/goblin/Idle.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('goblin_run', 'assets/sprites/goblin/Run.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('goblin_attack', 'assets/sprites/goblin/Attack.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('goblin_death', 'assets/sprites/goblin/Death.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('goblin_take_hit', 'assets/sprites/goblin/Take Hit.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    // Load Mushroom animation spritesheets
    this.load.spritesheet('mushroom_idle', 'assets/sprites/mushroom/Idle.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('mushroom_run', 'assets/sprites/mushroom/Run.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('mushroom_attack', 'assets/sprites/mushroom/Attack.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('mushroom_death', 'assets/sprites/mushroom/Death.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    this.load.spritesheet('mushroom_take_hit', 'assets/sprites/mushroom/Take Hit.png', {
      frameWidth: 150,
      frameHeight: 150
    })
    
    // Load Evil Wizard 3 animation spritesheets
    this.load.spritesheet('evil_wizard_idle', 'assets/sprites/evil_wizard/Idle.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('evil_wizard_walk', 'assets/sprites/evil_wizard/Walk.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('evil_wizard_attack', 'assets/sprites/evil_wizard/Attack.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('evil_wizard_death', 'assets/sprites/evil_wizard/Death.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    this.load.spritesheet('evil_wizard_take_hit', 'assets/sprites/evil_wizard/Get hit.png', {
      frameWidth: 96,
      frameHeight: 96
    })
    
    // MapManager will handle graphics creation
  }

  create() {
    console.log('🎮 GameScene create() called')
    
    // Add scene lifecycle event handlers
    this.events.once('shutdown', this.cleanup, this)
    this.events.once('destroy', this.cleanup, this)
    
    // Reset scene state to ensure clean initialization
    this.resetSceneState()
    
    // Create UI camera that stays at zoom level 1 and renders only UI elements
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height)
    this.uiCamera.setZoom(1)
    
    this.setupPhysicsGroups()
    
    // Create hero animations
    this.createHeroAnimations()
    
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
    
    // Update gold display
    if (this.playerHero && 'gold' in this.playerHero) {
      this.uiManager.updateGoldDisplay(this.playerHero.gold)
    }
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
      onHeroAttack: () => this.handleHeroAttack(),
      onMeleeAttack: (targetX: number, targetY: number) => this.handleMeleeAttack(targetX, targetY),
      onHomingAttack: (targetX: number, targetY: number) => this.handleHomingAttack(targetX, targetY),
      onCameraDrag: (deltaX: number, deltaY: number) => this.handleCameraDrag(deltaX, deltaY),
      onCameraZoom: (delta: number) => this.cameraController.handleZoom(delta),
      onEditorToggle: () => this.handleEditorToggle(),
      onCameraCenter: () => this.handleCameraCenter(),
      onZoomIn: () => this.cameraController.zoomIn(),
      onZoomOut: () => this.cameraController.zoomOut(),
      onZoomReset: () => this.cameraController.resetZoom(),
      onTestExp: () => this.handleTestExp(),
      onKillUnit: () => this.handleKillUnit(),
      getHeroAttackSpeed: () => {
        if (this.playerHero && 'attackSpeed' in this.playerHero) {
          return this.playerHero.attackSpeed
        }
        return 1
      }
    })
    
    this.uiManager.setupUICamera()
    this.uiManager.createGoldDisplay()
  }

  private handleHeroMove(x: number, y: number): void {
    console.log(`🎯 GameScene: Move request to (${x}, ${y})`)
    
    if (!this.playerHero) {
      console.log(`❌ GameScene: No playerHero available`)
      return
    }
    
    console.log(`🦸 GameScene: PlayerHero available:`, {
      name: this.playerHero.name,
      type: this.playerHero.constructor.name,
      position: `(${this.playerHero.isometricX}, ${this.playerHero.isometricY})`,
      hasScene: !!this.playerHero.sprite.scene,
      sceneKey: this.playerHero.sprite.scene?.scene?.key || 'unknown'
    })
    
    this.playerHero.moveToIsometricPosition(x, y)
  }
  
  private handleShoot(targetX: number, targetY: number): void {
    if (!this.playerHero) return
    
    // Check if hero can use ranged attack
    if (!this.playerHero.canUseAttackType(AttackType.RANGED)) {
      console.log(`🚫 ${this.playerHero.name} cannot use ranged attacks - not available in config`)
      return
    }
    
    this.combatSystem.shootProjectile(this.playerHero, targetX, targetY, 25, this.uiCamera)
  }

  private handleMeleeAttack(targetX: number, targetY: number): void {
    if (!this.playerHero) return
    
    // Check if hero can use melee attack
    if (!this.playerHero.canUseAttackType(AttackType.MELEE)) {
      console.log(`🚫 ${this.playerHero.name} cannot use melee attacks - not available in config`)
      return
    }
    
    this.combatSystem.shootMeleeProjectile(this.playerHero, targetX, targetY, 35, this.uiCamera)
  }

  private handleHomingAttack(targetX: number, targetY: number): void {
    if (!this.playerHero) return
    
    // Check if hero can use homing attack
    if (!this.playerHero.canUseAttackType(AttackType.HOMING)) {
      console.log(`🚫 ${this.playerHero.name} cannot use homing attacks - not available in config`)
      return
    }
    
    // Homing attack with 200 pixel range (about 6-7 isometric tiles)
    this.combatSystem.shootHomingProjectile(this.playerHero, targetX, targetY, 30, 200, this.uiCamera)
  }

  private handleHeroAttack(): void {
    if (!this.playerHero) return
    
    // Check if the hero has the performAttack method (both Hero and ConfigurableHero have it)
    if ('performAttack' in this.playerHero) {
      this.playerHero.performAttack()
    }
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
    this.structureCollisionGroup = this.physics.add.group()
    
    // Set up collision between units and structures
    this.setupStructureCollisions()
  }
  
  private setupStructureCollisions(): void {
    // Set up collision detection between units and wall structures
    this.physics.add.collider(this.unitCollisionGroup, this.structureCollisionGroup, (unit, structure) => {
      // Stop the unit when it hits a structure
      const unitObj = unit as Phaser.Types.Physics.Arcade.GameObjectWithBody
      // @ts-ignore - TS6133: structure parameter required for collision callback signature
      const _structureObj = structure as Phaser.Types.Physics.Arcade.GameObjectWithBody
      
      console.log(`🚧 Collision detected between unit and structure`)
      
      // Stop the unit's movement
      if (unitObj.body && 'setVelocity' in unitObj.body) {
        (unitObj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
      }
      
      // If it's a configurable hero, stop movement and return to idle
      const unitData = unitObj.getData('unit')
      if (unitData instanceof ConfigurableHero) {
        unitData.isMoving = false
        unitData.path = []
        unitData.currentPathIndex = 0
        unitData.setAnimation(AnimationType.IDLE, unitData.currentDirection)
        console.log(`🦸 ${unitData.name} stopped by collision, returning to idle`)
      }
    })
  }

  private createHeroAnimations(): void {
    // Note: Removed early return to ensure all animations are created
    
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
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 7 }),
          frameRate: 8,
          repeat: -1
        })
      }
    })
    
    walkAnimations.forEach(animKey => {
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: 7 }),
          frameRate: 12, // Slightly faster frame rate for walking
          repeat: -1
        })
      }
    })
    
    // Create samurai animations for all directions
    const samuraiDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    samuraiDirections.forEach(direction => {
      this.anims.create({
        key: `samurai_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('samurai_idle', { start: 0, end: 9 }),
        frameRate: 8,
        repeat: -1
      })
      
      this.anims.create({
        key: `samurai_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('samurai_walk', { start: 0, end: 15 }),
        frameRate: 12,
        repeat: -1
      })
      
      this.anims.create({
        key: `samurai_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('samurai_attack', { start: 0, end: 6 }),
        frameRate: 10,
        repeat: 0 // Play once for attack
      })
    })
    
    // Create skeleton animations for all directions
    const skeletonDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    skeletonDirections.forEach(direction => {
      this.anims.create({
        key: `skeleton_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('skeleton_idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      })
      
      this.anims.create({
        key: `skeleton_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('skeleton_walk', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      })
      
      this.anims.create({
        key: `skeleton_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('skeleton_attack', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: 0 // Play once for attack
      })
      
      this.anims.create({
        key: `skeleton_death_${direction}`,
        frames: this.anims.generateFrameNumbers('skeleton_death', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0 // Play once for death
      })
      
      this.anims.create({
        key: `skeleton_take_hit_${direction}`,
        frames: this.anims.generateFrameNumbers('skeleton_take_hit', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: 0 // Play once for taking hit
      })
    })
    
    // Create Flying Eye animations for all directions
    const flyingEyeDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    flyingEyeDirections.forEach(direction => {
      this.anims.create({
        key: `flying_eye_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('flying_eye_flight', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      })
      
      this.anims.create({
        key: `flying_eye_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('flying_eye_flight', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
      })
      
      this.anims.create({
        key: `flying_eye_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('flying_eye_attack', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: 0 // Play once for attack
      })
      
      this.anims.create({
        key: `flying_eye_death_${direction}`,
        frames: this.anims.generateFrameNumbers('flying_eye_death', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0 // Play once for death
      })
      
      this.anims.create({
        key: `flying_eye_take_hit_${direction}`,
        frames: this.anims.generateFrameNumbers('flying_eye_take_hit', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0 // Play once for taking hit
      })
    })
    
    // Create Goblin animations for all directions
    const goblinDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    goblinDirections.forEach(direction => {
      this.anims.create({
        key: `goblin_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('goblin_idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      })
      
      this.anims.create({
        key: `goblin_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('goblin_run', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      })
      
      this.anims.create({
        key: `goblin_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('goblin_attack', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: 0 // Play once for attack
      })
      
      this.anims.create({
        key: `goblin_death_${direction}`,
        frames: this.anims.generateFrameNumbers('goblin_death', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0 // Play once for death
      })
      
      this.anims.create({
        key: `goblin_take_hit_${direction}`,
        frames: this.anims.generateFrameNumbers('goblin_take_hit', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0 // Play once for taking hit
      })
    })
    
    // Create Mushroom animations for all directions
    const mushroomDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    mushroomDirections.forEach(direction => {
      this.anims.create({
        key: `mushroom_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('mushroom_idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      })
      
      this.anims.create({
        key: `mushroom_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('mushroom_run', { start: 0, end: 7 }),
        frameRate: 8,
        repeat: -1
      })
      
      this.anims.create({
        key: `mushroom_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('mushroom_attack', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: 0 // Play once for attack
      })
      
      this.anims.create({
        key: `mushroom_death_${direction}`,
        frames: this.anims.generateFrameNumbers('mushroom_death', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0 // Play once for death
      })
      
      this.anims.create({
        key: `mushroom_take_hit_${direction}`,
        frames: this.anims.generateFrameNumbers('mushroom_take_hit', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0 // Play once for taking hit
      })
    })
    
    // Create Evil Wizard animations for all directions
    const evilWizardDirections = ['idle', 'down', 'up', 'left_down', 'left_up', 'right_down', 'right_up']
    
    evilWizardDirections.forEach(direction => {
      this.anims.create({
        key: `evil_wizard_idle_${direction}`,
        frames: this.anims.generateFrameNumbers('evil_wizard_idle', { start: 0, end: 9 }),
        frameRate: 8,
        repeat: -1
      })
      
      this.anims.create({
        key: `evil_wizard_walk_${direction}`,
        frames: this.anims.generateFrameNumbers('evil_wizard_walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
      })
      
      this.anims.create({
        key: `evil_wizard_attack_${direction}`,
        frames: this.anims.generateFrameNumbers('evil_wizard_attack', { start: 0, end: 12 }),
        frameRate: 12,
        repeat: 0 // Play once for attack
      })
      
      this.anims.create({
        key: `evil_wizard_death_${direction}`,
        frames: this.anims.generateFrameNumbers('evil_wizard_death', { start: 0, end: 16 }),
        frameRate: 10,
        repeat: 0 // Play once for death
      })
      
      this.anims.create({
        key: `evil_wizard_take_hit_${direction}`,
        frames: this.anims.generateFrameNumbers('evil_wizard_take_hit', { start: 0, end: 2 }),
        frameRate: 12,
        repeat: 0 // Play once for taking hit
      })
    })
  }

  private createTestMap() {
    // Create all graphics first
    this.mapManager.createAllGraphics()
    
    // Center camera
    this.cameraController.setZoom(1)
    this.cameraController.centerOn(512, 384)
    
    // Create player hero near the center
    const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
    const defaultConfig: UnitConfig = {
      health: 100, attack: 20, defense: 10, attackSpeed: 1.5, movementSpeed: 2, attackRange: 1,
      availableAttackTypes: {
        melee: { enabled: true }, ranged: { enabled: false }, homing: { enabled: false }
      },
      activeAttackType: AttackType.MELEE, goldOnDeath: 0, expOnDeath: 0,
      animationPrefix: 'hero', texture: 'hero'
    }
    this.playerHero = new ConfigurableHero(this, 16, 12, 'Player Hero', defaultConfig, heroStats)
    this.unitManager.addUnit(this.playerHero)
    this.unitManager.registerUnitPosition(this.playerHero, 16, 12)
    
    // Create some enemy units for testing combat
    // TODO: Enemy creation will be implemented based on map data or spawning system
    
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
      // Add to structure collision group for physics blocking
      this.mapManager.addStructureToCollisionGroup(water, this.structureCollisionGroup)
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
      // Update UnitManager with actual map dimensions
      if (this.unitManager) {
        this.unitManager.setMapSize(mapData.width, mapData.height)
        console.log(`🗺️ Updated UnitManager with map size: ${mapData.width}x${mapData.height}`)
      }
      
      // Create all graphics first
      this.mapManager.createAllGraphics()
      
      // Center camera
      this.cameraController.setZoom(1)
      this.cameraController.centerOn(512, 384)
      
      // Create player hero if none exists in the map data
      const hasHero = mapData.units && mapData.units.some(unit => unit.type === 'hero' || unit.type === 'configurableHero')
      console.log('🏗️ Hero check:', { hasHero, unitsArray: mapData.units })
      
      if (!hasHero) {
        console.log('🏗️ Creating default hero')
        const heroStats: HeroStats = { strength: 15, intelligence: 12, agility: 18 }
        const defaultConfig: UnitConfig = {
          health: 100, attack: 20, defense: 10, attackSpeed: 1.5, movementSpeed: 2, attackRange: 1,
          availableAttackTypes: {
            melee: { enabled: true }, ranged: { enabled: false }, homing: { enabled: false }
          },
          activeAttackType: AttackType.MELEE, goldOnDeath: 0, expOnDeath: 0,
          animationPrefix: 'hero', texture: 'hero'
        }
        this.playerHero = new ConfigurableHero(this, 16, 12, 'Player Hero', defaultConfig, heroStats)
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
        (unit, x, y) => this.unitManager.removeUnitPosition(unit, x, y),
        this.unitManager,
        this.combatSystem,
        undefined,
        this.structureCollisionGroup
      )
      
      // Find the player hero after loading map data
      if (!this.playerHero) {
        const hero = this.unitManager.getUnits().find(unit => unit instanceof ConfigurableHero) as ConfigurableHero
        if (hero) {
          this.playerHero = hero
          console.log('🦸 PlayerHero set after loading map data:', {
            name: hero.name,
            type: hero.constructor.name,
            position: `(${hero.isometricX}, ${hero.isometricY})`,
            hasScene: !!hero.sprite.scene
          })
        } else {
          console.log('❌ No hero found in loaded units')
        }
      } else {
        console.log('🦸 PlayerHero already set:', {
          name: this.playerHero.name,
          type: this.playerHero.constructor.name,
          position: `(${this.playerHero.isometricX}, ${this.playerHero.isometricY})`
        })
      }
      
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

  // Delegate methods for unit movement compatibility
  public canUnitMoveTo(unit: any, targetX: number, targetY: number): boolean {
    return this.unitManager.canUnitMoveTo(unit, targetX, targetY)
  }

  public updateUnitPosition(unit: any, oldX: number, oldY: number, newX: number, newY: number): void {
    this.unitManager.updateUnitPosition(unit, oldX, oldY, newX, newY)
  }

  public findPathForUnit(unit: any, targetX: number, targetY: number): Array<{x: number, y: number}> {
    return this.unitManager.findPathForUnit(unit, targetX, targetY)
  }

  // Debug methods for testing experience system
  private handleTestExp(): void {
    if (this.playerHero && 'debugGainExp' in this.playerHero) {
      this.playerHero.debugGainExp(10)
    } else {
      console.log('🧪 DEBUG: No hero found to give experience to')
    }
  }

  private handleKillUnit(): void {
    this.unitManager.debugKillFirstConfigurableUnit()
  }

  public cleanup(): void {
    if (this.inputManager) this.inputManager.destroy()
    if (this.mapManager) this.mapManager.destroy()
    if (this.unitManager) this.unitManager.destroy()
    if (this.combatSystem) this.combatSystem.destroy()
    if (this.uiManager) this.uiManager.destroy()
  }
}