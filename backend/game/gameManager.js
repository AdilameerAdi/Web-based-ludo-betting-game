/**
 * Game Manager
 * Central orchestrator for all game logic
 * Maintains active games and processes all game actions
 */

import {
  GAME_STATUS,
  TIMING,
  ERROR_CODES,
  PLAYER_CONFIG
} from './utils/constants.js';
import {
  createGameState,
  cloneState,
  getPlayerBySocketId,
  getPlayerByOdId,
  getCurrentPlayer,
  serializeForClient,
  updatePlayerConnection,
  setWinner
} from './engine/gameState.js';
// Database persistence (uncomment when tables are created)
// import {
//   saveGameState,
//   loadGameState,
//   logGameAction,
//   processWinnerPayout,
//   getActiveGameForUser
// } from './services/gameService.js';
import { processDiceRoll, toFrontendDiceValue } from './engine/diceLogic.js';
import { validateMove, computeValidMoves } from './engine/moveValidator.js';
import {
  processAfterRoll,
  executeMove,
  handleTurnTimeout,
  handleForfeit,
  handleDisconnectTimeout,
  isTurnTimedOut
} from './engine/turnManager.js';
import { toFrontendPositionId } from './utils/positionCalc.js';

// Store active games in memory
// In production, this should be Redis or similar
const activeGames = new Map();

// Store socket to game mapping
const socketToGame = new Map();

// Store turn timers
const turnTimers = new Map();

// Store disconnect timers
const disconnectTimers = new Map();

/**
 * Create a new game
 * @param {string} tableId - Table ID
 * @param {Array} players - Array of {userId, socketId, userName}
 * @param {number} betAmount - Bet amount
 * @returns {Object} - Created game state
 */
export function createGame(tableId, players, betAmount) {
  const state = createGameState(tableId, players, betAmount);

  // Store game
  activeGames.set(state.gameId, state);

  // Map sockets to game
  players.forEach(player => {
    socketToGame.set(player.socketId, state.gameId);
  });

  console.log(`[GameManager] Game created: ${state.gameId} for table ${tableId}`);

  return state;
}

/**
 * Get game by ID
 * @param {string} gameId - Game ID
 * @returns {Object|null} - Game state or null
 */
export function getGame(gameId) {
  return activeGames.get(gameId) || null;
}

/**
 * Get game by table ID
 * @param {string} tableId - Table ID
 * @returns {Object|null} - Game state or null
 */
export function getGameByTableId(tableId) {
  for (const [gameId, state] of activeGames.entries()) {
    if (state.tableId === tableId) {
      return state;
    }
  }
  return null;
}

/**
 * Get game by socket ID
 * @param {string} socketId - Socket ID
 * @returns {Object|null} - Game state or null
 */
export function getGameBySocketId(socketId) {
  const gameId = socketToGame.get(socketId);
  if (gameId) {
    return activeGames.get(gameId) || null;
  }
  return null;
}

/**
 * Process dice roll action
 * @param {string} gameId - Game ID
 * @param {string} socketId - Socket ID of requesting player
 * @returns {Object} - Result of dice roll
 */
export function rollDice(gameId, socketId) {
  const state = activeGames.get(gameId);
  if (!state) {
    return { success: false, error: ERROR_CODES.INVALID_GAME };
  }

  // IMPORTANT: Capture the rolling player index BEFORE any processing
  // This is the player who clicked the dice, regardless of turn changes
  const rollingPlayerIndex = state.turn.currentPlayerIndex;

  // Clear turn timer while processing
  clearTurnTimer(gameId);

  // Process the roll
  const result = processDiceRoll(state, socketId);

  if (!result.success) {
    // Restart turn timer on failure
    startTurnTimer(gameId);
    return result;
  }

  // Handle three sixes (turn already switched in processDiceRoll)
  if (result.isThreeSixes) {
    startTurnTimer(gameId);
    return {
      success: true,
      rollingPlayerIndex, // The player who rolled (before turn change)
      diceValue: result.diceValue,
      frontendDiceValue: toFrontendDiceValue(result.diceValue),
      isThreeSixes: true,
      consecutiveSixes: result.consecutiveSixes,
      validMoves: [],
      nextPlayerIndex: state.turn.currentPlayerIndex,
      gameState: serializeForClient(state)
    };
  }

  // Compute valid moves
  const afterRoll = processAfterRoll(state);

  // Start turn timer for move phase
  startTurnTimer(gameId);

  return {
    success: true,
    rollingPlayerIndex, // The player who rolled (before any turn change)
    diceValue: result.diceValue,
    frontendDiceValue: toFrontendDiceValue(result.diceValue),
    isThreeSixes: false,
    consecutiveSixes: result.consecutiveSixes,
    hasValidMoves: afterRoll.hasValidMoves,
    validMoves: afterRoll.validMoves || [],
    autoMove: afterRoll.autoMove,
    gameState: serializeForClient(state)
  };
}

