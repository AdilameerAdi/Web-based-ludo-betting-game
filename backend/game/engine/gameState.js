/**
 * Game State Management
 * Creates and manages the authoritative game state
 */

import { v4 as uuidv4 } from 'uuid';
import {
  GAME_STATUS,
  TURN_PHASE,
  TOKEN_AREA,
  PLAYER_CONFIG,
  TOKENS_PER_PLAYER,
  COMMISSION_RATE
} from '../utils/constants.js';

/**
 * Create initial token state for a player
 * @param {number} playerIndex - Player index (0 or 1)
 * @returns {Object} - Token states keyed by token ID
 */
function createTokensForPlayer(playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];
  const tokens = {};

  config.tokens.forEach((tokenId, index) => {
    tokens[tokenId] = {
      area: TOKEN_AREA.HOME,
      position: index + 1, // Home position 1-4
      playerIndex: playerIndex
    };
  });

  return tokens;
}

/**
 * Create a new game state
 * @param {string} tableId - Table ID from database
 * @param {Array} players - Array of player objects [{odId, socketId}, ...]
 * @param {number} betAmount - Bet amount per player
 * @returns {Object} - Complete game state
 */
export function createGameState(tableId, players, betAmount) {
  const gameId = uuidv4();
  const now = Date.now();

  // Create player states
  const playerStates = players.map((player, index) => ({
    index,
    odId: player.userId,
    socketId: player.socketId,
    color: PLAYER_CONFIG[index].color,
    playerNo: PLAYER_CONFIG[index].playerNo,
    name: player.userName || `Player ${index + 1}`,
    isConnected: true,
    lastActiveAt: now,
    hasForfeited: false,
    finishedTokens: 0
  }));

  // Create tokens for both players
  const tokens = {
    ...createTokensForPlayer(0),
    ...createTokensForPlayer(1)
  };

  // Calculate prize pool
  const totalPool = betAmount * 2;
  // Commission is 20% of table price (bet amount), not total pool
  const commission = betAmount * COMMISSION_RATE;
  const prizePool = totalPool - commission;

  return {
    // Game identification
    gameId,
    tableId,
    status: GAME_STATUS.ACTIVE,
    createdAt: now,
    startedAt: now,
    endedAt: null,

    // Betting info
    betAmount,
    totalPool,
    commission,
    prizePool,

    // Players
    players: playerStates,

    // Token states
    tokens,

    // Turn state
    turn: {
      currentPlayerIndex: 0, // Red starts
      phase: TURN_PHASE.ROLL,
      diceValue: null,
      consecutiveSixes: 0,
      mustRollAgain: false,
      turnStartedAt: now,
      validMoves: [],
      lastActionAt: now
    },

    // Game history for audit
    history: [],

    // Winner info
    winner: null,

    // Reconnection tracking
    disconnectTimers: {}
  };
}

/**
 * Clone game state (for immutable updates)
 * @param {Object} state - Current game state
 * @returns {Object} - Deep cloned state
 */
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Get player by socket ID
 * @param {Object} state - Game state
 * @param {string} socketId - Socket ID
 * @returns {Object|null} - Player object or null
 */
export function getPlayerBySocketId(state, socketId) {
  return state.players.find(p => p.socketId === socketId) || null;
}

/**
 * Get player by user ID
 * @param {Object} state - Game state
 * @param {string} odId - User ID
 * @returns {Object|null} - Player object or null
 */
export function getPlayerByOdId(state, odId) {
  return state.players.find(p => p.odId === odId) || null;
}

/**
 * Get current player
 * @param {Object} state - Game state
 * @returns {Object} - Current player object
 */
export function getCurrentPlayer(state) {
  return state.players[state.turn.currentPlayerIndex];
}

/**
 * Get opponent player
 * @param {Object} state - Game state
 * @returns {Object} - Opponent player object
 */
export function getOpponentPlayer(state) {
  const opponentIndex = state.turn.currentPlayerIndex === 0 ? 1 : 0;
  return state.players[opponentIndex];
}

/**
 * Get tokens for a player
 * @param {Object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {Object} - Object with token states for this player
 */
export function getPlayerTokens(state, playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];
  const tokens = {};

  config.tokens.forEach(tokenId => {
    tokens[tokenId] = state.tokens[tokenId];
  });

  return tokens;
}

/**
 * Get tokens at a specific board position
 * @param {Object} state - Game state
 * @param {string} area - Token area
 * @param {number} position - Position number
 * @returns {Array} - Array of token IDs at this position
 */
export function getTokensAtPosition(state, area, position) {
  const tokensAtPos = [];

  Object.entries(state.tokens).forEach(([tokenId, token]) => {
    if (token.area === area && token.position === position) {
      tokensAtPos.push(tokenId);
    }
  });

  return tokensAtPos;
}

/**
 * Check if a player has won
 * @param {Object} state - Game state
 * @param {number} playerIndex - Player index to check
 * @returns {boolean}
 */
