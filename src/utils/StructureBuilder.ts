import Phaser from 'phaser'
import { Structure, StructureType } from '../units'

export interface Point {
  x: number
  y: number
}

export class StructureBuilder {
  
  /**
   * Creates a wall from start point to end point with specified width
   * @param scene - Phaser scene
   * @param start - Starting coordinates {x, y}
   * @param end - Ending coordinates {x, y} 
   * @param width - Width of the wall (default: 1)
   * @param blockType - Type of structure block to use (default: WALL)
   * @returns Array of created Structure objects
   */
  static createWall(
    scene: Phaser.Scene, 
    start: Point, 
    end: Point, 
    width: number = 1,
    blockType: StructureType = StructureType.WALL
  ): Structure[] {
    const structures: Structure[] = []
    const textureMap = {
      [StructureType.WALL]: 'wall_block',
      [StructureType.ROCK]: 'rock_block', 
      [StructureType.WATER]: 'water_block'
    }
    
    // Calculate direction and distance
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    
    // Normalize direction
    const stepX = distance === 0 ? 0 : deltaX / distance
    const stepY = distance === 0 ? 0 : deltaY / distance
    
    // Create wall blocks along the path
    for (let i = 0; i <= distance; i++) {
      const baseX = Math.round(start.x + stepX * i)
      const baseY = Math.round(start.y + stepY * i)
      
      // Create width by adding blocks perpendicular to the main direction
      for (let w = 0; w < width; w++) {
        let offsetX = 0
        let offsetY = 0
        
        // Calculate perpendicular offset based on primary direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal wall, extend vertically
          offsetY = w - Math.floor((width - 1) / 2)
        } else {
          // Vertical wall, extend horizontally  
          offsetX = w - Math.floor((width - 1) / 2)
        }
        
        const finalX = baseX + offsetX
        const finalY = baseY + offsetY
        
        const structure = new Structure(
          scene,
          finalX,
          finalY,
          textureMap[blockType],
          `${blockType} Block`,
          blockType,
          false
        )
        
        structures.push(structure)
      }
    }
    
    return structures
  }
  
  /**
   * Creates a river from start point to end point with specified width
   * @param scene - Phaser scene
   * @param start - Starting coordinates {x, y}
   * @param end - Ending coordinates {x, y}
   * @param width - Width of the river (default: 1)
   * @returns Array of created Structure objects
   */
  static createRiver(
    scene: Phaser.Scene,
    start: Point,
    end: Point, 
    width: number = 1
  ): Structure[] {
    const structures: Structure[] = []
    
    // Calculate direction and distance
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    
    // Normalize direction
    const stepX = distance === 0 ? 0 : deltaX / distance
    const stepY = distance === 0 ? 0 : deltaY / distance
    
    // Create water blocks along the path
    for (let i = 0; i <= distance; i++) {
      const baseX = Math.round(start.x + stepX * i)
      const baseY = Math.round(start.y + stepY * i)
      
      // Create width by adding blocks perpendicular to the main direction
      for (let w = 0; w < width; w++) {
        let offsetX = 0
        let offsetY = 0
        
        // Calculate perpendicular offset based on primary direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal river, extend vertically
          offsetY = w - Math.floor((width - 1) / 2)
        } else {
          // Vertical river, extend horizontally
          offsetX = w - Math.floor((width - 1) / 2)
        }
        
        const finalX = baseX + offsetX
        const finalY = baseY + offsetY
        
        const structure = new Structure(
          scene,
          finalX,
          finalY,
          'water_block',
          'River Water',
          StructureType.WATER
        )
        
        structures.push(structure)
      }
    }
    
    return structures
  }
  
  /**
   * Creates a rectangular wall structure (hollow rectangle)
   * @param scene - Phaser scene
   * @param center - Center coordinates {x, y}
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle  
   * @param wallThickness - Thickness of the walls (default: 1)
   * @param blockType - Type of structure block to use (default: WALL)
   * @returns Array of created Structure objects
   */
  static createRectangularWall(
    scene: Phaser.Scene,
    center: Point,
    width: number,
    height: number,
    wallThickness: number = 1,
    blockType: StructureType = StructureType.WALL
  ): Structure[] {
    const structures: Structure[] = []
    
    const halfWidth = Math.floor(width / 2)
    const halfHeight = Math.floor(height / 2)
    
    // Top wall
    const topWalls = this.createWall(
      scene,
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      wallThickness,
      blockType
    )
    structures.push(...topWalls)
    
    // Bottom wall
    const bottomWalls = this.createWall(
      scene,
      { x: center.x - halfWidth, y: center.y + halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      wallThickness,
      blockType
    )
    structures.push(...bottomWalls)
    
    // Left wall (excluding corners to avoid overlap)
    if (height > 2) {
      const leftWalls = this.createWall(
        scene,
        { x: center.x - halfWidth, y: center.y - halfHeight + 1 },
        { x: center.x - halfWidth, y: center.y + halfHeight - 1 },
        wallThickness,
        blockType
      )
      structures.push(...leftWalls)
    }
    
    // Right wall (excluding corners to avoid overlap)
    if (height > 2) {
      const rightWalls = this.createWall(
        scene,
        { x: center.x + halfWidth, y: center.y - halfHeight + 1 },
        { x: center.x + halfWidth, y: center.y + halfHeight - 1 },
        wallThickness,
        blockType
      )
      structures.push(...rightWalls)
    }
    
    return structures
  }
  
  /**
   * Creates an L-shaped river
   * @param scene - Phaser scene
   * @param start - Starting coordinates {x, y}
   * @param corner - Corner coordinates {x, y}
   * @param end - Ending coordinates {x, y}
   * @param width - Width of the river (default: 1)
   * @returns Array of created Structure objects
   */
  static createLShapedRiver(
    scene: Phaser.Scene,
    start: Point,
    corner: Point,
    end: Point,
    width: number = 1
  ): Structure[] {
    const structures: Structure[] = []
    
    // First segment: start to corner
    const firstSegment = this.createRiver(scene, start, corner, width)
    structures.push(...firstSegment)
    
    // Second segment: corner to end
    const secondSegment = this.createRiver(scene, corner, end, width)
    structures.push(...secondSegment)
    
    return structures
  }
}