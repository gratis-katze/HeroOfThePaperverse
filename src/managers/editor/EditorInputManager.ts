import Phaser from 'phaser'
import { EditorTool } from '../../scenes/MapEditorScene'

export interface EditorInputConfig {
  scene: Phaser.Scene
  navBarHeight: number
  onPlaceItem: (isoX: number, isoY: number) => void
  onEraseItem: (isoX: number, isoY: number) => void
  onEditItem: (isoX: number, isoY: number) => void
  onCameraDrag: (deltaX: number, deltaY: number, startX: number, startY: number) => void
  onCameraZoom: (deltaY: number) => void
  onStatusUpdate: () => void
  onGridRedraw: () => void
}

export class EditorInputManager {
  private scene: Phaser.Scene
  private config: EditorInputConfig
  private currentTool: EditorTool = EditorTool.NONE
  
  // Camera drag state
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private cameraStartX: number = 0
  private cameraStartY: number = 0
  
  // Keyboard controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: any
  
  // Grid redraw throttling
  private gridRedrawPending = false

  constructor(config: EditorInputConfig) {
    this.scene = config.scene
    this.config = config
    this.setupInput()
  }

  private setupInput(): void {
    this.setupMouseInput()
    this.setupKeyboardInput()
  }

  private setupMouseInput(): void {
    // Mouse input for placement/erasure and camera dragging
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't interact in nav bar area
      if (pointer.y < this.config.navBarHeight) return
      
      if (pointer.rightButtonDown()) {
        // Right click starts camera drag
        this.isDragging = true
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.cameraStartX = this.scene.cameras.main.scrollX
        this.cameraStartY = this.scene.cameras.main.scrollY
        this.scene.input.setDefaultCursor('grabbing')
      } else {
        // Left click for placement/erasure
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const isoCoords = this.screenToIsometric(worldPoint.x, worldPoint.y)
        
        if (this.currentTool === EditorTool.ERASE) {
          this.config.onEraseItem(isoCoords.x, isoCoords.y)
        } else if (this.currentTool === EditorTool.EDIT) {
          this.config.onEditItem(isoCoords.x, isoCoords.y)
        } else {
          // Default behavior: place items
          this.config.onPlaceItem(isoCoords.x, isoCoords.y)
        }
      }
    })

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = this.dragStartX - pointer.x
        const deltaY = this.dragStartY - pointer.y
        
        this.config.onCameraDrag(deltaX, deltaY, this.cameraStartX, this.cameraStartY)
        this.config.onStatusUpdate()
        
        // Throttled grid redraw during drag
        if (!this.gridRedrawPending) {
          this.gridRedrawPending = true
          this.scene.time.delayedCall(100, () => {
            this.config.onGridRedraw()
            this.gridRedrawPending = false
          })
        }
      }
    })

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.rightButtonReleased()) {
        this.isDragging = false
        this.scene.input.setDefaultCursor('default')
      }
    })

    // Mouse wheel for zooming
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      // Don't zoom in nav bar area
      if (pointer.y < this.config.navBarHeight) return
      
      this.config.onCameraZoom(deltaY)
    })
  }

  private setupKeyboardInput(): void {
    // Camera movement with arrow keys and WASD
    this.cursors = this.scene.input.keyboard!.createCursorKeys()
    this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D')
  }

  public handleKeyboardMovement(): { moved: boolean } {
    // Handle continuous camera movement with keyboard
    const cameraSpeed = 300 / this.scene.cameras.main.zoom // Faster when zoomed out
    let moved = false

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.scene.cameras.main.scrollX -= cameraSpeed * (1/60) // Assuming 60 FPS
      moved = true
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.scene.cameras.main.scrollX += cameraSpeed * (1/60)
      moved = true
    }
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.scene.cameras.main.scrollY -= cameraSpeed * (1/60)
      moved = true
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.scene.cameras.main.scrollY += cameraSpeed * (1/60)
      moved = true
    }

    return { moved }
  }

  private screenToIsometric(screenX: number, screenY: number): {x: number, y: number} {
    const ISO_WIDTH = 32
    const ISO_HEIGHT = 16
    const isoX = Math.floor((screenX / ISO_WIDTH + screenY / ISO_HEIGHT) / 2)
    const isoY = Math.floor((screenY / ISO_HEIGHT - screenX / ISO_WIDTH) / 2)
    return { x: isoX, y: isoY }
  }

  public setTool(tool: EditorTool): void {
    this.currentTool = tool
  }

  public getCurrentTool(): EditorTool {
    return this.currentTool
  }

  public isDragMode(): boolean {
    return this.isDragging
  }

  public destroy(): void {
    // Clean up event listeners if needed
  }
}