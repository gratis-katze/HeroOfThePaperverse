import Phaser from 'phaser'
import { Unit } from './Unit'
import { ConfigurableUnit } from './ConfigurableUnit'
import { ConfigurableHero } from './ConfigurableHero'

export class HomingProjectile {
  public sprite: Phaser.Physics.Arcade.Sprite
  public damage: number
  public speed: number
  public owner: Unit
  public target: Unit | null
  private maxTurnRate: number = 0.05 // How sharply the projectile can turn
  private maxLifetime: number = 5000 // 5 seconds max lifetime
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Unit | null,
    damage: number,
    owner: Unit,
    projectileGroup?: Phaser.Physics.Arcade.Group
  ) {
    console.log(`🎯 HomingProjectile constructor called:`, {
      position: { x, y },
      target: target?.name || 'null',
      damage,
      owner: owner.name,
      hasProjectileGroup: !!projectileGroup,
      sceneKey: scene.scene.key
    })
    
    this.damage = damage
    this.speed = 250 // Moderate speed for homing
    this.owner = owner
    this.target = target
    
    this.sprite = scene.physics.add.sprite(x, y, 'projectile')
    console.log(`🎯 HomingProjectile sprite created:`, {
      spriteExists: !!this.sprite,
      spritePosition: { x: this.sprite.x, y: this.sprite.y },
      spriteVisible: this.sprite.visible,
      spriteActive: this.sprite.active
    })
    this.sprite.setScale(0.7)
    this.sprite.setTint(0x44ff44) // Green tint to distinguish from other projectiles
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
      console.error('❌ HomingProjectile sprite has no physics body!')
      return
    }
    
    // Cast to arcade physics body for type safety
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    
    // Configure body for homing movement
    body.enable = true
    body.moves = true
    body.immovable = false
    body.allowGravity = false
    body.setDrag(0, 0)
    body.setFriction(0, 0)
    body.setBounce(0, 0)
    
    // Set initial velocity toward target if target exists
    if (this.target) {
      const targetPos = this.target.getIsometricPosition()
      const dx = (targetPos.x - this.owner.isometricX) * 32 - x
      const dy = (targetPos.y - this.owner.isometricY) * 16 - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 0) {
        const velocityX = (dx / distance) * this.speed
        const velocityY = (dy / distance) * this.speed
        body.setVelocity(velocityX, velocityY)
        
        console.log(`🎯 HomingProjectile targeting ${this.target.name}`)
      }
    } else {
      // No target, destroy immediately
      console.log(`❌ HomingProjectile: No target found`)
      scene.time.delayedCall(100, () => this.destroy())
    }
    
    // Auto-destroy after max lifetime
    scene.time.delayedCall(this.maxLifetime, () => {
      this.destroy()
    })
  }
  
  public update(): void {
    if (!this.sprite || !this.sprite.body || !this.target) {
      return
    }
    
    // Check if target is still alive
    if ('isDead' in this.target && (this.target as any).isDead()) {
      this.destroy()
      return
    }
    
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const targetPos = this.target.getIsometricPosition()
    
    // Calculate target position in screen coordinates
    const targetScreenX = (targetPos.x - targetPos.y) * 32
    const targetScreenY = (targetPos.x + targetPos.y) * 16
    
    // Calculate direction to target
    const dx = targetScreenX - this.sprite.x
    const dy = targetScreenY - this.sprite.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance > 5) {
      // Calculate desired velocity
      const desiredVelX = (dx / distance) * this.speed
      const desiredVelY = (dy / distance) * this.speed
      
      // Get current velocity
      const currentVelX = body.velocity.x
      const currentVelY = body.velocity.y
      
      // Smoothly interpolate toward desired velocity (creates homing behavior)
      const newVelX = currentVelX + (desiredVelX - currentVelX) * this.maxTurnRate
      const newVelY = currentVelY + (desiredVelY - currentVelY) * this.maxTurnRate
      
      body.setVelocity(newVelX, newVelY)
      
      // Rotate sprite to face movement direction
      const angle = Math.atan2(newVelY, newVelX)
      this.sprite.setRotation(angle + Math.PI / 2) // +90 degrees to align properly
    }
  }
  
  public onHit(target: Unit): void {
    if (target === this.owner) return
    
    if (target instanceof ConfigurableUnit || target instanceof ConfigurableHero) {
      target.takeDamage(this.damage, this.owner)
      if (target instanceof ConfigurableUnit || target instanceof ConfigurableHero) {
        console.log(`💥 Homing projectile hit ${target.name} for ${this.damage} damage (${target.currentHealth}/${target.maxHealth} HP)`)
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