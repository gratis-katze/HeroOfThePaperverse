export enum AnimationDirection {
  IDLE = 'idle',
  DOWN = 'down',
  UP = 'up',
  LEFT_DOWN = 'left_down',
  LEFT_UP = 'left_up',
  RIGHT_DOWN = 'right_down',
  RIGHT_UP = 'right_up'
}

export enum AnimationType {
  IDLE = 'idle',
  WALK = 'walk',
  ATTACK = 'attack',
  DEATH = 'death',
  TAKE_HIT = 'take_hit'
}

export interface AnimationState {
  type: AnimationType
  direction: AnimationDirection
}