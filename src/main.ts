import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { MapEditorScene } from './scenes/MapEditorScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#34495e',
  physics: {
    default: 'arcade',
    arcade: {
      debug: true
    }
  },
  scene: [MapEditorScene, GameScene]
}

new Phaser.Game(config)