import Phaser from 'phaser'
import { Projectile } from '../units/Projectile'
import { MeleeProjectile } from '../units/MeleeProjectile'
import { HomingProjectile } from '../units/HomingProjectile'
import { Unit, ConfigurableHero, ConfigurableUnit } from '../units'

export class CombatSystem {
  private scene: Phaser.Scene
  private projectiles: Array<Projectile> = []
  private meleeProjectiles: Array<MeleeProjectile> = []
  private homingProjectiles: Array<HomingProjectile> = []
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
        const projectile = projectileGameObject.getData('projectile') as Projectile | MeleeProjectile | HomingProjectile
        const unit = unitGameObject.getData('unit') as Unit
        
        if (projectile && unit && unit !== projectile.owner) {
          projectile.onHit(unit)
        }
      }
    )
  }

  public shootProjectile(
    shooter: ConfigurableHero | ConfigurableUnit, 
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
    
    // Projectile created silently for performance
  }

  public shootMeleeProjectile(
    shooter: ConfigurableHero | ConfigurableUnit, 
    targetX: number, 
    targetY: number, 
    damage: number = 35, // Higher damage than ranged attack
    uiCamera?: Phaser.Cameras.Scene2D.Camera
  ): void {
    const meleeProjectile = new MeleeProjectile(
      this.scene,
      shooter.sprite.x,
      shooter.sprite.y,
      targetX,
      targetY,
      damage,
      shooter,
      80, // Short range for melee
      this.projectileGroup
    )
    
    this.meleeProjectiles.push(meleeProjectile)
    
    // Make UI camera ignore the melee projectile sprite
    if (uiCamera) {
      uiCamera.ignore(meleeProjectile.sprite)
    }
    
    // Melee projectile created silently for performance
  }

  public shootHomingProjectile(
    shooter: ConfigurableHero | ConfigurableUnit,
    targetX: number,
    targetY: number,
    damage: number = 30,
    maxRange: number = 200,
    uiCamera?: Phaser.Cameras.Scene2D.Camera
  ): void {
    console.log(`🎯 shootHomingProjectile called:`, {
      shooter: shooter.name,
      targetPos: { x: targetX, y: targetY },
      damage,
      maxRange
    })
    
    // Find enemy unit under mouse cursor within range
    const target = this.findTargetUnderCursor(shooter, targetX, targetY, maxRange)
    
    if (!target) {
      console.log(`🎯 No valid target found for homing attack at (${targetX}, ${targetY})`)
      return
    }
    
    const homingProjectile = new HomingProjectile(
      this.scene,
      shooter.sprite.x,
      shooter.sprite.y,
      target,
      damage,
      shooter,
      this.projectileGroup
    )
    
    this.homingProjectiles.push(homingProjectile)
    
    // Make UI camera ignore the homing projectile sprite
    if (uiCamera) {
      uiCamera.ignore(homingProjectile.sprite)
    }
    
    console.log(`🎯 Hero fired homing projectile at ${target.name}`)
  }

  // Special method for units to attack specific targets
  public shootHomingProjectileAtTarget(
    shooter: ConfigurableHero | ConfigurableUnit,
    target: Unit,
    damage: number = 30,
    uiCamera?: Phaser.Cameras.Scene2D.Camera
  ): void {
    console.log(`🎯 ${shooter.name} firing homing projectile at ${target.name}`)
    
    const homingProjectile = new HomingProjectile(
      this.scene,
      shooter.sprite.x,
      shooter.sprite.y,
      target,
      damage,
      shooter,
      this.projectileGroup
    )
    
    this.homingProjectiles.push(homingProjectile)
    
    // Make UI camera ignore the projectile sprite
    if (uiCamera) {
      uiCamera.ignore(homingProjectile.sprite)
    }
    
    console.log(`🎯 Homing projectile created for ${target.name}`)
  }

  private findTargetUnderCursor(
    shooter: ConfigurableHero | ConfigurableUnit,
    mouseX: number,
    mouseY: number,
    maxRange: number
  ): Unit | null {
    console.log(`🎯 Looking for target at mouse position: (${mouseX}, ${mouseY})`)
    
    // Get all units in the collision group and check each one
    const allUnits = this.unitCollisionGroup.children.entries
    let closestUnit: Unit | null = null
    let closestDistance = Infinity
    
    for (const sprite of allUnits) {
      const gameObject = sprite as Phaser.Physics.Arcade.Sprite
      if (gameObject && gameObject.getData) {
        const unit = gameObject.getData('unit') as Unit
        
        if (unit && unit !== shooter && (unit instanceof ConfigurableUnit)) {
          // Check if mouse is over this unit's sprite bounds
          const bounds = gameObject.getBounds()
          // mouseX and mouseY are already world coordinates from pointer.worldX/worldY
          const worldMouseX = mouseX
          const worldMouseY = mouseY
          
          console.log(`🎯 Checking unit ${unit.name} at bounds:`, {
            bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
            mouseWorld: { x: worldMouseX, y: worldMouseY },
            contains: bounds.contains(worldMouseX, worldMouseY)
          })
          
          if (bounds.contains(worldMouseX, worldMouseY)) {
            // Check if unit is within range of the shooter using actual sprite positions
            const shooterSpriteX = shooter.sprite.x
            const shooterSpriteY = shooter.sprite.y
            const targetSpriteX = gameObject.x
            const targetSpriteY = gameObject.y
            const pixelDistance = Math.sqrt(
              Math.pow(targetSpriteX - shooterSpriteX, 2) + 
              Math.pow(targetSpriteY - shooterSpriteY, 2)
            )
            
            console.log(`🎯 Unit ${unit.name} is under cursor, distance: ${pixelDistance} pixels (max: ${maxRange})`)
            
            if (pixelDistance <= maxRange) {
              if (pixelDistance < closestDistance) {
                closestDistance = pixelDistance
                closestUnit = unit
              }
            } else {
              console.log(`🎯 Unit ${unit.name} is too far (${pixelDistance} > ${maxRange})`)
            }
          }
        }
      }
    }
    
    if (closestUnit) {
      // Target found silently for performance
    } else {
      // No target found (silent for performance)
    }
    
    return closestUnit
  }

  public updateProjectiles(uiCamera?: Phaser.Cameras.Scene2D.Camera): void {
    // Ensure UI camera ignores all projectiles (only if camera provided)
    if (uiCamera) {
      // Use for loops for better performance
      for (let i = 0; i < this.projectiles.length; i++) {
        const projectile = this.projectiles[i]
        if (projectile && projectile.sprite) {
          uiCamera.ignore(projectile.sprite)
        }
      }
      
      for (let i = 0; i < this.meleeProjectiles.length; i++) {
        const meleeProjectile = this.meleeProjectiles[i]
        if (meleeProjectile && meleeProjectile.sprite) {
          uiCamera.ignore(meleeProjectile.sprite)
        }
      }
      
      for (let i = 0; i < this.homingProjectiles.length; i++) {
        const homingProjectile = this.homingProjectiles[i]
        if (homingProjectile && homingProjectile.sprite) {
          uiCamera.ignore(homingProjectile.sprite)
        }
      }
    }

    // Update regular projectiles (backwards iteration to avoid index issues when removing)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      if (projectile && projectile.sprite && projectile.sprite.scene) {
        projectile.update()
      } else {
        this.projectiles.splice(i, 1)
      }
    }
    
    // Update melee projectiles
    for (let i = this.meleeProjectiles.length - 1; i >= 0; i--) {
      const meleeProjectile = this.meleeProjectiles[i]
      if (meleeProjectile && meleeProjectile.sprite && meleeProjectile.sprite.scene) {
        meleeProjectile.update()
      } else {
        this.meleeProjectiles.splice(i, 1)
      }
    }
    
    // Update homing projectiles
    for (let i = this.homingProjectiles.length - 1; i >= 0; i--) {
      const homingProjectile = this.homingProjectiles[i]
      if (homingProjectile && homingProjectile.sprite && homingProjectile.sprite.scene) {
        homingProjectile.update()
      } else {
        this.homingProjectiles.splice(i, 1)
      }
    }
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
    
    this.meleeProjectiles.forEach(meleeProjectile => {
      if (meleeProjectile && meleeProjectile.sprite) {
        meleeProjectile.sprite.destroy()
      }
    })
    this.meleeProjectiles = []
    
    this.homingProjectiles.forEach(homingProjectile => {
      if (homingProjectile && homingProjectile.sprite) {
        homingProjectile.sprite.destroy()
      }
    })
    this.homingProjectiles = []
  }

  public destroy(): void {
    this.reset()
  }
}