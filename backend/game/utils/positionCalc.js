/**
 * Position Calculation Utilities
 * Handles all board position calculations for Ludo game
 */

import { BOARD_SIZE, PRIVATE_AREA_SIZE, PLAYER_CONFIG, SAFE_ZONES } from './constants.js';

/**
 * Calculate new position after moving on the main board
 * @param {number} currentPosition - Current position (1-52)
 * @param {number} steps - Number of steps to move
 * @returns {number} - New position (1-52)
 */
export function calculateBoardPosition(currentPosition, steps) {
  let newPosition = currentPosition + steps;
  if (newPosition > BOARD_SIZE) {
    newPosition = newPosition - BOARD_SIZE;
  }
  return newPosition;
}

/**
 * Check if a position is a safe zone
 * @param {number} position - Board position to check
 * @returns {boolean}
 */
export function isSafeZone(position) {
  return SAFE_ZONES.includes(position);
}

/**
 * Get the path a token would take for a given move
 * @param {number} startPosition - Starting board position
 * @param {number} steps - Number of steps
 * @param {number} playerIndex - Player index (0 or 1)
 * @returns {Array<{position: number, area: string}>} - Array of positions in order
 */
export function getMovePath(startPosition, steps, playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];
  const path = [];
  let currentPos = startPosition;
  let inPrivate = false;
  let privatePos = 0;

  for (let i = 0; i < steps; i++) {
    if (inPrivate) {
      privatePos++;
      path.push({ position: privatePos, area: 'private' });
    } else {
      // Check if we should enter private area
      if (currentPos === config.privateEntryAfter) {
        inPrivate = true;
        privatePos = 1;
        path.push({ position: privatePos, area: 'private' });
      } else {
        currentPos = calculateBoardPosition(currentPos, 1);
        path.push({ position: currentPos, area: 'board' });
      }
    }
  }

  return path;
}

/**
 * Check if a token should enter private area
 * @param {number} currentPosition - Current board position
 * @param {number} steps - Steps to move
 * @param {number} playerIndex - Player index
 * @returns {boolean}
 */
export function shouldEnterPrivateArea(currentPosition, steps, playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];
  const entryPoint = config.privateEntryAfter;

  // Calculate positions we'll pass through
  for (let i = 1; i <= steps; i++) {
    const checkPos = calculateBoardPosition(currentPosition, i);
    // Special handling for wrap-around
    if (currentPosition <= entryPoint && checkPos > entryPoint) {
      return false; // Would pass entry but not from the right direction
    }
    if (currentPosition > entryPoint || currentPosition + i > BOARD_SIZE) {
      // We've wrapped around, check if we pass entry point
      const normalizedCurrent = currentPosition;
      const stepsToEntry = entryPoint >= normalizedCurrent
        ? entryPoint - normalizedCurrent
        : (BOARD_SIZE - normalizedCurrent) + entryPoint;

      if (steps > stepsToEntry && stepsToEntry >= 0) {
        return true;
      }
    }
  }

  // Direct check: will we land on or pass the entry point?
  const stepsToEntry = getStepsToPrivateEntry(currentPosition, playerIndex);
  return stepsToEntry !== null && steps > stepsToEntry;
}

/**
 * Get number of steps to reach private area entry point
 * @param {number} currentPosition - Current board position
 * @param {number} playerIndex - Player index
 * @returns {number|null} - Steps to entry, or null if already passed
 */
export function getStepsToPrivateEntry(currentPosition, playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];
  const entryPoint = config.privateEntryAfter;
  const startPos = config.startPosition;

  // Calculate clockwise distance from start to current position
  let distanceFromStart;
  if (currentPosition >= startPos) {
    distanceFromStart = currentPosition - startPos;
  } else {
    distanceFromStart = (BOARD_SIZE - startPos) + currentPosition;
  }

  // Calculate clockwise distance from start to entry point
  let entryDistanceFromStart;
  if (entryPoint >= startPos) {
    entryDistanceFromStart = entryPoint - startPos;
  } else {
    entryDistanceFromStart = (BOARD_SIZE - startPos) + entryPoint;
  }

  // If we haven't passed the entry point yet
  if (distanceFromStart <= entryDistanceFromStart) {
    return entryDistanceFromStart - distanceFromStart;
  }

  // We've already passed it (completed a lap)
  return null;
}

/**
 * Calculate final position for a move
 * @param {Object} token - Token state {area, position}
 * @param {number} steps - Dice value
 * @param {number} playerIndex - Player index
 * @returns {Object|null} - {area, position, isFinish, path} or null if invalid
 */
