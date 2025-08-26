import Phaser from 'phaser'
import { Projectile } from '../units/Projectile'
import { Hero, Unit } from '../units'

export class CombatSystem {
  private scene: Phaser.Scene
  private projectiles: Array<Projectile> = []
  private projectileGroup: Phaser.Physics.Arcade.Group
  private unitCollisionGroup: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene, projectileGroup: Phaser.Physics.Arcade.Group, unitCollisionGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene
    this.projectileGroup = projectileGroup
    this.unitCollisionGroup = unitCollisionGroup
    this.setupCollisionDetection()
  }

  private setupCollisionDetection(): void {
    // Set up collision detection
    this.scene.physics.add.overlap(
      this.projectileGroup,
      this.unitCollisionGroup,
      (projectileSprite, unitSprite) => {
        const projectileGameObject = projectileSprite as Phaser.Physics.Arcade.Sprite
        const unitGameObject = unitSprite as Phaser.Physics.Arcade.Sprite
        const projectile = projectileGameObject.getData('projectile') as Projectile
        const unit = unitGameObject.getData('unit') as Unit
        
        if (projectile && unit && unit !== projectile.owner) {
          projectile.onHit(unit)
        }
      }
    )
  }

  public shootProjectile(
    shooter: Hero, 
    targetX: number, 
    targetY: number, 
    damage: number = 25,
    uiCamera?: Phaser.Cameras.Scene2D.Camera
  ): void {
    const projectile = new Projectile(
      this.scene,
      shooter.sprite.x,
      shooter.sprite.y,
      targetX,
      targetY,
      damage,
      shooter,
      this.projectileGroup
    )
    
    this.projectiles.push(projectile)
    
    // Make UI camera ignore the projectile sprite
    if (uiCamera) {
      uiCamera.ignore(projectile.sprite)
    }
    
    console.log(`🏹 Hero shot projectile towards aim direction at (${Math.round(targetX)}, ${Math.round(targetY)})`)
    console.log(`🏹 Projectile sprite position:`, projectile.sprite.x, projectile.sprite.y)
    console.log(`🏹 Projectile group size:`, this.projectileGroup.children.size)
  }

  public updateProjectiles(uiCamera?: Phaser.Cameras.Scene2D.Camera): void {
    // Ensure UI camera ignores all projectiles
    if (uiCamera) {
      this.projectiles.forEach(projectile => {
        if (projectile && projectile.sprite) {
          uiCamera.ignore(projectile.sprite)
        }
      })
    }

    this.projectiles.forEach((projectile, index) => {
      if (projectile && projectile.sprite && projectile.sprite.scene) {
        projectile.update()
      } else {
        this.projectiles.splice(index, 1)
      }
    })
  }

  public getProjectiles(): Array<Projectile> {
    return this.projectiles
  }

  public reset(): void {
    this.projectiles.forEach(projectile => {
      if (projectile && projectile.sprite) {
        projectile.sprite.destroy()
      }
    })
    this.projectiles = []
  }

  public destroy(): void {
    this.reset()
  }
}