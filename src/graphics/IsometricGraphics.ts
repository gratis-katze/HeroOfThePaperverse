import Phaser from 'phaser'

export class IsometricGraphics {
  static createHeroGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Hero - Golden cube with crown-like top
    graphics.fillStyle(0xf1c40f)
    graphics.beginPath()
    graphics.moveTo(16, 6)
    graphics.lineTo(30, 14)
    graphics.lineTo(16, 22)
    graphics.lineTo(2, 14)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face
    graphics.fillStyle(0xd4ac0d)
    graphics.beginPath()
    graphics.moveTo(2, 14)
    graphics.lineTo(16, 22)
    graphics.lineTo(16, 38)
    graphics.lineTo(2, 30)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face
    graphics.fillStyle(0xb7950b)
    graphics.beginPath()
    graphics.moveTo(16, 22)
    graphics.lineTo(30, 14)
    graphics.lineTo(30, 30)
    graphics.lineTo(16, 38)
    graphics.closePath()
    graphics.fillPath()
    
    // Crown decoration on top
    graphics.fillStyle(0xffd700)
    graphics.fillRect(12, 4, 8, 4)
    graphics.fillRect(14, 2, 4, 2)
    
    // Outline
    graphics.lineStyle(2, 0x9a7d0a)
    graphics.strokeRect(2, 14, 28, 24)
    graphics.strokePath()
    