export function hasPlayerWon(state, playerIndex) {
  const tokens = getPlayerTokens(state, playerIndex);
  const finishedCount = Object.values(tokens).filter(
    t => t.area === TOKEN_AREA.FINISHED
  ).length;

  return finishedCount === TOKENS_PER_PLAYER;
}

/**
 * Update token position
 * @param {Object} state - Game state (will be mutated)
 * @param {string} tokenId - Token ID
 * @param {string} newArea - New area
 * @param {number|null} newPosition - New position
 */
export function updateTokenPosition(state, tokenId, newArea, newPosition) {
  if (state.tokens[tokenId]) {
    state.tokens[tokenId].area = newArea;
    state.tokens[tokenId].position = newPosition;
  }
}

/**
 * Add event to history
 * @param {Object} state - Game state (will be mutated)
 * @param {string} type - Event type
 * @param {Object} data - Event data
 */
export function addHistoryEvent(state, type, data) {
  state.history.push({
    type,
    timestamp: Date.now(),
    playerIndex: state.turn.currentPlayerIndex,
    ...data
  });
}

/**
 * Set game winner
 * @param {Object} state - Game state (will be mutated)
 * @param {number} playerIndex - Winning player index
 * @param {string} reason - Win reason
 */
export function setWinner(state, playerIndex, reason) {
  const winner = state.players[playerIndex];

  state.status = GAME_STATUS.FINISHED;
  state.endedAt = Date.now();
  state.winner = {
    playerIndex,
    odId: winner.odId,
    name: winner.name,
    color: winner.color,
    prize: state.prizePool,
    reason
  };

  addHistoryEvent(state, 'game_over', {
    winner: state.winner,
    reason
  });
}

/**
 * Switch to next player's turn
 * @param {Object} state - Game state (will be mutated)
 */
export function switchTurn(state) {
  const now = Date.now();
  state.turn.currentPlayerIndex = state.turn.currentPlayerIndex === 0 ? 1 : 0;
  state.turn.phase = TURN_PHASE.ROLL;
  state.turn.diceValue = null;
  state.turn.consecutiveSixes = 0;
  state.turn.validMoves = [];
  state.turn.turnStartedAt = now;
  state.turn.lastActionAt = now;

  addHistoryEvent(state, 'turn_change', {
    newPlayerIndex: state.turn.currentPlayerIndex
  });
}

/**
 * Grant extra turn to current player
 * @param {Object} state - Game state (will be mutated)
 * @param {string} reason - Reason for extra turn
 */
export function grantExtraTurn(state, reason) {
  const now = Date.now();
  state.turn.phase = TURN_PHASE.ROLL;
  state.turn.diceValue = null;
  state.turn.validMoves = [];
  state.turn.turnStartedAt = now;
  state.turn.lastActionAt = now;
  // Note: consecutiveSixes is preserved if reason is 'six'

  if (reason !== 'six') {
    state.turn.consecutiveSixes = 0;
  }

  addHistoryEvent(state, 'extra_turn', { reason });
}

/**
 * Update player connection status
 * @param {Object} state - Game state (will be mutated)
 * @param {number} playerIndex - Player index
 * @param {boolean} isConnected - Connection status
 * @param {string} newSocketId - New socket ID (for reconnection)
 */
export function updatePlayerConnection(state, playerIndex, isConnected, newSocketId = null) {
  const player = state.players[playerIndex];
  player.isConnected = isConnected;
  player.lastActiveAt = Date.now();

  if (newSocketId) {
    player.socketId = newSocketId;
  }

  if (!isConnected) {
    addHistoryEvent(state, 'disconnect', { playerIndex });
  } else {
    addHistoryEvent(state, 'reconnect', { playerIndex });
  }
}

/**
 * Serialize game state for client
 * @param {Object} state - Full game state
 * @param {number} forPlayerIndex - Player index to serialize for (optional)
 * @returns {Object} - Client-safe state
 */
export function serializeForClient(state, forPlayerIndex = null) {
  return {
    gameId: state.gameId,
    tableId: state.tableId,
    status: state.status,
    betAmount: state.betAmount,
    prizePool: state.prizePool,
    players: state.players.map(p => ({
      index: p.index,
      odId: p.odId,
      name: p.name,
      color: p.color,
      playerNo: p.playerNo,
      isConnected: p.isConnected,
      finishedTokens: Object.values(state.tokens).filter(
        t => t.playerIndex === p.index && t.area === TOKEN_AREA.FINISHED
      ).length
    })),
    tokens: state.tokens,
    turn: {
      currentPlayerIndex: state.turn.currentPlayerIndex,
      phase: state.turn.phase,
      diceValue: state.turn.diceValue,
      consecutiveSixes: state.turn.consecutiveSixes,
      validMoves: state.turn.validMoves,
      isMyTurn: forPlayerIndex !== null ? state.turn.currentPlayerIndex === forPlayerIndex : null
    },
    winner: state.winner
  };
}
