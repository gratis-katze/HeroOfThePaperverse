import Phaser from 'phaser'

export class GridManager {
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private gridOverlay!: Phaser.GameObjects.Graphics
  private showGrid = true
  private gridRedrawPending = false
  private readonly ISO_WIDTH = 32
  private readonly ISO_HEIGHT = 16

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
    this.createGridOverlay()
  }

  private createGridOverlay(): void {
    this.gridOverlay = this.scene.add.graphics()
    this.drawGrid()
    
    // Make UI camera ignore grid overlay
    this.uiCamera.ignore(this.gridOverlay)
  }

  public drawGrid(): void {
    this.gridOverlay.clear()
    
    if (!this.showGrid) return

    this.gridOverlay.lineStyle(1, 0x444444, 0.5)

    const bounds = this.scene.cameras.main.getBounds()
    
    // Only draw grid lines that are actually visible, with larger spacing for performance
    const gridSpacing = Math.max(64, 128 / this.scene.cameras.main.zoom) // Adaptive spacing based on zoom
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
    if (this.scene.cameras.main.zoom > 0.5) {
      this.drawIsometricGridPoints(bounds, gridSpacing)
    }
  }

  private drawIsometricGridPoints(bounds: Phaser.Geom.Rectangle, spacing: number): void {
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

  public scheduleGridRedraw(): void {
    // Throttled grid redraw for performance
    if (this.showGrid && !this.gridRedrawPending) {
      this.gridRedrawPending = true
      this.scene.time.delayedCall(200, () => {
        this.drawGrid()
        this.gridRedrawPending = false
      })
    }
  }

  public setGridVisibility(visible: boolean): void {
    this.showGrid = visible
    if (!visible) {
      this.gridOverlay.clear()
    } else {
      this.drawGrid()
    }
  }

  public isGridVisible(): boolean {
    return this.showGrid
  }

  public destroy(): void {
    if (this.gridOverlay) {
      this.gridOverlay.destroy()
    }
  }
}