import { Structure, BasicUnit, Hero } from '../../units'
import { MapData, TerrainType } from '../../scenes/MapEditorScene'

export class MapDataManager {
  constructor() {}

  public createMapData(
    mapWidth: number,
    mapHeight: number,
    terrain: Map<string, Phaser.GameObjects.Image>,
    structures: Array<Structure>,
    units: Array<Hero | BasicUnit>
  ): MapData {
    const terrainData: Array<{x: number, y: number, type: TerrainType}> = []
    terrain.forEach((sprite, key) => {
      const [x, y] = key.split(',').map(Number)
      // Find terrain type by checking which texture was used
      const textureKey = sprite.texture.key
      const terrainType = Object.entries({
        [TerrainType.GRASS]: 'grass_terrain',
        [TerrainType.SNOW]: 'snow_terrain',
        [TerrainType.ROCK]: 'rock_terrain',
        [TerrainType.MUD]: 'mud_terrain',
        [TerrainType.SAND]: 'sand_terrain'
      }).find(([_, texture]) => texture === textureKey)?.[0] as TerrainType
      
      if (terrainType) {
        terrainData.push({ x, y, type: terrainType })
      }
    })
    
    return {
      width: mapWidth,
      height: mapHeight,
      terrain: terrainData,
      structures: structures.map(s => ({
        x: s.isometricX,
        y: s.isometricY,
        type: s.structureType
      })),
      units: units.map(u => {
        if (u instanceof Hero) {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: 'hero' as const,
            stats: { strength: u.stats.strength, intelligence: u.stats.intelligence, agility: u.stats.agility }
          }
        } else {
          return {
            x: u.isometricX,
            y: u.isometricY,
            type: u.basicUnitType,
            stats: {
              health: u.maxHealth,
              attack: u.attack,
              defense: u.defense,
              attackSpeed: u.attackSpeed,
              movementSpeed: u.movementSpeed
            }
          }
        }
      })
    }
  }

  public saveMapToFile(mapData: MapData): void {
    const jsonData = JSON.stringify(mapData, null, 2)
    this.downloadFile('map.json', jsonData)
    console.log('💾 Map saved')
  }

  public loadMapFromFile(): Promise<MapData> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const mapData: MapData = JSON.parse(e.target?.result as string)
              resolve(mapData)
            } catch (error) {
              console.error('❌ Failed to load map:', error)
              reject(error)
            }
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(file)
        } else {
          reject(new Error('No file selected'))
        }
      }
      input.click()
    })
  }

  public validateMapData(mapData: any): MapData | null {
    try {
      if (!mapData || typeof mapData !== 'object') {
        throw new Error('Invalid map data format')
      }

      const validatedData: MapData = {
        width: mapData.width || 50,
        height: mapData.height || 50,
        terrain: [],
        structures: [],
        units: []
      }

      // Validate terrain
      if (mapData.terrain && Array.isArray(mapData.terrain)) {
        validatedData.terrain = mapData.terrain.filter((item: any) => 
          item && 
          typeof item.x === 'number' && 
          typeof item.y === 'number' && 
          typeof item.type === 'string' &&
          Object.values(TerrainType).includes(item.type)
        )
      }

      // Validate structures
      if (mapData.structures && Array.isArray(mapData.structures)) {
        validatedData.structures = mapData.structures.filter((item: any) => 
          item && 
          typeof item.x === 'number' && 
          typeof item.y === 'number' && 
          typeof item.type === 'string'
        )
      }

      // Validate units
      if (mapData.units && Array.isArray(mapData.units)) {
        validatedData.units = mapData.units.filter((item: any) => 
          item && 
          typeof item.x === 'number' && 
          typeof item.y === 'number' && 
          typeof item.type === 'string' &&
          item.stats
        )
      }

      return validatedData
    } catch (error) {
      console.error('❌ Map data validation failed:', error)
      return null
    }
  }

  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  public createGameSceneData(mapData: MapData): any {
    return {
      ...mapData,
      metadata: {
        fromEditor: true,
        wasSaved: true,
        createdAt: new Date().toISOString()
      }
    }
  }
}