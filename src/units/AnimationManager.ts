import { AnimationType, AnimationDirection, AnimationState } from './AnimationTypes'

export class AnimationManager {
  private currentState: AnimationState
  private sprite: Phaser.GameObjects.Sprite
  private animationPrefix: string
  private isAttacking: boolean = false
  private isTakingHit: boolean = false

  constructor(sprite: Phaser.GameObjects.Sprite, animationPrefix: string) {
    this.sprite = sprite
    this.animationPrefix = animationPrefix
    this.currentState = {
      type: AnimationType.IDLE,
      direction: AnimationDirection.IDLE
    }
  }

  public setAnimation(type: AnimationType, direction: AnimationDirection): void {
    // Don't allow other animations to interrupt attack or take hit
    if ((this.isAttacking && type !== AnimationType.ATTACK && type !== AnimationType.TAKE_HIT) ||
        (this.isTakingHit && type !== AnimationType.TAKE_HIT)) {
      return
    }
    
    const animKey = this.getAnimationKey(type, direction)
    
    if ((this.currentState.direction !== direction || this.currentState.type !== type) 
        && this.sprite.scene && this.sprite.scene.anims && this.sprite.scene.anims.exists(animKey)) {
      this.currentState.direction = direction
      this.currentState.type = type
      this.sprite.play(animKey)
    }
  }

  public setDirection(direction: AnimationDirection): void {
    this.setAnimation(this.currentState.type, direction)
  }

  public setAnimationType(type: AnimationType): void {
    this.setAnimation(type, this.currentState.direction)
  }

  public getCurrentState(): AnimationState {
    return { ...this.currentState }
  }

  public calculateDirectionFromMovement(deltaX: number, deltaY: number): AnimationDirection {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    if (absX > absY * 1.5) {
      return deltaX > 0 ? AnimationDirection.RIGHT_DOWN : AnimationDirection.LEFT_UP
    } else if (absY > absX * 1.5) {
      return deltaY > 0 ? AnimationDirection.LEFT_DOWN : AnimationDirection.RIGHT_UP
    } else {
      if (deltaX > 0 && deltaY > 0) return AnimationDirection.DOWN
      if (deltaX < 0 && deltaY < 0) return AnimationDirection.UP
      if (deltaX > 0 && deltaY < 0) return AnimationDirection.RIGHT_UP
      if (deltaX < 0 && deltaY > 0) return AnimationDirection.LEFT_DOWN
    }
    
    return AnimationDirection.IDLE
  }

  public startIdleAnimation(): void {
    const animKey = this.getAnimationKey(AnimationType.IDLE, AnimationDirection.IDLE)
    if (this.sprite.scene && this.sprite.scene.anims && this.sprite.scene.anims.exists(animKey)) {
      this.sprite.play(animKey)
      this.currentState.direction = AnimationDirection.IDLE
      this.currentState.type = AnimationType.IDLE
    }
  }

  public playAttackAnimation(): void {
    // Don't start new attack if already attacking
    if (this.isAttacking) {
      return
    }
    
    const attackAnimKey = this.getAnimationKey(AnimationType.ATTACK, this.currentState.direction)
    
    if (this.sprite.scene && this.sprite.scene.anims && this.sprite.scene.anims.exists(attackAnimKey)) {
      // Set attacking state
      this.isAttacking = true
      
      // Remove any existing animation listeners to prevent accumulation
      this.sprite.removeAllListeners('animationcomplete')
      
      // Play attack animation once, then return to idle
      this.sprite.play(attackAnimKey)
      this.currentState.type = AnimationType.ATTACK
      
      // Listen for animation complete to return to idle
      this.sprite.once('animationcomplete', () => {
        this.isAttacking = false
        this.setAnimation(AnimationType.IDLE, this.currentState.direction)
      })
    }
  }

  public playTakeHitAnimation(): void {
    // Take hit animation can interrupt most other animations except death
    if (this.currentState.type === AnimationType.DEATH) {
      return
    }
    
    const takeHitAnimKey = this.getAnimationKey(AnimationType.TAKE_HIT, this.currentState.direction)
    
    if (this.sprite.scene && this.sprite.scene.anims && this.sprite.scene.anims.exists(takeHitAnimKey)) {
      // Set take hit state
      this.isTakingHit = true
      this.isAttacking = false // Stop attacking if taking hit
      
      // Remove any existing animation listeners to prevent accumulation
      this.sprite.removeAllListeners('animationcomplete')
      
      // Play take hit animation once, then return to previous state or idle
      this.sprite.play(takeHitAnimKey)
      this.currentState.type = AnimationType.TAKE_HIT
      
      // Listen for animation complete to return to previous state
      this.sprite.once('animationcomplete', () => {
        this.isTakingHit = false
        // Return to idle instead of previous state for simplicity
        this.setAnimation(AnimationType.IDLE, this.currentState.direction)
      })
    }
  }

  private getAnimationKey(type: AnimationType, direction: AnimationDirection): string {
    return `${this.animationPrefix}_${type}_${direction}`
  }

  public destroy(): void {
    // Clean up event listeners to prevent memory leaks
    if (this.sprite) {
      this.sprite.removeAllListeners('animationcomplete')
    }
    this.isAttacking = false
    this.isTakingHit = false
  }
}