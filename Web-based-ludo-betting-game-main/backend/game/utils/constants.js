/**
 * Ludo Game Constants
 * All game configuration and board layout definitions
 */

// Board configuration
export const BOARD_SIZE = 52; // Total positions on the main board
export const PRIVATE_AREA_SIZE = 6; // Positions in each player's private/home stretch (must land exactly on 6 to finish)
export const TOKENS_PER_PLAYER = 4;

// Safe zones - positions where tokens cannot be captured
export const SAFE_ZONES = [1, 9, 14, 22, 27, 35, 40, 48];

// Player configurations for 2-player game (Red vs Yellow)
export const PLAYER_CONFIG = {
  0: {
    color: 'r',
    name: 'Red',
    playerNo: 1,
    startPosition: 1,      // Where tokens enter the board
    privateEntryAfter: 51, // Enter private area after this position
    tokens: ['r-pawn1', 'r-pawn2', 'r-pawn3', 'r-pawn4']
  },
  1: {
    color: 'y',
    name: 'Yellow',
    playerNo: 3,
    startPosition: 27,     // Where tokens enter the board
    privateEntryAfter: 25, // Enter private area after this position
    tokens: ['y-pawn1', 'y-pawn2', 'y-pawn3', 'y-pawn4']
  }
};

// Game status values
export const GAME_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FINISHED: 'finished',
  ABANDONED: 'abandoned'
};

// Turn phases
export const TURN_PHASE = {
  ROLL: 'roll',
  MOVE: 'move',
  WAITING: 'waiting'
};

// Token areas
export const TOKEN_AREA = {
  HOME: 'home',
  BOARD: 'board',
  PRIVATE: 'private',
  FINISHED: 'finished'
};

// Timing configuration (in milliseconds)
export const TIMING = {
  TURN_TIMEOUT: 30000,           // 30 seconds per turn
  TURN_WARNING: 10000,           // Warning at 10 seconds remaining
  RECONNECT_TIMEOUT: 20000,      // 20 seconds to reconnect before forfeit
  ACTION_COOLDOWN: 500,          // Minimum time between actions
  ANIMATION_DELAY: 500,          // Delay for animations
  INITIALIZATION_GRACE_PERIOD: 10000  // 10 seconds grace period after game start before disconnect detection
};

// Dice configuration
export const DICE = {
  MIN: 1,
  MAX: 6,
  OPEN_VALUE: 6,                 // Value needed to open a token
  MAX_CONSECUTIVE_SIXES: 3       // Three sixes in a row = penalty
};

// Error codes
export const ERROR_CODES = {
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_PHASE: 'INVALID_PHASE',
  GAME_NOT_ACTIVE: 'GAME_NOT_ACTIVE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MOVE_NOT_VALID: 'MOVE_NOT_VALID',
  TOKEN_IN_HOME: 'TOKEN_IN_HOME',
  OVERSHOOT: 'OVERSHOOT',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_GAME: 'INVALID_GAME',
  NOT_IN_GAME: 'NOT_IN_GAME'
};

// Event types for history
export const EVENT_TYPES = {
  ROLL: 'roll',
  OPEN: 'open',
  MOVE: 'move',
  CAPTURE: 'capture',
  FINISH: 'finish',
  TURN_CHANGE: 'turn_change',
  THREE_SIXES: 'three_sixes',
  TIMEOUT: 'timeout',
  FORFEIT: 'forfeit',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect'
};

// Commission rate for betting
export const COMMISSION_RATE = 0.20; // 20% commission of table price (bet amount)