/**
 * Process move action
 * @param {string} gameId - Game ID
 * @param {string} socketId - Socket ID of requesting player
 * @param {string} tokenId - Token to move
 * @returns {Object} - Result of move
 */
export function moveToken(gameId, socketId, tokenId) {
  const state = activeGames.get(gameId);
  if (!state) {
    return { success: false, error: ERROR_CODES.INVALID_GAME };
  }

  // Clear turn timer while processing
  clearTurnTimer(gameId);

  // Validate the move
  const validation = validateMove(state, socketId, tokenId);
  if (!validation.valid) {
    startTurnTimer(gameId);
    return { success: false, error: validation.error };
  }

  const move = validation.move;

  // Execute the move
  const result = executeMove(state, move);

  // Check for game over
  if (result.winner) {
    clearTurnTimer(gameId);
    return {
      success: true,
      move: formatMoveForClient(move, state),
      captured: result.captured,
      finished: result.finished,
      extraTurn: false,
      gameOver: true,
      winner: result.winner,
      gameState: serializeForClient(state)
    };
  }

  // Start turn timer for next action
  startTurnTimer(gameId);

  return {
    success: true,
    move: formatMoveForClient(move, state),
    captured: result.captured,
    capturedInfo: result.captured ? formatCaptureForClient(result.captured, state) : null,
    finished: result.finished,
    extraTurn: result.extraTurn,
    extraTurnReason: result.extraTurnReason,
    nextPlayerIndex: state.turn.currentPlayerIndex,
    nextPhase: state.turn.phase,
    gameState: serializeForClient(state)
  };
}

/**
 * Handle player forfeit
 * @param {string} gameId - Game ID
 * @param {string} socketId - Socket ID of forfeiting player
 * @returns {Object} - Result
 */
export function forfeit(gameId, socketId) {
  const state = activeGames.get(gameId);
  if (!state) {
    return { success: false, error: ERROR_CODES.INVALID_GAME };
  }

  const player = getPlayerBySocketId(state, socketId);
  if (!player) {
    return { success: false, error: ERROR_CODES.NOT_IN_GAME };
  }

  clearTurnTimer(gameId);
  handleForfeit(state, player.index);

  return {
    success: true,
    winner: state.winner,
    gameState: serializeForClient(state)
  };
}

/**
 * Handle player disconnect
 * @param {string} socketId - Disconnected socket ID
 * @returns {Object|null} - Game info if player was in a game
 */
export function handleDisconnect(socketId) {
  const gameId = socketToGame.get(socketId);
  if (!gameId) {
    return null;
  }

  const state = activeGames.get(gameId);
  if (!state || state.status !== GAME_STATUS.ACTIVE) {
    socketToGame.delete(socketId);
    return null;
  }

  const player = getPlayerBySocketId(state, socketId);
  if (!player) {
    return null;
  }

  // Mark player as disconnected
  updatePlayerConnection(state, player.index, false);

  // Pause game
  state.status = GAME_STATUS.PAUSED;

  // Clear turn timer
  clearTurnTimer(gameId);

  // Start disconnect timer
  startDisconnectTimer(gameId, player.index);

  console.log(`[GameManager] Player ${player.index} disconnected from game ${gameId}`);

  return {
    gameId,
    tableId: state.tableId,
    disconnectedPlayerIndex: player.index,
    opponentIndex: player.index === 0 ? 1 : 0,
    timeout: TIMING.RECONNECT_TIMEOUT
  };
}

/**
 * Handle player reconnect
 * @param {string} gameId - Game ID
 * @param {string} odId - User ID
 * @param {string} newSocketId - New socket ID
 * @returns {Object} - Reconnection result
 */
export function handleReconnect(gameId, odId, newSocketId) {
  console.log(`[GameManager] handleReconnect called: gameId=${gameId}, odId=${odId}, newSocketId=${newSocketId}`);

  const state = activeGames.get(gameId);
  if (!state) {
    console.log(`[GameManager] No game found with ID ${gameId}`);
    return { success: false, error: ERROR_CODES.INVALID_GAME };
  }

  console.log(`[GameManager] Game found. Players:`, state.players.map(p => ({ index: p.index, odId: p.odId, name: p.name })));

  const player = getPlayerByOdId(state, odId);
  if (!player) {
    console.log(`[GameManager] Player with odId ${odId} not found in game`);
    return { success: false, error: ERROR_CODES.NOT_IN_GAME };
  }

  console.log(`[GameManager] Player found: index=${player.index}, name=${player.name}`);

  // Clear disconnect timer
  clearDisconnectTimer(gameId, player.index);

  // Remove old socket mapping
  socketToGame.delete(player.socketId);

  // Update player connection
  updatePlayerConnection(state, player.index, true, newSocketId);

  // Map new socket
  socketToGame.set(newSocketId, gameId);

  // Resume game if was paused
  if (state.status === GAME_STATUS.PAUSED) {
    state.status = GAME_STATUS.ACTIVE;
    // Restart turn timer
    startTurnTimer(gameId);
  }

  console.log(`[GameManager] Player ${player.index} reconnected to game ${gameId}`);

  return {
    success: true,
    playerIndex: player.index,
    gameState: serializeForClient(state, player.index)
  };
}

