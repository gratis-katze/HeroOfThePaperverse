export interface PathNode {
  x: number
  y: number
  g: number // Cost from start
  h: number // Heuristic cost to goal
  f: number // Total cost (g + h)
  parent: PathNode | null
}

export interface PathfindingGrid {
  isPassable(x: number, y: number): boolean
}

export class Pathfinding {
  private grid: PathfindingGrid

  constructor(grid: PathfindingGrid) {
    this.grid = grid
  }

  /**
   * Find path from start to goal using A* algorithm
   * @param startX - Starting X coordinate
   * @param startY - Starting Y coordinate  
   * @param goalX - Goal X coordinate
   * @param goalY - Goal Y coordinate
   * @returns Array of {x, y} coordinates representing the path, or empty array if no path found
   */
  public findPath(startX: number, startY: number, goalX: number, goalY: number): Array<{x: number, y: number}> {
    // Early exit if goal is not passable
    if (!this.grid.isPassable(goalX, goalY)) {
      console.log(`🚫 Goal position (${goalX}, ${goalY}) is not passable`)
      return []
    }

    // Early exit if start equals goal
    if (startX === goalX && startY === goalY) {
      return [{x: startX, y: startY}]
    }

    const openSet: PathNode[] = []
    const closedSet: Set<string> = new Set()

    // Create start node
    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, goalX, goalY),
      f: 0,
      parent: null
    }
    startNode.f = startNode.g + startNode.h
    openSet.push(startNode)

    while (openSet.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i
        }
      }

      const current = openSet.splice(currentIndex, 1)[0]
      const currentKey = `${current.x},${current.y}`
      closedSet.add(currentKey)

      // Goal reached
      if (current.x === goalX && current.y === goalY) {
        return this.reconstructPath(current)
      }

      // Check neighbors (8-directional movement including diagonals)
      const neighbors = [
        // Cardinal directions
        {x: current.x + 1, y: current.y, cost: 1},     // Right
        {x: current.x - 1, y: current.y, cost: 1},     // Left
        {x: current.x, y: current.y + 1, cost: 1},     // Down
        {x: current.x, y: current.y - 1, cost: 1},     // Up
        // Diagonal directions (slightly higher cost)
        {x: current.x + 1, y: current.y + 1, cost: 1.4}, // Down-Right
        {x: current.x + 1, y: current.y - 1, cost: 1.4}, // Up-Right
        {x: current.x - 1, y: current.y + 1, cost: 1.4}, // Down-Left
        {x: current.x - 1, y: current.y - 1, cost: 1.4}  // Up-Left
      ]

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`

        // Skip if already evaluated or not passable
        if (closedSet.has(neighborKey) || !this.grid.isPassable(neighbor.x, neighbor.y)) {
          continue
        }

        // For diagonal moves, check that we don't cut through corners
        if (neighbor.cost > 1) {
          const dx = neighbor.x - current.x
          const dy = neighbor.y - current.y
          // Check the two adjacent cardinal directions
          if (!this.grid.isPassable(current.x + dx, current.y) || 
              !this.grid.isPassable(current.x, current.y + dy)) {
            continue // Skip diagonal if it would cut through a corner
          }
        }

        const tentativeG = current.g + neighbor.cost

        // Check if this neighbor is already in open set
        let existingNeighbor = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)

        if (!existingNeighbor) {
          // Add new neighbor to open set
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.heuristic(neighbor.x, neighbor.y, goalX, goalY),
            f: 0,
            parent: current
          }
          newNode.f = newNode.g + newNode.h
          openSet.push(newNode)
        } else if (tentativeG < existingNeighbor.g) {
          // Update existing neighbor with better path
          existingNeighbor.g = tentativeG
          existingNeighbor.f = existingNeighbor.g + existingNeighbor.h
          existingNeighbor.parent = current
        }
      }
    }

    console.log(`🚫 No path found from (${startX}, ${startY}) to (${goalX}, ${goalY})`)
    return [] // No path found
  }

  /**
   * Manhattan distance heuristic for grid-based pathfinding
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2)
  }

  /**
   * Reconstruct path by following parent pointers
   */
  private reconstructPath(goalNode: PathNode): Array<{x: number, y: number}> {
    const path: Array<{x: number, y: number}> = []
    let current: PathNode | null = goalNode

    while (current !== null) {
      path.unshift({x: current.x, y: current.y})
      current = current.parent
    }

    // Smooth the path to reduce unnecessary waypoints
    const smoothedPath = this.smoothPath(path)
    console.log(`✅ Path found with ${path.length} steps, smoothed to ${smoothedPath.length}:`, 
      smoothedPath.map(p => `(${p.x},${p.y})`).join(' -> '))
    return smoothedPath
  }

  /**
   * Smooth the path by removing unnecessary waypoints using line-of-sight checks
   */
  private smoothPath(path: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
    if (path.length <= 2) return path

    const smoothed: Array<{x: number, y: number}> = [path[0]]
    let current = 0

    while (current < path.length - 1) {
      let furthest = current + 1

      // Find the furthest point we can reach in a straight line
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          furthest = i
        } else {
          break
        }
      }

      smoothed.push(path[furthest])
      current = furthest
    }

    return smoothed
  }

  /**
   * Check if there's a clear line of sight between two points using Bresenham's line algorithm
   */
  private hasLineOfSight(start: {x: number, y: number}, end: {x: number, y: number}): boolean {
    const dx = Math.abs(end.x - start.x)
    const dy = Math.abs(end.y - start.y)
    const sx = start.x < end.x ? 1 : -1
    const sy = start.y < end.y ? 1 : -1
    let err = dx - dy

    let x = start.x
    let y = start.y

    while (true) {
      // Check if current position is passable (skip start and end points)
      if ((x !== start.x || y !== start.y) && (x !== end.x || y !== end.y)) {
        if (!this.grid.isPassable(x, y)) {
          return false
        }
      }

      if (x === end.x && y === end.y) break

      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }

    return true
  }
}