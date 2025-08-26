import Phaser from 'phaser'

export class HealthBar {
  private background: Phaser.GameObjects.Graphics
  private healthBar: Phaser.GameObjects.Graphics
  private container: Phaser.GameObjects.Container
  private width: number = 32
  private height: number = 4
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    
    this.background = scene.add.graphics()
    this.healthBar = scene.add.graphics()
    
    this.container = scene.add.container(x, y)
    this.container.add([this.background, this.healthBar])
    
    this.drawBackground()
  }
  
  private drawBackground(): void {
    this.background.clear()
    this.background.fillStyle(0x000000, 0.8)
    this.background.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
    this.background.lineStyle(1, 0x333333, 1)
    this.background.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height)
  }
  
  public updateHealth(currentHealth: number, maxHealth: number): void {
    const healthPercentage = Math.max(0, Math.min(1, currentHealth / maxHealth))
    const healthWidth = (this.width - 2) * healthPercentage
    
    this.healthBar.clear()
    
    if (healthPercentage > 0) {
      let color = 0x00ff00
      if (healthPercentage < 0.3) {
        color = 0xff0000
      } else if (healthPercentage < 0.6) {
        color = 0xff8800
      }
      
      this.healthBar.fillStyle(color, 1)
      this.healthBar.fillRect(-this.width / 2 + 1, -this.height / 2 + 1, healthWidth, this.height - 2)
    }
  }
  
  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y)
  }
  
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible)
  }
  
  public destroy(): void {
    this.container.destroy()
  }
  
  public getContainer(): Phaser.GameObjects.Container {
    return this.container
  }
}