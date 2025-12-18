/**
 * Game Socket Handlers
 * Handles all game-related socket events
 */

import GameManager from '../gameManager.js';
import { PLAYER_CONFIG, TIMING } from '../utils/constants.js';
import { toFrontendDiceValue } from '../engine/diceLogic.js';

/**
 * Register game socket handlers
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket instance
 */
export function registerGameHandlers(io, socket) {
  // Store io globally for timer callbacks
  global.io = io;

  /**
   * Handle dice roll request
   */
  socket.on('game_roll_dice', ({ gameId }) => {
    console.log(`[Socket] game_roll_dice from ${socket.id} for game ${gameId}`);

    const result = GameManager.rollDice(gameId, socket.id);

    if (!result.success) {
      socket.emit('game_error', {
        action: 'roll_dice',
        error: result.error
      });
      return;
    }

    // Broadcast dice result to all players in the game
    // IMPORTANT: Use rollingPlayerIndex (the player who rolled), NOT currentPlayerIndex
    // (which may have changed if there are no valid moves)
    io.to(`game_${gameId}`).emit('game_dice_result', {
      gameId,
      playerIndex: result.rollingPlayerIndex, // The player who actually rolled the dice
      diceValue: result.diceValue,
      frontendDiceValue: result.frontendDiceValue,
      isThreeSixes: result.isThreeSixes,
      consecutiveSixes: result.consecutiveSixes,
      hasValidMoves: result.hasValidMoves,
      validMoves: result.validMoves.map(m => ({
        tokenId: m.tokenId,
        isOpen: m.isOpen,
        isCapture: m.isCapture,
        isFinish: m.isFinish
      })),
      nextPlayerIndex: result.isThreeSixes ? result.nextPlayerIndex : null,
      gameState: result.gameState
    });

    // If three sixes, also emit turn change
    if (result.isThreeSixes) {
      io.to(`game_${gameId}`).emit('game_turn_change', {
        gameId,
        reason: 'three_sixes',
        currentPlayerIndex: result.nextPlayerIndex,
        gameState: result.gameState
      });
    }

    // If no valid moves, emit turn change
    if (!result.isThreeSixes && !result.hasValidMoves) {
      io.to(`game_${gameId}`).emit('game_turn_change', {
        gameId,
        reason: 'no_valid_moves',
        currentPlayerIndex: result.gameState.turn.currentPlayerIndex,
        gameState: result.gameState
      });
    }
  });

  /**
   * Handle move token request
   */
  socket.on('game_move_token', ({ gameId, tokenId }) => {
    console.log(`[Socket] game_move_token from ${socket.id}: token ${tokenId} in game ${gameId}`);

    const result = GameManager.moveToken(gameId, socket.id, tokenId);

    if (!result.success) {
      socket.emit('game_error', {
        action: 'move_token',
        error: result.error
      });
      return;
    }

    // Broadcast move result to all players
    io.to(`game_${gameId}`).emit('game_move_result', {
      gameId,
      move: result.move,
      captured: result.captured,
      capturedInfo: result.capturedInfo,
      finished: result.finished,
      extraTurn: result.extraTurn,
      extraTurnReason: result.extraTurnReason,
      gameState: result.gameState
    });

    // If game over
    if (result.gameOver) {
      io.to(`game_${gameId}`).emit('game_over', {
        gameId,
        reason: 'all_finished',
        winner: result.winner,
        gameState: result.gameState
      });

      // Cleanup game after a short delay to allow clients to receive the event
      setTimeout(() => {
        GameManager.cleanupGame(gameId);
      }, 5000);
      return;
    }

    // Emit turn change if turn switched
    if (!result.extraTurn) {
      io.to(`game_${gameId}`).emit('game_turn_change', {
        gameId,
        reason: 'move_complete',
        currentPlayerIndex: result.nextPlayerIndex,
        gameState: result.gameState
      });
    } else {
      // Extra turn - still same player but needs to roll again
      io.to(`game_${gameId}`).emit('game_extra_turn', {
        gameId,
        reason: result.extraTurnReason,
        currentPlayerIndex: result.gameState.turn.currentPlayerIndex,
        gameState: result.gameState
      });
    }
  });

  /**
   * Handle forfeit request
   */
  socket.on('game_forfeit', ({ gameId }) => {
    console.log(`[Socket] game_forfeit from ${socket.id} for game ${gameId}`);

    const result = GameManager.forfeit(gameId, socket.id);

    if (!result.success) {
      socket.emit('game_error', {
        action: 'forfeit',
        error: result.error
      });
      return;
    }

    // Broadcast game over
    io.to(`game_${gameId}`).emit('game_over', {
      gameId,
      reason: 'forfeit',
      winner: result.winner,
      gameState: result.gameState
    });

    // Cleanup game after a short delay to allow clients to receive the event
    setTimeout(() => {
      GameManager.cleanupGame(gameId);
    }, 5000);
  });

  /**
   * Handle get game state request
   */
  socket.on('game_get_state', ({ gameId }) => {
    console.log(`[Socket] game_get_state from ${socket.id} for game ${gameId}`);

    const gameState = GameManager.getGameState(gameId, socket.id);

    if (!gameState) {
      socket.emit('game_error', {
        action: 'get_state',
        error: 'INVALID_GAME'
      });
      return;
    }

    socket.emit('game_state_update', {
      gameId,
      gameState
    });
  });

  /**
   * Handle join game room
   */
  socket.on('game_join', ({ gameId, odId }) => {
    console.log(`[Socket] game_join from ${socket.id} for game ${gameId}`);

    // Try to reconnect if this is a returning player
    const result = GameManager.handleReconnect(gameId, odId, socket.id);

    if (result.success) {
      // Join the game room
      socket.join(`game_${gameId}`);

      // Send full game state to reconnected player
      socket.emit('game_reconnected', {
        gameId,
        playerIndex: result.playerIndex,
        gameState: result.gameState
      });

      // Notify opponent
      socket.to(`game_${gameId}`).emit('game_opponent_reconnected', {
        gameId,
        playerIndex: result.playerIndex
      });
    } else {
      // Just join the room (new game start)
      socket.join(`game_${gameId}`);

      const gameState = GameManager.getGameState(gameId, socket.id);
      if (gameState) {
        socket.emit('game_state_update', {
          gameId,
          gameState
        });
      }
    }
  });

  /**
   * Handle socket disconnect
   */
  socket.on('disconnect', () => {
    console.log(`[Socket] disconnect: ${socket.id}`);

    const disconnectInfo = GameManager.handleDisconnect(socket.id);

    if (disconnectInfo) {
      // Notify opponent about disconnect
      io.to(`game_${disconnectInfo.gameId}`).emit('game_opponent_disconnected', {
        gameId: disconnectInfo.gameId,
        disconnectedPlayerIndex: disconnectInfo.disconnectedPlayerIndex,
        reconnectTimeout: disconnectInfo.timeout
      });
    }
  });
}

