/**
 * Turn Manager
 * Handles turn progression, timeouts, and turn-related logic
 */

import {
  TIMING,
  TURN_PHASE,
  TOKEN_AREA,
  PLAYER_CONFIG,
  ERROR_CODES,
  EVENT_TYPES
} from '../utils/constants.js';
import {
  switchTurn,
  grantExtraTurn,
  addHistoryEvent,
  setWinner,
  hasPlayerWon,
  getPlayerTokens,
  updateTokenPosition
} from './gameState.js';
import { computeValidMoves, hasValidMoves, checkExtraTurn, getAutoMove } from './moveValidator.js';
import { isSafeZone } from '../utils/positionCalc.js';

/**
 * Process turn after dice roll
 * @param {Object} state - Game state (will be mutated)
 * @returns {Object} - {hasValidMoves: boolean, autoMove?: Object}
 */
export function processAfterRoll(state) {
  // Compute valid moves
  state.turn.validMoves = computeValidMoves(state);

  // Check if player has any valid moves
  if (!hasValidMoves(state)) {
    // No valid moves - pass turn automatically
    addHistoryEvent(state, 'no_valid_moves', {
      diceValue: state.turn.diceValue
    });

    // If rolled 6 with no valid moves, still get another turn to roll again
    if (state.turn.diceValue === 6) {
      grantExtraTurn(state, 'six_no_moves');
    } else {
      switchTurn(state);
    }

    return { hasValidMoves: false };
  }

  // Check for auto-move (only one valid move)
  const autoMove = getAutoMove(state);

  return {
    hasValidMoves: true,
    autoMove,
    validMoves: state.turn.validMoves
  };
}

/**
 * Execute a move
 * @param {Object} state - Game state (will be mutated)
 * @param {Object} move - Move object from validMoves
 * @returns {Object} - {success: boolean, captured?: string, finished?: boolean, extraTurn?: boolean, winner?: Object}
 */
export function executeMove(state, move) {
  const playerIndex = state.turn.currentPlayerIndex;
  const diceValue = state.turn.diceValue;

  // Update token position
  updateTokenPosition(state, move.tokenId, move.toArea, move.toPosition);

  // Handle capture if any
  let capturedToken = null;
  if (move.isCapture && move.captureTokenId) {
    capturedToken = move.captureTokenId;
    const capturedTokenConfig = state.tokens[move.captureTokenId];
    const opponentIndex = capturedTokenConfig.playerIndex;

    // Send captured token back to home
    // Find next available home position
    const opponentTokens = getPlayerTokens(state, opponentIndex);
    const homePositions = Object.values(opponentTokens)
      .filter(t => t.area === TOKEN_AREA.HOME)
      .map(t => t.position);

    let homePosition = 1;
    while (homePositions.includes(homePosition) && homePosition <= 4) {
      homePosition++;
    }

    updateTokenPosition(state, move.captureTokenId, TOKEN_AREA.HOME, homePosition);

    addHistoryEvent(state, EVENT_TYPES.CAPTURE, {
      capturedToken: move.captureTokenId,
      atPosition: move.toPosition
    });
  }

  // Log the move
  if (move.isOpen) {
    addHistoryEvent(state, EVENT_TYPES.OPEN, {
      tokenId: move.tokenId,
      position: move.toPosition
    });
  } else if (move.isFinish) {
    addHistoryEvent(state, EVENT_TYPES.FINISH, {
      tokenId: move.tokenId
    });
  } else {
    addHistoryEvent(state, EVENT_TYPES.MOVE, {
      tokenId: move.tokenId,
      from: { area: move.fromArea, position: move.fromPosition },
      to: { area: move.toArea, position: move.toPosition }
    });
  }

  // Check win condition
  if (hasPlayerWon(state, playerIndex)) {
    setWinner(state, playerIndex, 'all_finished');
    return {
      success: true,
      captured: capturedToken,
      finished: move.isFinish,
      extraTurn: false,
      winner: state.winner
    };
  }

  // Check for extra turn
  const { grantsExtraTurn, reason } = checkExtraTurn(move, diceValue);

  if (grantsExtraTurn) {
    grantExtraTurn(state, reason);
    return {
      success: true,
      captured: capturedToken,
      finished: move.isFinish,
      extraTurn: true,
      extraTurnReason: reason
    };
  }

  // Normal turn end - switch to next player
  switchTurn(state);

  return {
    success: true,
    captured: capturedToken,
    finished: move.isFinish,
    extraTurn: false
  };
}

/**
 * Handle turn timeout
 * @param {Object} state - Game state (will be mutated)
 * @returns {Object} - Action taken
 */
export function handleTurnTimeout(state) {
  const playerIndex = state.turn.currentPlayerIndex;

  addHistoryEvent(state, EVENT_TYPES.TIMEOUT, {
    phase: state.turn.phase
  });

  // If in roll phase, auto-roll
  if (state.turn.phase === TURN_PHASE.ROLL) {
    // Will be handled by calling processDiceRoll
    return { action: 'auto_roll' };
  }

  // If in move phase with valid moves, pick first valid move
  if (state.turn.phase === TURN_PHASE.MOVE && hasValidMoves(state)) {
    const autoMove = state.turn.validMoves[0];
    return { action: 'auto_move', move: autoMove };
  }

  // Otherwise, pass turn
  switchTurn(state);
  return { action: 'pass_turn' };
}

/**
 * Check if turn has timed out
 * @param {Object} state - Game state
 * @returns {boolean}
 */
export function isTurnTimedOut(state) {
  const elapsed = Date.now() - state.turn.turnStartedAt;
  return elapsed > TIMING.TURN_TIMEOUT;
}

/**
 * Get remaining turn time
 * @param {Object} state - Game state
 * @returns {number} - Milliseconds remaining
 */
export function getRemainingTurnTime(state) {
  const elapsed = Date.now() - state.turn.turnStartedAt;
  return Math.max(0, TIMING.TURN_TIMEOUT - elapsed);
}

/**
 * Check if warning should be shown
 * @param {Object} state - Game state
 * @returns {boolean}
 */
export function shouldShowWarning(state) {
  const remaining = getRemainingTurnTime(state);
  return remaining <= TIMING.TURN_WARNING && remaining > 0;
}

/**
 * Handle player forfeit
 * @param {Object} state - Game state (will be mutated)
 * @param {number} forfeitingPlayerIndex - Index of player who forfeited
 */
export function handleForfeit(state, forfeitingPlayerIndex) {
  const winnerIndex = forfeitingPlayerIndex === 0 ? 1 : 0;

  state.players[forfeitingPlayerIndex].hasForfeited = true;

  addHistoryEvent(state, EVENT_TYPES.FORFEIT, {
    playerIndex: forfeitingPlayerIndex
  });

  setWinner(state, winnerIndex, 'opponent_forfeit');
}

/**
 * Handle player disconnect timeout (opponent wins)
 * @param {Object} state - Game state (will be mutated)
 * @param {number} disconnectedPlayerIndex - Index of disconnected player
 */
export function handleDisconnectTimeout(state, disconnectedPlayerIndex) {
  const winnerIndex = disconnectedPlayerIndex === 0 ? 1 : 0;

  addHistoryEvent(state, EVENT_TYPES.DISCONNECT, {
    playerIndex: disconnectedPlayerIndex,
    permanent: true
  });

  setWinner(state, winnerIndex, 'opponent_disconnect');
}
