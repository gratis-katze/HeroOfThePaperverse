import Phaser from 'phaser'
import { Unit } from './Unit'
import { ConfigurableUnit } from './ConfigurableUnit'
import { ConfigurableHero } from './ConfigurableHero'

export class MeleeProjectile {
  public sprite: Phaser.Physics.Arcade.Sprite
  public damage: number
  public speed: number
  public owner: Unit
  public range: number
  private startX: number
  private startY: number
  private hitTargets: Set<Unit> = new Set()
  private swingProgress: number = 0
  private swingSpeed: number = 0.05 // How fast the swing progresses (0-1) - slower swing
  private swingRadius: number
  private startAngle: number
  private totalSwingAngle: number = Math.PI // 180 degrees for half circle
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    owner: Unit,
    range: number = 80, // Shorter range than regular projectile
    projectileGroup?: Phaser.Physics.Arcade.Group
  ) {
    this.damage = damage
    this.speed = 300 // Not used for arc movement, kept for compatibility
    this.owner = owner
    this.range = range
    this.startX = x
    this.startY = y
    this.swingRadius = range
    
    // Calculate the starting angle based on mouse direction
    const dx = targetX - x
    const dy = targetY - y
    const mouseAngle = Math.atan2(dy, dx)
    
    // Start the swing 90 degrees before the mouse direction
    this.startAngle = mouseAngle - (this.totalSwingAngle / 2)
    
    this.sprite = scene.physics.add.sprite(x, y, 'projectile')
    this.sprite.setScale(0.6) // Smaller than regular projectile
    this.sprite.setTint(0xff4444) // Red tint to distinguish from ranged attacks
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
      console.error('❌ MeleeProjectile sprite has no physics body!')
      return
    }
    
    // Cast to arcade physics body for type safety
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    
    // Configure body for manual position control (no physics movement)
    body.enable = true
    body.moves = false // We'll control position manually for the arc
    body.immovable = true
    body.allowGravity = false
    body.setDrag(0, 0)
    body.setFriction(0, 0)
    body.setBounce(0, 0)
    
    // Set initial position at the start of the swing arc
    this.updateSwingPosition()
    
    console.log(`⚔️ MeleeProjectile: sword swing from (${x}, ${y}) towards (${targetX}, ${targetY}), radius: ${this.swingRadius}`)
    
    // Auto-destroy after swing completes
    scene.time.delayedCall(1500, () => {
      this.destroy()
    })
  }
  
  private updateSwingPosition(): void {
    // Calculate current angle in the swing
    const currentAngle = this.startAngle + (this.swingProgress * this.totalSwingAngle)
    
    // Calculate position on the arc
    const x = this.startX + Math.cos(currentAngle) * this.swingRadius
    const y = this.startY + Math.sin(currentAngle) * this.swingRadius
    
    // Update sprite position
    this.sprite.setPosition(x, y)
    
    // Rotate the sprite to face the direction of movement
    this.sprite.setRotation(currentAngle + Math.PI / 2) // +90 degrees to align properly
  }
  
  public update(): void {
    if (this.sprite && this.sprite.body) {
      // Progress the swing
      this.swingProgress += this.swingSpeed
      
      // Update position along the arc
      this.updateSwingPosition()
      
      // Destroy when swing is complete
      if (this.swingProgress >= 1.0) {
        this.destroy()
      }
    }
  }
  
  public onHit(target: Unit): void {
    if (target === this.owner) return
    
    // Don't hit the same target twice
    if (this.hitTargets.has(target)) return
    
    if (target instanceof ConfigurableUnit || target instanceof ConfigurableHero) {
      target.takeDamage(this.damage, this.owner)
      this.hitTargets.add(target)
      
      console.log(`💥 Melee projectile hit ${target.name} for ${this.damage} damage (${target.currentHealth}/${target.maxHealth} HP)`)
      
      // Continue through instead of destroying (this is the key difference from regular projectiles)
      // The projectile will continue until it reaches its range limit
    }
  }
  
  public destroy(): void {
    if (this.sprite && this.sprite.scene) {
      this.sprite.destroy()
    }
  }
}