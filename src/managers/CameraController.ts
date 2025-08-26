import Phaser from 'phaser'

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera
  private zoomLevel: number = 1
  private readonly MIN_ZOOM = 0.25
  private readonly MAX_ZOOM = 3

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera
  }

  public handleDrag(deltaX: number, deltaY: number, dragStartX: number, dragStartY: number): void {
    this.camera.setScroll(
      dragStartX - deltaX / this.zoomLevel,
      dragStartY - deltaY / this.zoomLevel
    )
  }

  public handleKeyboardMovement(deltaX: number, deltaY: number): void {
    const adjustedSpeed = 3.0 / this.zoomLevel
    this.camera.scrollX += deltaX * adjustedSpeed
    this.camera.scrollY += deltaY * adjustedSpeed
  }

  public handleZoom(deltaY: number): void {
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * zoomFactor, this.MIN_ZOOM, this.MAX_ZOOM)
    
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.camera.setZoom(this.zoomLevel)
      // Reduce logging frequency - only log every 10th zoom change
      if (Math.random() < 0.1) {
        console.log(`🔍 Zoom: ${this.zoomLevel.toFixed(2)}x`)
      }
    }
  }

  public zoomIn(): void {
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * 1.2, this.MIN_ZOOM, this.MAX_ZOOM)
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.camera.setZoom(this.zoomLevel)
      console.log(`🔍 Zoom In: ${this.zoomLevel.toFixed(2)}x`)
    }
  }

  public zoomOut(): void {
    const newZoom = Phaser.Math.Clamp(this.zoomLevel * 0.8, this.MIN_ZOOM, this.MAX_ZOOM)
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.camera.setZoom(this.zoomLevel)
      console.log(`🔍 Zoom Out: ${this.zoomLevel.toFixed(2)}x`)
    }
  }

  public resetZoom(): void {
    this.zoomLevel = 1
    this.camera.setZoom(this.zoomLevel)
    console.log(`🔍 Zoom Reset: ${this.zoomLevel.toFixed(2)}x`)
  }

  public centerOn(x: number, y: number): void {
    this.camera.centerOn(x, y)
  }

  public followSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.camera.startFollow(sprite)
    this.camera.stopFollow()
    console.log('📍 Camera centered on sprite')
  }

  public fadeIn(duration: number = 300): void {
    this.camera.fadeIn(duration, 0, 0, 0)
  }

  public fadeOut(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      this.camera.fadeOut(duration, 0, 0, 0)
      this.camera.once('camerafadeoutcomplete', resolve)
    })
  }

  public getZoomLevel(): number {
    return this.zoomLevel
  }

  public setZoom(zoom: number): void {
    this.zoomLevel = Phaser.Math.Clamp(zoom, this.MIN_ZOOM, this.MAX_ZOOM)
    this.camera.setZoom(this.zoomLevel)
  }
}