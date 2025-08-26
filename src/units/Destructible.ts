import { Unit, UnitType } from './Unit'

export enum DestructibleType {
  TREE = 'tree',
  ROCK = 'rock',
  CRATE = 'crate',
  BARREL = 'barrel'
}

export class Destructible extends Unit {
  public destructibleType: DestructibleType
  public maxHealth: number
  public currentHealth: number
  public armor: number
  public dropsResources: boolean
  public resourceAmount: number
  public isDestroyed: boolean = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    destructibleType: DestructibleType,
    maxHealth: number,
    armor: number = 0
  ) {
    super(scene, x, y, texture, name, UnitType.DESTRUCTIBLE)
    
    this.destructibleType = destructibleType
    this.maxHealth = maxHealth
    this.currentHealth = maxHealth
    this.armor = armor
    
    this.dropsResources = this.shouldDropResources()
    this.resourceAmount = this.calculateResourceDrop()
    
    this.sprite.setImmovable(true)
    this.sprite.body?.setSize(32, 40)
  }

  public update(_time: number, _delta: number): void {
    if (this.isDestroyed) {
      this.playDestructionAnimation()
    }
  }

  public takeDamage(amount: number): number {
    const actualDamage = Math.max(1, amount - this.armor)
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage)
    
    if (this.currentHealth <= 0 && !this.isDestroyed) {
      this.destroy()
    }
    
    return actualDamage
  }

  public destroy(): void {
    this.isDestroyed = true
    
    if (this.dropsResources) {
      this.dropResources()
    }
    
    // Change sprite to destroyed version or play destruction effect
    this.sprite.setTint(0x888888)
    this.sprite.setAlpha(0.5)
    
    // Remove collision
    this.sprite.body?.setSize(0, 0)
    
    // Schedule removal after animation
    this.sprite.scene.time.delayedCall(1000, () => {
      super.destroy()
    })
  }

  private shouldDropResources(): boolean {
    switch (this.destructibleType) {
      case DestructibleType.TREE:
        return true // Wood
      case DestructibleType.ROCK:
        return true // Stone
      case DestructibleType.CRATE:
      case DestructibleType.BARREL:
        return Math.random() > 0.5 // Random loot
      default:
        return false
    }
  }

  private calculateResourceDrop(): number {
    switch (this.destructibleType) {
      case DestructibleType.TREE:
        return 3 + Math.floor(Math.random() * 3) // 3-5 wood
      case DestructibleType.ROCK:
        return 2 + Math.floor(Math.random() * 2) // 2-3 stone
      case DestructibleType.CRATE:
      case DestructibleType.BARREL:
        return 1 + Math.floor(Math.random() * 2) // 1-2 random items
      default:
        return 0
    }
  }

  private dropResources(): void {
    // Create resource drop visual effect and add to scene
    const scene = this.sprite.scene
    const dropX = this.sprite.x
    const dropY = this.sprite.y - 20
    
    // Create floating text showing resource gained
    const resourceText = scene.add.text(dropX, dropY, `+${this.resourceAmount}`, {
      fontSize: '12px',
      color: '#00ff00'
    })
    
    // Animate the text floating up and fading
    scene.tweens.add({
      targets: resourceText,
      y: dropY - 30,
      alpha: 0,
      duration: 1500,
      onComplete: () => resourceText.destroy()
    })
  }

  private playDestructionAnimation(): void {
    // Add particle effects or sprite animation for destruction
    // This could include debris, smoke, or other visual effects
  }

  public getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth
  }

  public isAlive(): boolean {
    return this.currentHealth > 0 && !this.isDestroyed
  }
}