/**
 * Initialize a new game and set up the room
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket1 - First player's socket
 * @param {Object} socket2 - Second player's socket
 * @param {string} tableId - Table ID
 * @param {Array} players - Player info array
 * @param {number} betAmount - Bet amount
 * @returns {Object} - Created game info
 */
export function initializeGame(io, socket1, socket2, tableId, players, betAmount) {
  // Create the game
  const gameState = GameManager.createGame(tableId, players, betAmount);
  const gameId = gameState.gameId;

  // Join both players to the game room
  socket1.join(`game_${gameId}`);
  socket2.join(`game_${gameId}`);

  // Register handlers for both sockets if not already done
  // (This is called from server.js after match is found)

  console.log(`[Socket] Game initialized: ${gameId} with players ${players.map(p => p.userId).join(', ')}`);

  // Notify both players that game is starting
  const player1State = {
    gameId,
    tableId,
    playerIndex: 0,
    color: PLAYER_CONFIG[0].color,
    playerNo: PLAYER_CONFIG[0].playerNo,
    opponentName: players[1].userName,
    gameState: GameManager.getGameState(gameId, socket1.id)
  };

  const player2State = {
    gameId,
    tableId,
    playerIndex: 1,
    color: PLAYER_CONFIG[1].color,
    playerNo: PLAYER_CONFIG[1].playerNo,
    opponentName: players[0].userName,
    gameState: GameManager.getGameState(gameId, socket2.id)
  };

  socket1.emit('game_initialized', player1State);
  socket2.emit('game_initialized', player2State);

  return { gameId, gameState };
}

export default {
  registerGameHandlers,
  initializeGame
};