/**
 * Get game state for a player
 * @param {string} gameId - Game ID
 * @param {string} socketId - Socket ID
 * @returns {Object|null} - Client-safe game state
 */
export function getGameState(gameId, socketId) {
  const state = activeGames.get(gameId);
  if (!state) {
    return null;
  }

  const player = getPlayerBySocketId(state, socketId);
  const playerIndex = player ? player.index : null;

  return serializeForClient(state, playerIndex);
}

/**
 * Clean up finished game
 * @param {string} gameId - Game ID
 */
export function cleanupGame(gameId) {
  const state = activeGames.get(gameId);
  if (!state) return;

  // Clear all timers
  clearTurnTimer(gameId);
  clearDisconnectTimer(gameId, 0);
  clearDisconnectTimer(gameId, 1);

  // Remove socket mappings
  state.players.forEach(player => {
    socketToGame.delete(player.socketId);
  });

  // Remove game (in production, archive to database first)
  activeGames.delete(gameId);

  console.log(`[GameManager] Game ${gameId} cleaned up`);
}

// ============ Timer Management ============

/**
 * Start turn timer
 * @param {string} gameId - Game ID
 */
function startTurnTimer(gameId) {
  clearTurnTimer(gameId);

  const timer = setTimeout(() => {
    const state = activeGames.get(gameId);
    if (state && state.status === GAME_STATUS.ACTIVE) {
      console.log(`[GameManager] Turn timeout for game ${gameId}`);
      const action = handleTurnTimeout(state);
      // Emit timeout event (handled by socket layer)
      if (global.io) {
        global.io.to(`game_${gameId}`).emit('turn_timeout', {
          gameId,
          action,
          gameState: serializeForClient(state)
        });
      }
      // Restart timer for next turn
      startTurnTimer(gameId);
    }
  }, TIMING.TURN_TIMEOUT);

  turnTimers.set(gameId, timer);
}

/**
 * Clear turn timer
 * @param {string} gameId - Game ID
 */
function clearTurnTimer(gameId) {
  const timer = turnTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(gameId);
  }
}

/**
 * Start disconnect timer
 * @param {string} gameId - Game ID
 * @param {number} playerIndex - Disconnected player index
 */
function startDisconnectTimer(gameId, playerIndex) {
  const timerKey = `${gameId}_${playerIndex}`;
  clearDisconnectTimer(gameId, playerIndex);

  const timer = setTimeout(() => {
    const state = activeGames.get(gameId);
    if (state && state.status === GAME_STATUS.PAUSED) {
      console.log(`[GameManager] Disconnect timeout for player ${playerIndex} in game ${gameId}`);
      handleDisconnectTimeout(state, playerIndex);
      // Emit game over event
      if (global.io) {
        global.io.to(`game_${gameId}`).emit('game_over', {
          gameId,
          reason: 'opponent_disconnect',
          winner: state.winner,
          gameState: serializeForClient(state)
        });
      }
    }
  }, TIMING.RECONNECT_TIMEOUT);

  disconnectTimers.set(timerKey, timer);
}

/**
 * Clear disconnect timer
 * @param {string} gameId - Game ID
 * @param {number} playerIndex - Player index
 */
function clearDisconnectTimer(gameId, playerIndex) {
  const timerKey = `${gameId}_${playerIndex}`;
  const timer = disconnectTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(timerKey);
  }
}

// ============ Helper Functions ============

/**
 * Format move for client
 * @param {Object} move - Internal move object
 * @param {Object} state - Game state
 * @returns {Object} - Client-formatted move
 */
function formatMoveForClient(move, state) {
  const playerIndex = state.tokens[move.tokenId].playerIndex;
  const color = PLAYER_CONFIG[playerIndex].color;

  return {
    tokenId: move.tokenId,
    fromPosition: move.fromArea === 'home'
      ? `in-${color}-${move.fromPosition}`
      : toFrontendPositionId(move.fromArea, move.fromPosition, color),
    toPosition: toFrontendPositionId(move.toArea, move.toPosition, color),
    path: move.path.map(p => toFrontendPositionId(p.area, p.position, color)),
    isOpen: move.isOpen,
    isFinish: move.isFinish,
    isCapture: move.isCapture
  };
}

/**
 * Format capture info for client
 * @param {string} capturedTokenId - Captured token ID
 * @param {Object} state - Game state
 * @returns {Object} - Capture info
 */
function formatCaptureForClient(capturedTokenId, state) {
  const token = state.tokens[capturedTokenId];
  const color = PLAYER_CONFIG[token.playerIndex].color;

  return {
    tokenId: capturedTokenId,
    sentToHome: `in-${color}-${token.position}`
  };
}

// Export for external use
export default {
  createGame,
  getGame,
  getGameByTableId,
  getGameBySocketId,
  rollDice,
  moveToken,
  forfeit,
  handleDisconnect,
  handleReconnect,
  getGameState,
  cleanupGame
};
