import Phaser from 'phaser'
import { Structure, BasicUnit, Hero } from '../units'
import { BasicUnitType, CombatStats, HeroStats, StructureType } from '../units'
import { MapData, TerrainType } from '../scenes/MapEditorScene'
import { IsometricGraphics } from '../graphics/IsometricGraphics'

export class MapManager {
  private scene: Phaser.Scene
  private terrain: Map<string, Phaser.GameObjects.Image> = new Map()
  private uiCamera: Phaser.Cameras.Scene2D.Camera

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
  }

  public createAllGraphics(): void {
    IsometricGraphics.createHeroGraphic(this.scene, 'hero')
    IsometricGraphics.createWarriorGraphic(this.scene, 'warrior')
    IsometricGraphics.createArcherGraphic(this.scene, 'archer')
    IsometricGraphics.createWaterBlockGraphic(this.scene, 'water_block')
    IsometricGraphics.createWallBlockGraphic(this.scene, 'wall_block')
    IsometricGraphics.createRockBlockGraphic(this.scene, 'rock_block')
    IsometricGraphics.createTreeGraphic(this.scene, 'tree')
    IsometricGraphics.createRockGraphic(this.scene, 'rock')
    IsometricGraphics.createProjectileGraphic(this.scene, 'projectile')
    
    // Create terrain graphics
    IsometricGraphics.createGrassTerrainGraphic(this.scene, 'grass_terrain')
    IsometricGraphics.createSnowTerrainGraphic(this.scene, 'snow_terrain')
    IsometricGraphics.createRockTerrainGraphic(this.scene, 'rock_terrain')
    IsometricGraphics.createMudTerrainGraphic(this.scene, 'mud_terrain')
    IsometricGraphics.createSandTerrainGraphic(this.scene, 'sand_terrain')
  }

  public loadMapFromData(
    mapData: MapData, 
    structures: Structure[], 
    units: Array<Hero | BasicUnit | Structure>, 
    unitCollisionGroup: Phaser.Physics.Arcade.Group,
    onRegisterUnit: (unit: any, x: number, y: number) => void,
    onRemoveUnit: (unit: any, x: number, y: number) => void
  ): void {
    // Clear existing terrain
    this.terrain.forEach(terrainSprite => terrainSprite.destroy())
    this.terrain.clear()
    
    // Clear existing structures
    structures.forEach(structure => {
      structure.destroy()
      onRemoveUnit(structure, structure.isometricX, structure.isometricY)
    })
    structures.length = 0

    // Remove non-hero units
    for (let i = units.length - 1; i >= 0; i--) {
      const unit = units[i]
      if (!(unit instanceof Hero)) {
        if (unit instanceof BasicUnit) {
          unitCollisionGroup.remove(unit.sprite)
        }
        unit.destroy()
        onRemoveUnit(unit as any, unit.isometricX, unit.isometricY)
        units.splice(i, 1)
      }
    }

    // Load terrain from map data
    if (mapData.terrain) {
      mapData.terrain.forEach(terrainData => {
        this.loadTerrain(terrainData.x, terrainData.y, terrainData.type)
      })
    }

    // Load structures from map data
    mapData.structures.forEach(structData => {
      const structure = this.loadStructure(structData.x, structData.y, structData.type)
      structures.push(structure)
      units.push(structure)
      onRegisterUnit(structure, structData.x, structData.y)
    })

    // Load units from map data
    mapData.units.forEach(unitData => {
      if (unitData.type !== 'hero') { // Don't replace the player hero
        const unit = this.loadUnit(unitData.x, unitData.y, unitData.type, unitData.stats as CombatStats, unitCollisionGroup)
        units.push(unit)
        onRegisterUnit(unit, unitData.x, unitData.y)
      }
    })

    console.log(`📁 Loaded map with ${mapData.terrain?.length || 0} terrain tiles, ${mapData.structures.length} structures and ${mapData.units.length} units`)
  }

  private loadStructure(x: number, y: number, type: StructureType): Structure {
    const textureMap = {
      [StructureType.WATER]: 'water_block',
      [StructureType.WALL]: 'wall_block',
      [StructureType.ROCK]: 'rock_block'
    }

    const structure = new Structure(
      this.scene,
      x,
      y,
      textureMap[type],
      `${type} Block`,
      type
    )
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(structure.sprite)
    
    return structure
  }

  private loadTerrain(x: number, y: number, type: TerrainType): void {
    const key = `${x},${y}`
    const screenPos = this.isometricToScreen(x, y)
    
    const textureMap = {
      [TerrainType.GRASS]: 'grass_terrain',
      [TerrainType.SNOW]: 'snow_terrain',
      [TerrainType.ROCK]: 'rock_terrain',
      [TerrainType.MUD]: 'mud_terrain',
      [TerrainType.SAND]: 'sand_terrain'
    }
    
    const terrainSprite = this.scene.add.image(screenPos.x, screenPos.y, textureMap[type])
    terrainSprite.setDepth(-1000) // Render behind everything else
    this.terrain.set(key, terrainSprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(terrainSprite)
  }
  
  private isometricToScreen(isoX: number, isoY: number): {x: number, y: number} {
    const x = (isoX - isoY) * 32
    const y = (isoX + isoY) * 16
    return { x, y }
  }

  private loadUnit(x: number, y: number, type: BasicUnitType, stats: CombatStats, unitCollisionGroup: Phaser.Physics.Arcade.Group): BasicUnit {
    const unit = new BasicUnit(this.scene, x, y, type, `Loaded ${type}`, type, stats)
    unitCollisionGroup.add(unit.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(unit.sprite)
    if (unit.healthBar) {
      this.uiCamera.ignore(unit.healthBar.getContainer())
    }
    
    return unit
  }

  public createHero(x: number, y: number, stats: HeroStats, unitCollisionGroup: Phaser.Physics.Arcade.Group): Hero {
    const hero = new Hero(this.scene, x, y, 'hero', 'Player Hero', stats)
    unitCollisionGroup.add(hero.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(hero.sprite)
    if (hero.healthBar) {
      this.uiCamera.ignore(hero.healthBar.getContainer())
    }
    
    return hero
  }

  public createEnemyUnits(
    units: Array<Hero | BasicUnit | Structure>, 
    unitCollisionGroup: Phaser.Physics.Arcade.Group,
    onRegisterUnit: (unit: any, x: number, y: number) => void
  ): void {
    // Create warrior enemy
    const warriorStats: CombatStats = { health: 60, attack: 15, defense: 3, attackSpeed: 1, movementSpeed: 100 }
    const warrior = new BasicUnit(this.scene, 60, 15, 'warrior', 'Enemy Warrior', BasicUnitType.WARRIOR, warriorStats)
    units.push(warrior)
    onRegisterUnit(warrior, 60, 15)
    unitCollisionGroup.add(warrior.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(warrior.sprite)
    if (warrior.healthBar) {
      this.uiCamera.ignore(warrior.healthBar.getContainer())
    }
    
    // Create archer enemy  
    const archerStats: CombatStats = { health: 40, attack: 20, defense: 1, attackSpeed: 1.5, movementSpeed: 120 }
    const archer = new BasicUnit(this.scene, 18, 8, 'archer', 'Enemy Archer', BasicUnitType.ARCHER, archerStats)
    units.push(archer)
    onRegisterUnit(archer, 18, 8)
    unitCollisionGroup.add(archer.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(archer.sprite)
    if (archer.healthBar) {
      this.uiCamera.ignore(archer.healthBar.getContainer())
    }
    
    console.log(`💀 Created ${units.filter(u => u instanceof BasicUnit).length} enemy units for combat testing`)
  }

  public destroy(): void {
    this.terrain.forEach(terrainSprite => terrainSprite.destroy())
    this.terrain.clear()
  }
}