    graphics.generateTexture(name, 32, 42)
    graphics.destroy()
  }

  static createWarriorGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Warrior - Red cube with sword marking
    graphics.fillStyle(0xe74c3c)
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(28, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(4, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face
    graphics.fillStyle(0xc0392b)
    graphics.beginPath()
    graphics.moveTo(4, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(16, 36)
    graphics.lineTo(4, 28)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face
    graphics.fillStyle(0xa93226)
    graphics.beginPath()
    graphics.moveTo(16, 24)
    graphics.lineTo(28, 16)
    graphics.lineTo(28, 28)
    graphics.lineTo(16, 36)
    graphics.closePath()
    graphics.fillPath()
    
    // Sword mark on top
    graphics.lineStyle(2, 0x922b21)
    graphics.strokeRect(15, 12, 2, 8)
    graphics.fillRect(14, 10, 4, 2)
    
    graphics.generateTexture(name, 32, 40)
    graphics.destroy()
  }

  static createArcherGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Archer - Green cube with bow marking
    graphics.fillStyle(0x27ae60)
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(28, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(4, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face
    graphics.fillStyle(0x229954)
    graphics.beginPath()
    graphics.moveTo(4, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(16, 36)
    graphics.lineTo(4, 28)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face
    graphics.fillStyle(0x1e8449)
    graphics.beginPath()
    graphics.moveTo(16, 24)
    graphics.lineTo(28, 16)
    graphics.lineTo(28, 28)
    graphics.lineTo(16, 36)
    graphics.closePath()
    graphics.fillPath()
    
    // Bow mark on top
    graphics.lineStyle(2, 0x186a3b)
    graphics.beginPath()
    graphics.moveTo(12, 14)
    graphics.lineTo(14, 12)
    graphics.lineTo(16, 10)
    graphics.lineTo(18, 12)
    graphics.lineTo(20, 14)
    graphics.strokePath()
    graphics.strokeRect(15, 14, 2, 4)
    
    graphics.generateTexture(name, 32, 40)
    graphics.destroy()
  }

  static createWaterBlockGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Water - Blue translucent cube with wave effect
    graphics.fillStyle(0x3498db)
    graphics.setAlpha(0.8)
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(28, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(4, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face - darker blue
    graphics.fillStyle(0x2980b9)
    graphics.beginPath()
    graphics.moveTo(4, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(16, 36)
    graphics.lineTo(4, 28)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face - darkest blue
    graphics.fillStyle(0x21618c)
    graphics.beginPath()
    graphics.moveTo(16, 24)
    graphics.lineTo(28, 16)
    graphics.lineTo(28, 28)
    graphics.lineTo(16, 36)
    graphics.closePath()
    graphics.fillPath()
    
    // Wave pattern on top
    graphics.lineStyle(2, 0x85c1e9)
    graphics.setAlpha(1)
    graphics.beginPath()
    graphics.moveTo(8, 14)
    graphics.lineTo(12, 12)
    graphics.lineTo(16, 14)
    graphics.lineTo(20, 12)
    graphics.lineTo(24, 14)
    graphics.strokePath()
    
    graphics.beginPath()
    graphics.moveTo(6, 18)
    graphics.lineTo(10, 16)
    graphics.lineTo(14, 18)
    graphics.lineTo(18, 16)
    graphics.lineTo(22, 18)
    graphics.lineTo(26, 16)
    graphics.strokePath()
    
    graphics.generateTexture(name, 32, 40)
    graphics.destroy()
  }

  static createWallBlockGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Wall - Gray stone cube with brick pattern
    graphics.fillStyle(0x7f8c8d)
    graphics.beginPath()
    graphics.moveTo(16, 6)
    graphics.lineTo(30, 14)
    graphics.lineTo(16, 22)
    graphics.lineTo(2, 14)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face
    graphics.fillStyle(0x566465)
    graphics.beginPath()
    graphics.moveTo(2, 14)
    graphics.lineTo(16, 22)
    graphics.lineTo(16, 38)
    graphics.lineTo(2, 30)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face
    graphics.fillStyle(0x34495e)
    graphics.beginPath()
    graphics.moveTo(16, 22)
    graphics.lineTo(30, 14)
    graphics.lineTo(30, 30)
    graphics.lineTo(16, 38)
    graphics.closePath()
    graphics.fillPath()
    
    // Brick pattern
    graphics.lineStyle(1, 0x2c3e50)
    graphics.strokeRect(6, 16, 8, 4)
    graphics.strokeRect(18, 16, 8, 4)
    graphics.strokeRect(2, 20, 8, 4)
    graphics.strokeRect(14, 20, 8, 4)
    graphics.strokeRect(26, 20, 4, 4)
    graphics.strokeRect(6, 24, 8, 4)
    graphics.strokeRect(18, 24, 8, 4)
    graphics.strokeRect(2, 28, 8, 4)
    graphics.strokeRect(14, 28, 8, 4)
    graphics.strokeRect(26, 28, 4, 4)
    
    graphics.generateTexture(name, 32, 42)
    graphics.destroy()
  }

  static createRockBlockGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Rock - Dark gray stone cube with rough texture
    graphics.fillStyle(0x5d6d7e)
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(28, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(4, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face - darker
    graphics.fillStyle(0x4a5568)
    graphics.beginPath()
    graphics.moveTo(4, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(16, 36)
    graphics.lineTo(4, 28)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face - darkest
    graphics.fillStyle(0x2d3748)
    graphics.beginPath()
    graphics.moveTo(16, 24)
    graphics.lineTo(28, 16)
    graphics.lineTo(28, 28)
    graphics.lineTo(16, 36)
    graphics.closePath()
    graphics.fillPath()
    
    // Rock texture - rough lines and cracks
    graphics.lineStyle(1, 0x1a202c)
    graphics.beginPath()
    graphics.moveTo(8, 12)
    graphics.lineTo(12, 14)
    graphics.lineTo(16, 11)
    graphics.lineTo(20, 13)
    graphics.lineTo(24, 12)
    graphics.strokePath()
    
    graphics.beginPath()
    graphics.moveTo(6, 20)
    graphics.lineTo(10, 18)
    graphics.lineTo(14, 20)
    graphics.lineTo(18, 19)
    graphics.lineTo(22, 21)
    graphics.lineTo(26, 19)
    graphics.strokePath()
    
    // Crack lines
    graphics.lineStyle(1.5, 0x1a202c)
    graphics.beginPath()
    graphics.moveTo(12, 10)
    graphics.lineTo(14, 16)
    graphics.lineTo(18, 20)
    graphics.strokePath()
    
    graphics.beginPath()
    graphics.moveTo(20, 11)
    graphics.lineTo(22, 15)
    graphics.lineTo(24, 19)
    graphics.strokePath()
    
    graphics.generateTexture(name, 32, 40)
    graphics.destroy()
  }

  static createTreeGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Tree trunk - brown cube
    graphics.fillStyle(0x8b4513)
    graphics.beginPath()
    graphics.moveTo(16, 20)
    graphics.lineTo(24, 26)
    graphics.lineTo(16, 32)
    graphics.lineTo(8, 26)
    graphics.closePath()
    graphics.fillPath()
    
    // Left trunk face
    graphics.fillStyle(0x654321)
    graphics.beginPath()
    graphics.moveTo(8, 26)
    graphics.lineTo(16, 32)
    graphics.lineTo(16, 40)
    graphics.lineTo(8, 34)
    graphics.closePath()
    graphics.fillPath()
    
    // Right trunk face
    graphics.fillStyle(0x5d4037)
    graphics.beginPath()
    graphics.moveTo(16, 32)
    graphics.lineTo(24, 26)
    graphics.lineTo(24, 34)
    graphics.lineTo(16, 40)
    graphics.closePath()
    graphics.fillPath()
    
    // Tree crown - green diamond
    graphics.fillStyle(0x2e7d32)
    graphics.beginPath()
    graphics.moveTo(16, 4)
    graphics.lineTo(30, 12)
    graphics.lineTo(16, 20)
    graphics.lineTo(2, 12)
    graphics.closePath()
    graphics.fillPath()
    
    // Crown left face
    graphics.fillStyle(0x1b5e20)
    graphics.beginPath()
    graphics.moveTo(2, 12)
    graphics.lineTo(16, 20)
    graphics.lineTo(12, 24)
    graphics.lineTo(2, 18)
    graphics.closePath()
    graphics.fillPath()
    
    // Crown right face
    graphics.fillStyle(0x388e3c)
    graphics.beginPath()
    graphics.moveTo(16, 20)
    graphics.lineTo(30, 12)
    graphics.lineTo(30, 18)
    graphics.lineTo(20, 24)
    graphics.closePath()
    graphics.fillPath()
    
    graphics.generateTexture(name, 32, 44)
    graphics.destroy()
  }

  static createRockGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Rock - irregular gray shape
    graphics.fillStyle(0x95a5a6)
    graphics.beginPath()
    graphics.moveTo(14, 10)
    graphics.lineTo(26, 16)
    graphics.lineTo(18, 24)
    graphics.lineTo(6, 18)
    graphics.closePath()
    graphics.fillPath()
    
    // Left face
    graphics.fillStyle(0x7f8c8d)
    graphics.beginPath()
    graphics.moveTo(6, 18)
    graphics.lineTo(18, 24)
    graphics.lineTo(16, 34)
    graphics.lineTo(4, 28)
    graphics.closePath()
    graphics.fillPath()
    
    // Right face
    graphics.fillStyle(0x566465)
    graphics.beginPath()
    graphics.moveTo(18, 24)
    graphics.lineTo(26, 16)
    graphics.lineTo(26, 26)
    graphics.lineTo(16, 34)
    graphics.closePath()
    graphics.fillPath()
    
    // Rock texture lines
    graphics.lineStyle(1, 0x34495e)
    for (let i = 0; i < 3; i++) {
      const y = 12 + i * 4
      graphics.moveTo(8 + i * 2, y)
      graphics.lineTo(22 - i, y + 2)
      graphics.strokePath()
    }
    
    graphics.generateTexture(name, 32, 38)
    graphics.destroy()
  }

  static createProjectileGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Projectile - Bright yellow/orange orb, larger and more visible
    graphics.fillStyle(0xff6b35)
    graphics.fillCircle(10, 10, 6)
    
    // Middle ring
    graphics.fillStyle(0xff8f00)
    graphics.fillCircle(10, 10, 4)
    
    // Bright center
    graphics.fillStyle(0xffd700)
    graphics.fillCircle(10, 10, 2)
    
    // Small highlight
    graphics.fillStyle(0xffffff, 0.8)
    graphics.fillCircle(8, 8, 1)
    
    graphics.generateTexture(name, 20, 20)
    graphics.destroy()
  }

  static createGrassTerrainGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Grass terrain - flat isometric tile with grass texture
    graphics.fillStyle(0x27ae60)  // Green base
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(30, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(2, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Grass texture with small variations
    graphics.fillStyle(0x2ecc71)  // Lighter green spots
    for (let i = 0; i < 8; i++) {
      const x = 6 + (i % 4) * 6 + Math.random() * 2
      const y = 12 + Math.floor(i / 4) * 6 + Math.random() * 2
      graphics.fillCircle(x, y, 1)
    }
    
    // Small grass blades
    graphics.lineStyle(1, 0x1e8449)
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 3 + Math.random() * 2
      const y = 14 + Math.random() * 6
      graphics.strokeRect(x, y, 1, 2)
    }
    
    graphics.generateTexture(name, 32, 32)
    graphics.destroy()
  }

  static createSnowTerrainGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Snow terrain - white/light blue flat tile
    graphics.fillStyle(0xecf0f1)  // Light gray-white
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(30, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(2, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Snow texture with sparkles
    graphics.fillStyle(0xffffff)  // Pure white spots
    for (let i = 0; i < 12; i++) {
      const x = 4 + Math.random() * 24
      const y = 10 + Math.random() * 12
      graphics.fillCircle(x, y, Math.random() * 1.5)
    }
    
    // Light blue shadows for depth
    graphics.fillStyle(0xd5dbdb, 0.7)
    graphics.beginPath()
    graphics.moveTo(16, 20)
    graphics.lineTo(26, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(6, 20)
    graphics.closePath()
    graphics.fillPath()
    
    graphics.generateTexture(name, 32, 32)
    graphics.destroy()
  }

  static createRockTerrainGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Rock terrain - gray rough surface
    graphics.fillStyle(0x7f8c8d)  // Gray base
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(30, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(2, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Rocky texture with darker spots
    graphics.fillStyle(0x566465)  // Darker gray
    for (let i = 0; i < 15; i++) {
      const x = 4 + Math.random() * 24
      const y = 10 + Math.random() * 12
      const size = 1 + Math.random() * 2
      graphics.fillEllipse(x, y, size, size * 0.7)
    }
    
    // Crack lines for detail
    graphics.lineStyle(1, 0x34495e)
    graphics.beginPath()
    graphics.moveTo(8, 14)
    graphics.lineTo(14, 18)
    graphics.moveTo(20, 12)
    graphics.lineTo(26, 20)
    graphics.moveTo(12, 10)
    graphics.lineTo(18, 22)
    graphics.strokePath()
    
    graphics.generateTexture(name, 32, 32)
    graphics.destroy()
  }

  static createMudTerrainGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Mud terrain - brown wet surface
    graphics.fillStyle(0x8b4513)  // Brown base
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(30, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(2, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Muddy texture with wet spots
    graphics.fillStyle(0xa0522d, 0.8)  // Lighter brown
    for (let i = 0; i < 10; i++) {
      const x = 4 + Math.random() * 24
      const y = 10 + Math.random() * 12
      graphics.fillEllipse(x, y, 2 + Math.random() * 2, 1 + Math.random())
    }
    
    // Dark wet spots
    graphics.fillStyle(0x654321, 0.9)
    for (let i = 0; i < 6; i++) {
      const x = 6 + Math.random() * 20
      const y = 12 + Math.random() * 8
      graphics.fillEllipse(x, y, 3, 1.5)
    }
    
    // Ripple effects for wetness
    graphics.lineStyle(1, 0x5d4037, 0.6)
    graphics.strokeEllipse(12, 14, 4, 2)
    graphics.strokeEllipse(20, 18, 3, 1.5)
    
    graphics.generateTexture(name, 32, 32)
    graphics.destroy()
  }

  static createSandTerrainGraphic(scene: Phaser.Scene, name: string): void {
    const graphics = scene.add.graphics()
    
    // Sand terrain - yellow/beige surface
    graphics.fillStyle(0xf39c12)  // Sandy yellow
    graphics.beginPath()
    graphics.moveTo(16, 8)
    graphics.lineTo(30, 16)
    graphics.lineTo(16, 24)
    graphics.lineTo(2, 16)
    graphics.closePath()
    graphics.fillPath()
    
    // Sand grain texture
    graphics.fillStyle(0xe67e22)  // Darker sand
    for (let i = 0; i < 20; i++) {
      const x = 4 + Math.random() * 24
      const y = 10 + Math.random() * 12
      graphics.fillCircle(x, y, 0.5 + Math.random() * 0.5)
    }
    
    // Lighter sand spots
    graphics.fillStyle(0xf4d03f, 0.8)
    for (let i = 0; i < 8; i++) {
      const x = 6 + Math.random() * 20
      const y = 12 + Math.random() * 8
      graphics.fillEllipse(x, y, 2, 1)
    }
    
    graphics.generateTexture(name, 32, 32)
    graphics.destroy()
  }
}