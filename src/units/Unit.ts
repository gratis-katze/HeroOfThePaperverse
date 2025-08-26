import Phaser from 'phaser'
import { HealthBar } from './HealthBar'

export enum UnitType {
  HERO = 'hero',
  STRUCTURE = 'structure',
  DESTRUCTIBLE = 'destructible',
  BASIC_UNIT = 'basic_unit'
}

export abstract class Unit {
  public sprite: Phaser.Physics.Arcade.Sprite
  public id: string
  public name: string
  public unitType: UnitType
  public isometricX: number
  public isometricY: number
  public healthBar?: HealthBar

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    name: string,
    unitType: UnitType
  ) {
    this.id = Phaser.Utils.String.UUID()
    this.name = name
    this.unitType = unitType
    this.isometricX = x
    this.isometricY = y
    
    // Convert isometric coordinates to screen coordinates
    const screenX = (x - y) * 32
    const screenY = (x + y) * 16
    
    this.sprite = scene.physics.add.sprite(screenX, screenY, texture)
    this.sprite.setData('unit', this)
  }

  public destroy(): void {
    if (this.healthBar) {
      this.healthBar.destroy()
    }
    this.sprite.destroy()
  }

  public createHealthBar(): void {
    if (!this.healthBar) {
      this.healthBar = new HealthBar(this.sprite.scene, this.sprite.x, this.sprite.y - 25)
      
      // Make UI camera ignore health bar if it exists
      const scene = this.sprite.scene as any
      if (scene.uiCamera) {
        scene.uiCamera.ignore(this.healthBar.getContainer())
      }
    }
  }

  public updateHealthBar(currentHealth: number, maxHealth: number): void {
    if (this.healthBar) {
      this.healthBar.updateHealth(currentHealth, maxHealth)
      this.healthBar.setPosition(this.sprite.x, this.sprite.y - 25)
    }
  }

  public setHealthBarVisible(visible: boolean): void {
    if (this.healthBar) {
      this.healthBar.setVisible(visible)
    }
  }

  public setIsometricPosition(isoX: number, isoY: number): void {
    this.isometricX = isoX
    this.isometricY = isoY
    
    const screenX = (isoX - isoY) * 32
    const screenY = (isoX + isoY) * 16
    
    this.sprite.setPosition(screenX, screenY)
  }

  public getIsometricPosition(): { x: number, y: number } {
    return { x: this.isometricX, y: this.isometricY }
  }

  public takeDamage(amount: number, _attacker?: Unit): number {
    // Default implementation - subclasses should override this
    return amount
  }

  public abstract update(time: number, delta: number): void
}