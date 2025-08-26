# Structure Blocks Tutorial

## Overview
Structure blocks are the foundation elements for building your game world. They provide terrain features, obstacles, and architectural elements that define the gameplay environment.

## Available Structure Block Types

### 1. Water Blocks
**Appearance**: Blue translucent cubes with wave patterns
**Properties**:
- **Always impassable** - No unit can move through water
- Used for rivers, lakes, moats, and water barriers
- Creates natural boundaries and strategic chokepoints

**Usage Example**:
```typescript
const waterBlock = new Structure(
  scene, 
  x, y, 
  'water_block', 
  'River Water', 
  StructureType.WATER
)
```

### 2. Wall Blocks  
**Appearance**: Gray stone cubes with brick pattern
**Properties**:
- **Impassable by default** but can be configured as passable
- Perfect for building walls, fortifications, and structures
- Can be arranged to create complex architectural layouts

**Usage Example**:
```typescript
const wallBlock = new Structure(
  scene, 
  x, y, 
  'wall_block', 
  'Stone Wall', 
  StructureType.WALL, 
  false  // isPassable - set to true to allow passage
)
```

### 3. Rock Blocks
**Appearance**: Dark gray cubes with rough texture and cracks
**Properties**:
- **Impassable by default** but can be configured as passable
- Ideal for rocky terrain, mountain paths, and natural obstacles
- More rugged appearance than wall blocks

**Usage Example**:
```typescript
const rockBlock = new Structure(
  scene, 
  x, y, 
  'rock_block', 
  'Rocky Terrain', 
  StructureType.ROCK, 
  false  // isPassable - set to true to allow passage
)
```

## Building Patterns

### Creating a Simple Building
```typescript
function createRectangularBuilding(scene: Phaser.Scene, centerX: number, centerY: number, width: number, height: number) {
  const units: Structure[] = []
  
  // Top and bottom walls
  for (let x = centerX - Math.floor(width/2); x <= centerX + Math.floor(width/2); x++) {
    // Top wall
    const topWall = new Structure(scene, x, centerY - Math.floor(height/2), 'wall_block', 'Building Wall', StructureType.WALL, false)
    units.push(topWall)
    
    // Bottom wall  
    const bottomWall = new Structure(scene, x, centerY + Math.floor(height/2), 'wall_block', 'Building Wall', StructureType.WALL, false)
    units.push(bottomWall)
  }
  
  // Left and right walls (excluding corners)
  for (let y = centerY - Math.floor(height/2) + 1; y < centerY + Math.floor(height/2); y++) {
    // Left wall
    const leftWall = new Structure(scene, centerX - Math.floor(width/2), y, 'wall_block', 'Building Wall', StructureType.WALL, false)
    units.push(leftWall)
    
    // Right wall
    const rightWall = new Structure(scene, centerX + Math.floor(width/2), y, 'wall_block', 'Building Wall', StructureType.WALL, false)
    units.push(rightWall)
  }
  
  return units
}
```

### Creating a River System
```typescript
function createRiver(scene: Phaser.Scene, startX: number, startY: number, endX: number, endY: number, width: number = 1) {
  const units: Structure[] = []
  
  // Simple vertical river
  if (startX === endX) {
    for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
      for (let w = 0; w < width; w++) {
        const water = new Structure(scene, startX + w, y, 'water_block', 'River Water', StructureType.WATER)
        units.push(water)
      }
    }
  }
  
  // Simple horizontal river
  if (startY === endY) {
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
      for (let w = 0; w < width; w++) {
        const water = new Structure(scene, x, startY + w, 'water_block', 'River Water', StructureType.WATER)
        units.push(water)
      }
    }
  }
  
  return units
}
```

## Advanced Techniques

### Mixed Material Structures
Combine different structure types for varied aesthetics:
```typescript
// Stone foundation with wall superstructure
const foundation = new Structure(scene, x, y, 'rock_block', 'Foundation', StructureType.ROCK, false)
const wall = new Structure(scene, x, y-1, 'wall_block', 'Wall', StructureType.WALL, false)
```

### Defensive Positions
```typescript
function createFortification(scene: Phaser.Scene, centerX: number, centerY: number) {
  const units: Structure[] = []
  
  // Outer wall perimeter
  for (let x = centerX - 3; x <= centerX + 3; x++) {
    for (let y = centerY - 3; y <= centerY + 3; y++) {
      // Only place walls on the perimeter
      if (x === centerX - 3 || x === centerX + 3 || y === centerY - 3 || y === centerY + 3) {
        const wall = new Structure(scene, x, y, 'wall_block', 'Fortress Wall', StructureType.WALL, false)
        units.push(wall)
      }
    }
  }
  
  // Water moat around the fortress
  for (let x = centerX - 4; x <= centerX + 4; x++) {
    for (let y = centerY - 4; y <= centerY + 4; y++) {
      // Place water in outer ring
      if ((x === centerX - 4 || x === centerX + 4 || y === centerY - 4 || y === centerY + 4) &&
          !(x >= centerX - 3 && x <= centerX + 3 && y >= centerY - 3 && y <= centerY + 3)) {
        const water = new Structure(scene, x, y, 'water_block', 'Moat', StructureType.WATER)
        units.push(water)
      }
    }
  }
  
  return units
}
```

## Best Practices

### 1. Plan Your Layout
- Sketch your structure before coding
- Consider unit movement paths
- Leave strategic gaps for gameplay flow

### 2. Performance Optimization
- Group structure creation in methods
- Store references to structures you might modify later
- Use loops for repetitive patterns

### 3. Visual Consistency
- Use wall blocks for artificial structures
- Use rock blocks for natural terrain
- Use water blocks for barriers and terrain features

### 4. Gameplay Considerations
- Always impassable: Water blocks (strategic barriers)
- Configurable passability: Wall and rock blocks
- Create chokepoints and strategic positions
- Balance defense and mobility

## Integration with Game Systems

### Unit Management
```typescript
// Add to your units array for automatic updates
this.units.push(structureBlock)

// Access structure properties
if (structureBlock.canUnitPass(hero)) {
  // Unit can move through this structure
}
```

### Collision Detection
Structure blocks automatically integrate with Phaser's physics system. Units will collide with impassable structures based on the `isPassable` property.

### Isometric Positioning
All structure blocks use the isometric coordinate system:
```typescript
structureBlock.setIsometricPosition(newX, newY)  // Moves block to new grid position
const pos = structureBlock.getIsometricPosition()  // Gets current grid position
```

## Common Patterns

1. **Base Defense**: Surround important areas with wall blocks
2. **Natural Barriers**: Use water blocks to create rivers and lakes
3. **Terrain Variety**: Mix rock blocks for natural landscapes  
4. **Maze Creation**: Combine all types for complex navigation challenges
5. **Strategic Positioning**: Create narrow passages and defensive positions

This tutorial covers the fundamentals of structure blocks. Experiment with different combinations to create unique and engaging game environments!