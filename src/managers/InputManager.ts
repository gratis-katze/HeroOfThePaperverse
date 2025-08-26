import Phaser from 'phaser'

export interface InputManagerConfig {
  scene: Phaser.Scene
  onHeroMove: (x: number, y: number) => void
  onShoot: (targetX: number, targetY: number) => void
  onCameraDrag: (deltaX: number, deltaY: number) => void
  onCameraZoom: (delta: number) => void
  onEditorToggle: () => void
  onCameraCenter: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export class InputManager {
  private scene: Phaser.Scene
  private config: InputManagerConfig
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys & { q: Phaser.Input.Keyboard.Key }
  private wasd!: any
  
  // Camera drag state
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private cameraStartX: number = 0
  private cameraStartY: number = 0
  
  // Shooting state
  private lastShotTime: number = 0
  private shotCooldown: number = 300
  private aimDirection: { x: number, y: number } | null = null

  constructor(config: InputManagerConfig) {
    this.scene = config.scene
    this.config = config
    this.setupInput()
  }

  private setupInput(): void {
    this.setupMouseInput()
    this.setupKeyboardInput()
  }

  private setupMouseInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        // Right click starts camera drag
        this.isDragging = true
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.cameraStartX = this.scene.cameras.main.scrollX
        this.cameraStartY = this.scene.cameras.main.scrollY
        this.scene.input.setDefaultCursor('grabbing')
      } else {
        // Left click for unit movement
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const isoX = Math.floor((worldPoint.x / 32 + worldPoint.y / 16) / 2)
        const isoY = Math.floor((worldPoint.y / 16 - worldPoint.x / 32) / 2)
        
        console.log(`🖱️ Mouse clicked: screen(${Math.round(pointer.x)}, ${Math.round(pointer.y)}) -> world(${Math.round(worldPoint.x)}, ${Math.round(worldPoint.y)}) -> iso(${isoX}, ${isoY})`)
        
        this.config.onHeroMove(isoX, isoY)
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = (pointer.x - this.dragStartX) * 0.8 // Natural drag direction with moderate sensitivity
        const deltaY = (pointer.y - this.dragStartY) * 0.8 // Natural drag direction with moderate sensitivity
        this.config.onCameraDrag(deltaX, deltaY)
      }
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.rightButtonReleased()) {
        this.isDragging = false
        this.scene.input.setDefaultCursor('default')
      }
    })

    // Mouse wheel for zooming
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.config.onCameraZoom(deltaY)
    })
  }

  private setupKeyboardInput(): void {
    this.keys = this.scene.input.keyboard!.addKeys({
      up: 'UP',
      down: 'DOWN', 
      left: 'LEFT',
      right: 'RIGHT',
      q: 'Q'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & { q: Phaser.Input.Keyboard.Key }

    // Add WASD for camera movement
    this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D')

    // Return to Editor hotkey
    this.scene.input.keyboard!.on('keydown-E', () => {
      this.config.onEditorToggle()
    })

    // Zoom shortcuts
    this.scene.input.keyboard!.on('keydown-PLUS', () => this.config.onZoomIn())
    this.scene.input.keyboard!.on('keydown-MINUS', () => this.config.onZoomOut())
    this.scene.input.keyboard!.on('keydown-ZERO', () => this.config.onZoomReset())

    // Center camera on player
    this.scene.input.keyboard!.on('keydown-HOME', () => {
      this.config.onCameraCenter()
    })
  }

  public handleInput(): void {
    this.handleShooting()
    this.handleCameraMovement()
  }

  private handleShooting(): void {
    if (this.keys.q.isDown) {
      // Capture aim direction when Q is first pressed
      if (!this.aimDirection) {
        const pointer = this.scene.input.activePointer
        const worldX = pointer.worldX
        const worldY = pointer.worldY
        this.aimDirection = { x: worldX, y: worldY }
      }
      
      const currentTime = this.scene.time.now
      if (currentTime - this.lastShotTime >= this.shotCooldown) {
        if (this.aimDirection) {
          this.config.onShoot(this.aimDirection.x, this.aimDirection.y)
        }
        this.lastShotTime = currentTime
      }
    } else {
      // Reset aim direction when Q is released
      this.aimDirection = null
    }
  }

  private handleCameraMovement(): void {
    const cameraSpeed = 2 // Balanced speed

    let deltaX = 0
    let deltaY = 0

    // WASD camera movement - natural directions
    if (this.wasd.W.isDown) deltaY -= cameraSpeed // W moves camera up
    if (this.wasd.S.isDown) deltaY += cameraSpeed // S moves camera down
    if (this.wasd.A.isDown) deltaX -= cameraSpeed // A moves camera left
    if (this.wasd.D.isDown) deltaX += cameraSpeed // D moves camera right

    if (deltaX !== 0 || deltaY !== 0) {
      this.config.onCameraDrag(deltaX, deltaY)
    }
  }

  public getDragState() {
    return {
      isDragging: this.isDragging,
      cameraStartX: this.cameraStartX,
      cameraStartY: this.cameraStartY
    }
  }

  public destroy(): void {
    // Clean up event listeners if needed
  }
}