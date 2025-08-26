import Phaser from 'phaser'
import { Structure, ConfigurableUnit, ConfigurableHero } from '../units'
import { HeroStats, StructureType, UnitConfig, AttackType } from '../units'
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
    units: Array<ConfigurableUnit | ConfigurableHero | Structure>, 
    unitCollisionGroup: Phaser.Physics.Arcade.Group,
    onRegisterUnit: (unit: any, x: number, y: number) => void,
    onRemoveUnit: (unit: any, x: number, y: number) => void,
    _unitManager?: any,
    combatSystem?: any,
    _aiManager?: any,
    structureCollisionGroup?: Phaser.Physics.Arcade.Group
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
      if (!(unit instanceof ConfigurableHero)) {
        if (unit instanceof ConfigurableUnit) {
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
      
      // Add wall structures to collision group for physics blocking
      if (structureCollisionGroup && !structure.isPassable) {
        structureCollisionGroup.add(structure.sprite)
      }
    })

    // Load units from map data
    mapData.units.forEach(unitData => {
      if (unitData.type === 'configurable') {
        const unit = new ConfigurableUnit(this.scene, unitData.x, unitData.y, `Loaded ${unitData.type}`, unitData.stats as UnitConfig)
        unitCollisionGroup.add(unit.sprite)
        
        // AI system has been removed
        
        // Set combat system if available
        if (combatSystem) {
          unit.setCombatSystem(combatSystem)
        }
        
        // Make UI camera ignore world objects
        this.uiCamera.ignore(unit.sprite)
        if (unit.healthBar) {
          this.uiCamera.ignore(unit.healthBar.getContainer())
        }
        
        units.push(unit)
        onRegisterUnit(unit, unitData.x, unitData.y)
      } else if (unitData.type === 'configurableHero') {
        // Create configurable hero from map data
        const heroData = unitData.stats as { config: UnitConfig, heroStats: HeroStats }
        const hero = new ConfigurableHero(
          this.scene,
          unitData.x,
          unitData.y,
          'Custom Hero',
          heroData.config,
          heroData.heroStats
        )
        unitCollisionGroup.add(hero.sprite)
        
        // Make UI camera ignore world objects
        this.uiCamera.ignore(hero.sprite)
        if (hero.healthBar) {
          this.uiCamera.ignore(hero.healthBar.getContainer())
        }
        // Handle level display UI elements
        if ((hero as any).levelText) {
          this.uiCamera.ignore((hero as any).levelText)
        }
        if ((hero as any).expCircle) {
          this.uiCamera.ignore((hero as any).expCircle)
        }
        if ((hero as any).expBackground) {
          this.uiCamera.ignore((hero as any).expBackground)
        }
        
        units.push(hero)
        onRegisterUnit(hero, unitData.x, unitData.y)
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


  /*public createHero(x: number, y: number, stats: HeroStats, unitCollisionGroup: Phaser.Physics.Arcade.Group): ConfigurableHero {
    // Use animated spritesheet if available, otherwise fallback to static texture
    const texture = this.scene.textures.exists('hero_idle') ? 'hero_idle' : 'hero'
    // Create a default unit config for the hero
    const defaultConfig: UnitConfig = {
      health: 100 + (stats.strength * 10),
      attack: 10 + (stats.strength * 2),
      defense: 5 + (stats.strength),
      attackSpeed: 1 + (stats.agility * 0.1),
      movementSpeed: 150 + (stats.agility * 5),
      attackRange: 1,
      availableAttackTypes: {
        melee: { enabled: true },
        ranged: { enabled: true },
        homing: { enabled: true }
      },
      activeAttackType: AttackType.MELEE,
      goldOnDeath: 0,
      expOnDeath: 0,
      animationPrefix: 'hero',
      texture: texture
    }
    const hero = new ConfigurableHero(this.scene, x, y, 'Player Hero', defaultConfig, stats)
    unitCollisionGroup.add(hero.sprite)
    
    // Make UI camera ignore world objects
    this.uiCamera.ignore(hero.sprite)
    if (hero.healthBar) {
      this.uiCamera.ignore(hero.healthBar.getContainer())
    }
    
    return hero
  }*/



  public addStructureToCollisionGroup(structure: Structure, structureCollisionGroup: Phaser.Physics.Arcade.Group): void {
    // Add wall structures to collision group for physics blocking
    if (!structure.isPassable) {
      structureCollisionGroup.add(structure.sprite)
    }
  }

  public destroy(): void {
    this.terrain.forEach(terrainSprite => terrainSprite.destroy())
    this.terrain.clear()
  }
}