export function calculateMoveResult(token, steps, playerIndex) {
  const config = PLAYER_CONFIG[playerIndex];

  // Token in home - can only open with a 6
  if (token.area === 'home') {
    if (steps === 6) {
      return {
        area: 'board',
        position: config.startPosition,
        isFinish: false,
        isOpen: true,
        path: [{ position: config.startPosition, area: 'board' }]
      };
    }
    return null; // Cannot move from home without 6
  }

  // Token already finished
  if (token.area === 'finished') {
    return null;
  }

  // Token in private area
  if (token.area === 'private') {
    const newPrivatePos = token.position + steps;

    if (newPrivatePos > PRIVATE_AREA_SIZE) {
      return null; // Would overshoot finish
    }

    if (newPrivatePos === PRIVATE_AREA_SIZE) {
      // Reached finish!
      const path = [];
      for (let i = token.position + 1; i <= PRIVATE_AREA_SIZE; i++) {
        path.push({ position: i, area: 'private' });
      }
      return {
        area: 'finished',
        position: null,
        isFinish: true,
        isOpen: false,
        path
      };
    }

    // Normal move in private area
    const path = [];
    for (let i = token.position + 1; i <= newPrivatePos; i++) {
      path.push({ position: i, area: 'private' });
    }
    return {
      area: 'private',
      position: newPrivatePos,
      isFinish: false,
      isOpen: false,
      path
    };
  }

  // Token on main board
  if (token.area === 'board') {
    const stepsToEntry = getStepsToPrivateEntry(token.position, playerIndex);

    // Check if we'll enter private area
    if (stepsToEntry !== null && steps > stepsToEntry) {
      const stepsInPrivate = steps - stepsToEntry - 1; // -1 because entry point is last board position
      const privatePosition = stepsInPrivate + 1;

      if (privatePosition > PRIVATE_AREA_SIZE) {
        return null; // Would overshoot
      }

      // Build path
      const path = [];
      let currentPos = token.position;

      // Steps on board until entry
      for (let i = 0; i < stepsToEntry; i++) {
        currentPos = calculateBoardPosition(currentPos, 1);
        path.push({ position: currentPos, area: 'board' });
      }

      // Steps in private area
      for (let i = 1; i <= privatePosition; i++) {
        path.push({ position: i, area: 'private' });
      }

      if (privatePosition === PRIVATE_AREA_SIZE) {
        return {
          area: 'finished',
          position: null,
          isFinish: true,
          isOpen: false,
          path
        };
      }

      return {
        area: 'private',
        position: privatePosition,
        isFinish: false,
        isOpen: false,
        path
      };
    }

    // Normal board move
    const newPosition = calculateBoardPosition(token.position, steps);
    const path = [];
    let currentPos = token.position;
    for (let i = 0; i < steps; i++) {
      currentPos = calculateBoardPosition(currentPos, 1);
      path.push({ position: currentPos, area: 'board' });
    }

    return {
      area: 'board',
      position: newPosition,
      isFinish: false,
      isOpen: false,
      path
    };
  }

  return null;
}

/**
 * Convert internal position to frontend position ID
 * @param {string} area - Token area (board, private, home, finished)
 * @param {number} position - Position number
 * @param {string} color - Player color ('r' or 'y')
 * @returns {string} - Frontend element ID
 */
export function toFrontendPositionId(area, position, color) {
  switch (area) {
    case 'board':
      return `out${position}`;
    case 'private':
      return `${color}-out-${position}`;
    case 'home':
      return `in-${color}-${position}`;
    case 'finished':
      return `${color}-win-pawn-box`;
    default:
      return null;
  }
}

/**
 * Parse frontend position ID to internal format
 * @param {string} positionId - Frontend element ID
 * @returns {Object} - {area, position, color}
 */
export function fromFrontendPositionId(positionId) {
  if (positionId.startsWith('out') && !positionId.includes('-out-')) {
    return {
      area: 'board',
      position: parseInt(positionId.replace('out', '')),
      color: null
    };
  }

  if (positionId.includes('-out-')) {
    const parts = positionId.split('-out-');
    return {
      area: 'private',
      position: parseInt(parts[1]),
      color: parts[0]
    };
  }

  if (positionId.startsWith('in-')) {
    const parts = positionId.split('-');
    return {
      area: 'home',
      position: parseInt(parts[2]),
      color: parts[1]
    };
  }

  if (positionId.includes('-win-pawn-box')) {
    return {
      area: 'finished',
      position: null,
      color: positionId.charAt(0)
    };
  }

  return null;
}
