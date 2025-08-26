import Phaser from 'phaser'

export class UIManager {
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private loadingContainer?: Phaser.GameObjects.Container
  private goldDisplay?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
  }

  public createInfoText(isCustomMap: boolean = false, metadata?: any): Phaser.GameObjects.Text {
    let titleText = isCustomMap ? 'Custom Map' : 'Combat Test Map'
    if (metadata?.fromEditor) {
      titleText += metadata.wasSaved ? ' (Saved)' : ' (Unsaved)'
    }
    if (isCustomMap) titleText += '!'

    const infoText = this.scene.add.text(10, 10, 
      `${titleText}\nLeft Click: Move hero | Right Click + Drag: Pan camera\nWASD: Move camera | Mouse Wheel: Zoom | +/-: Zoom | 0: Reset zoom\nHold Q: Shoot projectiles | Home: Center on hero | E: ${isCustomMap ? 'Return to Editor' : 'Map Editor'}`, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    
    // Make only the UI camera render info text
    this.scene.cameras.main.ignore(infoText)
    
    return infoText
  }

  public showLoadingMessage(metadata: any): void {
    // Create loading overlay
    const overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.8
    )

    // Create loading container
    this.loadingContainer = this.scene.add.container(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY)

    // Loading message
    const title = this.scene.add.text(0, -30, '⚡ Loading Custom Map...', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    title.setOrigin(0.5, 0.5)

    // Status message
    const status = metadata.wasSaved ? 'Map was saved to your downloads' : 'Unsaved map from editor'
    const statusText = this.scene.add.text(0, 10, status, {
      fontSize: '14px',
      color: '#cccccc'
    })
    statusText.setOrigin(0.5, 0.5)

    // Loading animation - create spinning isometric cube
    const spinner = this.scene.add.text(0, 40, '🎲', {
      fontSize: '32px'
    })
    spinner.setOrigin(0.5, 0.5)
    
    // Animate the spinner
    this.scene.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 1000,
      repeat: -1,
      ease: 'Linear'
    })

    this.loadingContainer.add([overlay, title, statusText, spinner])
    
    // Make only the UI camera render loading UI
    this.scene.cameras.main.ignore([overlay, this.loadingContainer])
  }

  public hideLoadingMessage(): void {
    if (this.loadingContainer) {
      this.scene.tweens.add({
        targets: this.loadingContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          if (this.loadingContainer) {
            this.loadingContainer.destroy()
            this.loadingContainer = undefined
          }
        }
      })
    }
  }

  public setupUICamera(): void {
    // Ensure physics debug is ignored by UI camera after everything is set up
    this.scene.time.delayedCall(100, () => {
      if (this.scene.physics.world.debugGraphic) {
        this.uiCamera.ignore(this.scene.physics.world.debugGraphic)
        console.log('🔧 UI camera configured to ignore physics debug')
      }
    })
  }

  public ensureUIIgnoresPhysicsDebug(): void {
    // Continuously ensure UI camera ignores physics debug graphics
    if (this.scene.physics.world.debugGraphic && this.uiCamera) {
      this.uiCamera.ignore(this.scene.physics.world.debugGraphic)
    }
  }

  public createGoldDisplay(): void {
    if (this.goldDisplay) {
      return // Already exists
    }

    this.goldDisplay = this.scene.add.text(
      this.scene.cameras.main.width - 10, 
      10, 
      '💰 0', 
      {
        fontSize: '18px',
        color: '#ffcc00',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
      }
    )
    
    this.goldDisplay.setOrigin(1, 0) // Anchor to top-right
    
    // Make only the UI camera render the gold display
    this.scene.cameras.main.ignore(this.goldDisplay)
  }

  public updateGoldDisplay(gold: number): void {
    if (this.goldDisplay) {
      this.goldDisplay.setText(`💰 ${gold}`)
    }
  }

  public destroy(): void {
    if (this.loadingContainer) {
      this.loadingContainer.destroy()
      this.loadingContainer = undefined
    }
    
    if (this.goldDisplay) {
      this.goldDisplay.destroy()
      this.goldDisplay = undefined
    }
  }
}