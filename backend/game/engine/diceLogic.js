/**
 * Dice Logic
 * Server-side secure dice generation and validation
 */

import crypto from 'crypto';
import { DICE, TURN_PHASE, ERROR_CODES } from '../utils/constants.js';
import { addHistoryEvent, grantExtraTurn, switchTurn } from './gameState.js';

/**
 * Generate a cryptographically secure dice value
 * @returns {number} - Dice value (1-6)
 */
export function generateDiceValue() {
  // Use crypto.randomInt for secure random number generation
  return crypto.randomInt(DICE.MIN, DICE.MAX + 1);
}

/**
 * Validate if a player can roll the dice
 * @param {Object} state - Game state
 * @param {string} socketId - Socket ID of requesting player
 * @returns {Object} - {valid: boolean, error?: string}
 */
export function validateDiceRoll(state, socketId) {
  // Check game is active
  if (state.status !== 'active') {
    return { valid: false, error: ERROR_CODES.GAME_NOT_ACTIVE };
  }

  // Check it's the roll phase
  if (state.turn.phase !== TURN_PHASE.ROLL) {
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

  return { valid: true };
}

/**
 * Process a dice roll
 * @param {Object} state - Game state (will be mutated)
 * @param {string} socketId - Socket ID of rolling player
 * @returns {Object} - {success: boolean, diceValue?: number, error?: string, isThreeSixes?: boolean}
 */
export function processDiceRoll(state, socketId) {
  // Validate the roll
  const validation = validateDiceRoll(state, socketId);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Generate dice value
  const diceValue = generateDiceValue();

  // Update state
  state.turn.diceValue = diceValue;
  state.turn.lastActionAt = Date.now();

  // Track consecutive sixes
  let isThreeSixes = false;
  if (diceValue === DICE.OPEN_VALUE) {
    state.turn.consecutiveSixes++;

    if (state.turn.consecutiveSixes >= DICE.MAX_CONSECUTIVE_SIXES) {
      // Three sixes penalty - turn passes
      isThreeSixes = true;

      // Add to history
      addHistoryEvent(state, 'roll', {
        value: diceValue,
        consecutiveSixes: state.turn.consecutiveSixes
      });
      addHistoryEvent(state, 'three_sixes', {
        playerIndex: state.turn.currentPlayerIndex
      });

      // Switch turn
      switchTurn(state);

      return {
        success: true,
        diceValue,
        isThreeSixes: true,
        consecutiveSixes: DICE.MAX_CONSECUTIVE_SIXES
      };
    }
  } else {
    state.turn.consecutiveSixes = 0;
  }

  // Add roll to history
  addHistoryEvent(state, 'roll', {
    value: diceValue,
    consecutiveSixes: state.turn.consecutiveSixes
  });

  // Move to move phase
  state.turn.phase = TURN_PHASE.MOVE;

  return {
    success: true,
    diceValue,
    isThreeSixes: false,
    consecutiveSixes: state.turn.consecutiveSixes
  };
}

/**
 * Convert dice value to frontend format (0-5 instead of 1-6)
 * @param {number} diceValue - Server dice value (1-6)
 * @returns {number} - Frontend dice value (0-5)
 */
export function toFrontendDiceValue(diceValue) {
  return diceValue - 1;
}

/**
 * Convert frontend dice value to server format
 * @param {number} frontendValue - Frontend dice value (0-5)
 * @returns {number} - Server dice value (1-6)
 */
export function fromFrontendDiceValue(frontendValue) {
  return frontendValue + 1;
}
