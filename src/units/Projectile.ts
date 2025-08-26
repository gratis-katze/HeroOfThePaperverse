import Phaser from 'phaser'
import { Unit } from './Unit'
import { ConfigurableUnit } from './ConfigurableUnit'
import { ConfigurableHero } from './ConfigurableHero'

export class Projectile {
  public sprite: Phaser.Physics.Arcade.Sprite
  public damage: number
  public speed: number
  public owner: Unit
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    owner: Unit,
    projectileGroup?: Phaser.Physics.Arcade.Group
  ) {
    this.damage = damage
    this.speed = 400
    this.owner = owner
    
    this.sprite = scene.physics.add.sprite(x, y, 'projectile')
    this.sprite.setScale(0.8)
    this.sprite.setData('projectile', this)
    
    // Make UI camera ignore projectile if it exists
    const sceneAny = scene as any
    if (sceneAny.uiCamera) {
      sceneAny.uiCamera.ignore(this.sprite)
    }
    
    // Add to projectile group immediately if provided
    if (projectileGroup) {
      projectileGroup.add(this.sprite)
    }
    
    // Ensure physics body exists
    if (!this.sprite.body) {
      console.error('❌ Projectile sprite has no physics body!')
      return
    }
    
    // Cast to arcade physics body for type safety
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    
    // Make sure the body is properly configured for movement
    body.enable = true
    body.moves = true
    body.immovable = false
    body.allowGravity = false
    body.setDrag(0, 0)
    body.setFriction(0, 0)
    body.setBounce(0, 0)
    
    // Calculate direction vector and set velocity
    const dx = targetX - x
    const dy = targetY - y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 0) {
      const velocityX = (dx / distance) * this.speed
      const velocityY = (dy / distance) * this.speed
      
      // Set velocity using the body directly
      body.setVelocity(velocityX, velocityY)
      
      console.log(`🏹 Setting projectile velocity: (${velocityX.toFixed(2)}, ${velocityY.toFixed(2)})`)
      console.log(`🏹 Body properties - enabled: ${body.enable}, moves: ${body.moves}, immovable: ${body.immovable}`)
      console.log(`🏹 Body velocity after:`, body.velocity.x, body.velocity.y)
    }
    
    console.log(`🏹 Projectile: from (${x}, ${y}) to (${targetX}, ${targetY}), speed: ${this.speed}`)
    console.log(`🏹 Projectile body velocity:`, this.sprite.body.velocity)
    
    scene.time.delayedCall(3000, () => {
      this.destroy()
    })
  }
  
  public update(): void {
    // Debug: log position changes to see if physics is working
    if (this.sprite && this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      console.log(`🏹 Projectile update - pos: (${this.sprite.x.toFixed(2)}, ${this.sprite.y.toFixed(2)}), vel: (${body.velocity.x.toFixed(2)}, ${body.velocity.y.toFixed(2)})`)
    }
  }
  
  public onHit(target: Unit): void {
    if (target === this.owner) return
    
    if (target instanceof ConfigurableUnit || target instanceof ConfigurableHero) {
      target.takeDamage(this.damage, this.owner)
      if (target instanceof ConfigurableUnit || target instanceof ConfigurableHero) {
        console.log(`💥 Projectile hit ${target.name} for ${this.damage} damage (${target.currentHealth}/${target.maxHealth} HP)`)
      }
    }
    
    this.destroy()
  }
  
  public destroy(): void {
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy()
    }
  }
}