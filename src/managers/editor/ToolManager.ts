import { EditorTool, TerrainType } from '../../scenes/MapEditorScene'
import { StructureType, BasicUnitType } from '../../units'

export class ToolManager {
  private currentTool: EditorTool = EditorTool.PLACE
  private selectedBlockType: StructureType = StructureType.WALL
  private selectedUnitType: 'hero' | BasicUnitType = 'hero'
  private selectedTerrainType: TerrainType = TerrainType.GRASS
  private activeItemType: 'terrain' | 'block' | 'unit' = 'terrain'
  private mapWidth: number = 50
  private mapHeight: number = 50

  constructor() {}

  public setTool(tool: EditorTool): void {
    console.log(`🔧 Tool changed to: ${tool}`)
    this.currentTool = tool
  }

  public setBlockType(type: StructureType): void {
    this.selectedBlockType = type
    this.activeItemType = 'block'
    console.log(`🧱 Selected block: ${type}`)
  }

  public setUnitType(type: 'hero' | BasicUnitType): void {
    this.selectedUnitType = type
    this.activeItemType = 'unit'
    console.log(`👥 Selected unit: ${type}`)
  }

  public setTerrainType(type: TerrainType): void {
    this.selectedTerrainType = type
    this.activeItemType = 'terrain'
    console.log(`🌱 Selected terrain: ${type}`)
  }

  public setMapSize(width: number, height: number): void {
    console.log(`📏 setMapSize called: ${width} x ${height}`)
    this.mapWidth = width
    this.mapHeight = height
    console.log(`📏 Map size changed to ${width} x ${height}`)
  }

  public getCurrentTool(): EditorTool {
    return this.currentTool
  }

  public getSelectedBlockType(): StructureType {
    return this.selectedBlockType
  }

  public getSelectedUnitType(): 'hero' | BasicUnitType {
    return this.selectedUnitType
  }

  public getSelectedTerrainType(): TerrainType {
    return this.selectedTerrainType
  }

  public getActiveItemType(): 'terrain' | 'block' | 'unit' {
    return this.activeItemType
  }

  public getMapSize(): { width: number, height: number } {
    return { width: this.mapWidth, height: this.mapHeight }
  }

  public getStatusText(cameraInfo: string): string {
    const mode = this.activeItemType === 'terrain' ? `Terrain: ${this.selectedTerrainType}` :
                 this.activeItemType === 'block' ? `Block: ${this.selectedBlockType}` : 
                 `Unit: ${this.selectedUnitType}`
    return `${this.currentTool.toUpperCase()} - ${mode} | Map: ${this.mapWidth}x${this.mapHeight} | ${cameraInfo}`
  }

  public isToolActive(toolName: string): boolean {
    switch (toolName) {
      case 'Place':
        return this.currentTool === EditorTool.PLACE
      case 'Erase':
        return this.currentTool === EditorTool.ERASE
      default:
        return false
    }
  }

  public isTerrainActive(terrainName: string): boolean {
    if (this.activeItemType !== 'terrain') return false
    
    switch (terrainName) {
      case 'Grass':
        return this.selectedTerrainType === TerrainType.GRASS
      case 'Snow':
        return this.selectedTerrainType === TerrainType.SNOW
      case 'Rock':
        return this.selectedTerrainType === TerrainType.ROCK
      case 'Mud':
        return this.selectedTerrainType === TerrainType.MUD
      case 'Sand':
        return this.selectedTerrainType === TerrainType.SAND
      default:
        return false
    }
  }

  public isBlockActive(blockName: string): boolean {
    if (this.activeItemType !== 'block') return false
    
    switch (blockName) {
      case 'Water':
        return this.selectedBlockType === StructureType.WATER
      case 'Wall':
        return this.selectedBlockType === StructureType.WALL
      case 'Rock':
        return this.selectedBlockType === StructureType.ROCK
      default:
        return false
    }
  }

  public isUnitActive(unitName: string): boolean {
    if (this.activeItemType !== 'unit') return false
    
    switch (unitName) {
      case 'Hero':
        return this.selectedUnitType === 'hero'
      case 'Warrior':
        return this.selectedUnitType === BasicUnitType.WARRIOR
      case 'Archer':
        return this.selectedUnitType === BasicUnitType.ARCHER
      default:
        return false
    }
  }
}