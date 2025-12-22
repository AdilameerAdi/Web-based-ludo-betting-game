/**
 * Move Validator
 * Validates and computes valid moves for tokens
 */

import {
  DICE,
  TOKEN_AREA,
  PLAYER_CONFIG,
  ERROR_CODES,
  TURN_PHASE
} from '../utils/constants.js';
import { calculateMoveResult, isSafeZone } from '../utils/positionCalc.js';
import { getPlayerTokens, getTokensAtPosition } from './gameState.js';

/**
 * Compute all valid moves for current player given dice value
 * @param {Object} state - Game state
 * @returns {Array} - Array of valid move objects
 */
export function computeValidMoves(state) {
  const diceValue = state.turn.diceValue;
  const playerIndex = state.turn.currentPlayerIndex;

  if (diceValue === null) {
    return [];
  }

  const tokens = getPlayerTokens(state, playerIndex);
  const validMoves = [];

  Object.entries(tokens).forEach(([tokenId, token]) => {
    const moveResult = calculateMoveResult(token, diceValue, playerIndex);

    if (moveResult) {
      // Check for potential capture
      let captureTokenId = null;
      if (moveResult.area === 'board' && !isSafeZone(moveResult.position)) {
        const tokensAtTarget = getTokensAtPosition(state, 'board', moveResult.position);
        // Find opponent token at target
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponentConfig = PLAYER_CONFIG[opponentIndex];
        captureTokenId = tokensAtTarget.find(t => opponentConfig.tokens.includes(t)) || null;
      }

      validMoves.push({
        tokenId,
        fromArea: token.area,
        fromPosition: token.position,
        toArea: moveResult.area,
        toPosition: moveResult.position,
        isOpen: moveResult.isOpen || false,
        isFinish: moveResult.isFinish || false,
        isCapture: !!captureTokenId,
        captureTokenId,
        path: moveResult.path
      });
    }
  });

  return validMoves;
}

/**
 * Validate if a specific move is valid
 * @param {Object} state - Game state
 * @param {string} socketId - Socket ID of requesting player
 * @param {string} tokenId - Token to move
 * @returns {Object} - {valid: boolean, move?: Object, error?: string}
 */
export function validateMove(state, socketId, tokenId) {
  // Check game is active
  if (state.status !== 'active') {
    return { valid: false, error: ERROR_CODES.GAME_NOT_ACTIVE };
  }

  // Check it's the move phase
  if (state.turn.phase !== TURN_PHASE.MOVE) {
    return { valid: false, error: ERROR_CODES.INVALID_PHASE };
  }

  // Check it's this player's turn
  const currentPlayer = state.players[state.turn.currentPlayerIndex];
  if (currentPlayer.socketId !== socketId) {
    return { valid: false, error: ERROR_CODES.NOT_YOUR_TURN };
  }

  // Check player is connected
  if (!currentPlayer.isConnected) {
    return { valid: false, error: ERROR_CODES.NOT_YOUR_TURN };
  }

  // Check token belongs to current player
  const playerConfig = PLAYER_CONFIG[state.turn.currentPlayerIndex];
  if (!playerConfig.tokens.includes(tokenId)) {
    return { valid: false, error: ERROR_CODES.INVALID_TOKEN };
  }

  // Check if this move is in valid moves
  const validMove = state.turn.validMoves.find(m => m.tokenId === tokenId);
  if (!validMove) {
    return { valid: false, error: ERROR_CODES.MOVE_NOT_VALID };
  }

  return { valid: true, move: validMove };
}

/**
 * Check if player has any valid moves
 * @param {Object} state - Game state
 * @returns {boolean}
 */
export function hasValidMoves(state) {
  return state.turn.validMoves && state.turn.validMoves.length > 0;
}

/**
 * Get the auto-move if only one valid move exists
 * @param {Object} state - Game state
 * @returns {Object|null} - Single valid move or null
 */
export function getAutoMove(state) {
  if (state.turn.validMoves && state.turn.validMoves.length === 1) {
    return state.turn.validMoves[0];
  }
  return null;
}

/**
 * Check if player must open a token (rolled 6, tokens in home, none on board)
 * @param {Object} state - Game state
 * @returns {boolean}
 */
export function mustOpenToken(state) {
  if (state.turn.diceValue !== DICE.OPEN_VALUE) {
    return false;
  }

  const playerIndex = state.turn.currentPlayerIndex;
  const tokens = getPlayerTokens(state, playerIndex);

  const tokensInHome = Object.values(tokens).filter(t => t.area === TOKEN_AREA.HOME);
  const tokensOnBoard = Object.values(tokens).filter(
    t => t.area === TOKEN_AREA.BOARD || t.area === TOKEN_AREA.PRIVATE
  );

  // Must open if has tokens in home and none on board/private
  return tokensInHome.length > 0 && tokensOnBoard.length === 0;
}

/**
 * Determine if current move grants an extra turn
 * @param {Object} move - The move that was executed
 * @param {number} diceValue - The dice value that was rolled
 * @returns {Object} - {grantsExtraTurn: boolean, reason?: string}
 */
export function checkExtraTurn(move, diceValue) {
  // Rolled a 6 (but not three sixes - that's handled separately)
  if (diceValue === DICE.OPEN_VALUE) {
    return { grantsExtraTurn: true, reason: 'six' };
  }

  // Captured an opponent's token
  if (move.isCapture) {
    return { grantsExtraTurn: true, reason: 'capture' };
  }

  // Token reached finish
  if (move.isFinish) {
    return { grantsExtraTurn: true, reason: 'finish' };
  }

  return { grantsExtraTurn: false };
}
