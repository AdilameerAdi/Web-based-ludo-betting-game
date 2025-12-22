/**
 * Ludo Game v2 - Server-Authoritative Client
 * This version works with the server-side game engine
 * All game logic decisions are made by the server
 */

// ============ State Variables ============
let gameId = null;
let tableId = null;
let gameSocket = null;
let playerIndex = null; // 0 = Red, 1 = Yellow
let playerColor = null; // 'r' or 'y'
let playerNo = null; // 1 = Red, 3 = Yellow
let isMyTurn = false;
let gameState = null;
let sound = true;

// Audio
const rollAudio = new Audio("/music/diceRollingSound.mp3");
const openAudio = new Audio("/music/open-sound.wav");
const jumpAudio = new Audio("/music/jump-sound.mp3");
const cutAudio = new Audio("/music/cut-sound.wav");
const passAudio = new Audio("/music/pass-sound.mp3");
const winAudio = new Audio("/music/win-sound.mp3");

// Player configurations
const PLAYER_CONFIG = {
  0: { color: 'r', name: 'Red', playerNo: 1, diceId: '#redDice' },
  1: { color: 'y', name: 'Yellow', playerNo: 3, diceId: '#yellowDice' }
};

// Global storage for dice animation timers (more reliable than jQuery data)
let diceAnimationTimers = {
  '#redDice': null,
  '#yellowDice': null
};

// Flag to track if dice result is being shown (prevents animation interference)
let diceResultShown = {
  '#redDice': false,
  '#yellowDice': false
};

// ============ Initialization ============

/**
 * Initialize the game client
 * @param {Object} socket - Socket.IO connection
 * @param {string} tId - Table ID
 * @param {string} odId - User ID
 * @param {Array} players - Array of player IDs
 * @param {Object} initData - Optional initialization data from game_initialized event
 */
function initializeGameV2(socket, tId, odId, players, initData = null) {
  gameSocket = socket;
  tableId = tId;

  // If we have initialization data, use it directly
  if (initData && initData.playerIndex !== undefined) {
    playerIndex = initData.playerIndex;
    playerColor = PLAYER_CONFIG[playerIndex].color;
    playerNo = PLAYER_CONFIG[playerIndex].playerNo;
    gameId = initData.gameId;
    gameState = initData.gameState;

    console.log(`[GameV2] Initialized from initData: playerIndex=${playerIndex}, color=${playerColor}, playerNo=${playerNo}`);
  } else {
    // Fallback: Determine player index from players array
    const idx = players ? players.indexOf(odId) : -1;
    if (idx === -1) {
      console.error('User not found in players array and no initData provided');
      // Try to find player index from odId comparison
      if (players && players.length >= 2) {
        // players might be user ID strings
        playerIndex = players[0] === odId ? 0 : 1;
      } else {
        playerIndex = 0; // Default to red
      }
    } else {
      playerIndex = idx;
    }

    playerColor = PLAYER_CONFIG[playerIndex].color;
    playerNo = PLAYER_CONFIG[playerIndex].playerNo;

    console.log(`[GameV2] Initialized from players array: playerIndex=${playerIndex}, color=${playerColor}, playerNo=${playerNo}`);
  }

  // Set up socket event listeners (only once)
  if (!gameSocket._gameV2ListenersSetup) {
    setupSocketListeners();
    gameSocket._gameV2ListenersSetup = true;
  }

  // Set up UI
  setupUI();

  // If we already have game state, render it
  if (gameState) {
    isMyTurn = gameState.turn.currentPlayerIndex === playerIndex;
    renderGameState(gameState);
    updateTurnUI();
    showMessage(`Game started! You are ${PLAYER_CONFIG[playerIndex].name}. ${isMyTurn ? 'Your turn!' : 'Waiting for opponent...'}`);
  }
}

/**
 * Set up socket event listeners for game events
 */
function setupSocketListeners() {
  // Game initialized - receive initial game state
  gameSocket.on('game_initialized', (data) => {
    console.log('[GameV2] game_initialized:', data);
    gameId = data.gameId;
    gameState = data.gameState;
    playerIndex = data.playerIndex;
    playerColor = PLAYER_CONFIG[data.playerIndex].color;
    playerNo = PLAYER_CONFIG[data.playerIndex].playerNo;

    // Update turn state
    isMyTurn = gameState.turn.currentPlayerIndex === playerIndex;

    // Render initial board state
    renderGameState(gameState);
    updateTurnUI();

    showMessage(`Game started! You are ${PLAYER_CONFIG[playerIndex].name}`);
  });

  // Dice result from server
  gameSocket.on('game_dice_result', (data) => {
    console.log('[GameV2] game_dice_result:', data);
    gameState = data.gameState;

    // Show dice animation and result
    showDiceResult(data.playerIndex, data.frontendDiceValue);

    // Handle three sixes penalty
    if (data.isThreeSixes) {
      showMessage('Three sixes! Turn passes.');
      return;
    }

    // Check if this is our turn
    if (data.playerIndex === playerIndex) {
      // If no valid moves
      if (!data.hasValidMoves) {
        showMessage('No valid moves. Turn passes.');
        return;
      }

      // If move was auto-executed on server, just show message (move result will come via game_move_result)
      if (data.autoExecuted) {
        console.log('[GameV2] Move was auto-executed on server');
        showMessage('Auto-moving token...');
        clearHighlights();
        // The move result will come via game_move_result event, so we just wait
        return;
      }

      // AUTO-MOVE: If only one valid move exists, execute it automatically (client-side fallback)
      if (data.autoMove && data.autoMove.tokenId && !data.autoExecuted) {
        console.log('[GameV2] Auto-moving token:', data.autoMove.tokenId, 'Only one valid move available');
        showMessage('Auto-moving token...');
        
        // Clear any highlights
        clearHighlights();
        
        // Wait 2 seconds after dice roll, then additional 1-2 seconds before executing move
        // This gives players time to see the dice result before movement starts
        setTimeout(() => {
          gameSocket.emit('game_move_token', { gameId, tokenId: data.autoMove.tokenId });
          console.log(`[GameV2] Auto-executed move: ${data.autoMove.tokenId}`);
        }, 1500); // 2 seconds after dice + 1 second = 3 seconds total delay
        return;
      }

      // MULTIPLE MOVES: If multiple valid moves exist, highlight them and wait for player selection
      if (data.hasValidMoves && data.validMoves && data.validMoves.length > 1) {
        console.log('[GameV2] Multiple valid moves available:', data.validMoves.length);
        highlightValidMoves(data.validMoves);
        showMessage(`Select a token to move (${data.validMoves.length} options available)`);
      } else if (data.hasValidMoves && data.validMoves && data.validMoves.length === 1) {
        // Fallback: If only one move in validMoves array, auto-move it
        console.log('[GameV2] Fallback auto-move: Only one move in validMoves array');
        const singleMove = data.validMoves[0];
        clearHighlights();
        showMessage('Auto-moving token...');
        // Wait 2 seconds after dice roll, then additional 1-2 seconds before executing move
        setTimeout(() => {
          gameSocket.emit('game_move_token', { gameId, tokenId: singleMove.tokenId });
          console.log(`[GameV2] Auto-executed fallback move: ${singleMove.tokenId}`);
        }, 1500); // 2 seconds after dice + 1 second = 3 seconds total delay
      }
    }
  });

  // Move result from server
  gameSocket.on('game_move_result', (data) => {
    console.log('[GameV2] game_move_result:', data);
    gameState = data.gameState;

    // Animate the move
    animateMove(data.move, () => {
      // Handle capture
      if (data.captured && data.capturedInfo) {
        animateCapture(data.capturedInfo);
      }

      // Handle finish
      if (data.finished) {
        if (sound) passAudio.play();
        showMessage('Token reached home!');
      }

      // Update board state
      renderGameState(gameState);
    });
  });

  // Turn change notification
  gameSocket.on('game_turn_change', (data) => {
    console.log('[GameV2] game_turn_change:', data);
    gameState = data.gameState;
    isMyTurn = data.currentPlayerIndex === playerIndex;

    // Delay updateTurnUI slightly to ensure dice result animation completes first
    // This prevents the turn UI update from interfering with the dice display
    setTimeout(() => {
      updateTurnUI();

      if (isMyTurn) {
        showMessage('Your turn!');
      }
    }, 100);
  });

  // Extra turn notification
  gameSocket.on('game_extra_turn', (data) => {
    console.log('[GameV2] game_extra_turn:', data);
    gameState = data.gameState;
    isMyTurn = data.currentPlayerIndex === playerIndex;
    updateTurnUI();

    if (isMyTurn) {
      const reasons = {
        'six': 'Rolled a 6!',
        'capture': 'Captured opponent!',
        'finish': 'Token reached home!'
      };
      showMessage(`${reasons[data.reason] || 'Extra turn!'} Roll again!`);
    }
  });

  // Game over
  gameSocket.on('game_over', (data) => {
    console.log('[GameV2] game_over:', data);
    gameState = data.gameState;

    const isWinner = data.winner.playerIndex === playerIndex;
    if (isWinner) {
      if (sound) winAudio.play();
      showWinMessage(`You won! Prize: ₹${data.winner.prize}`);
    } else {
      showWinMessage(`You lost. ${PLAYER_CONFIG[data.winner.playerIndex].name} wins!`);
    }
  });

  // Opponent disconnected
  gameSocket.on('game_opponent_disconnected', (data) => {
    console.log('[GameV2] game_opponent_disconnected:', data);
    showMessage(`Opponent disconnected. Waiting ${data.reconnectTimeout / 1000}s for reconnection...`);
  });

  // Opponent reconnected
  gameSocket.on('game_opponent_reconnected', (data) => {
    console.log('[GameV2] game_opponent_reconnected:', data);
    showMessage('Opponent reconnected!');
  });

  // Game state update (for reconnection)
  gameSocket.on('game_state_update', (data) => {
    console.log('[GameV2] game_state_update:', data);
    gameId = data.gameId;
    gameState = data.gameState;
    renderGameState(gameState);
    updateTurnUI();
  });

  // Game reconnected
  gameSocket.on('game_reconnected', (data) => {
    console.log('[GameV2] game_reconnected:', data);
    gameId = data.gameId;
    playerIndex = data.playerIndex;
    playerColor = PLAYER_CONFIG[data.playerIndex].color;
    playerNo = PLAYER_CONFIG[data.playerIndex].playerNo;
    gameState = data.gameState;
    renderGameState(gameState);
    updateTurnUI();
    showMessage('Reconnected to game!');
  });

  // Error handling
  gameSocket.on('game_error', (data) => {
    console.error('[GameV2] game_error:', data);
    showMessage(`Error: ${data.error}`);
  });
}

/**
 * Set up UI event handlers
 */
function setupUI() {
  // Set up dice click handlers
  const myDiceId = PLAYER_CONFIG[playerIndex].diceId;
  $(myDiceId).off('click').on('click', handleDiceClick);

  // Set up sound toggle
  $('#sound').off('click').on('click', toggleSound);

  // Set up forfeit button (if exists)
  $('#forfeit').off('click').on('click', handleForfeit);

  // Set up refresh button - reload the page
  $('#refresh-page-btn').off('click').on('click', function() {
    window.location.reload();
  });
}

// ============ User Actions ============

/**
 * Handle dice click
 */
function handleDiceClick() {
  if (!isMyTurn) {
    showMessage("It's not your turn!");
    return;
  }

  if (gameState.turn.phase !== 'roll') {
    showMessage('Please select a token to move first.');
    return;
  }

  // Disable dice while waiting for server
  const myDiceId = PLAYER_CONFIG[playerIndex].diceId;
  $(myDiceId).off('click');

  // Clear any inline styles from previous dice result before starting animation
  // Must remove !important styles by setting to empty string via style property
  const diceElement = $(myDiceId)[0];
  diceElement.style.removeProperty('background-image');
  diceElement.style.removeProperty('background-size');
  diceElement.style.removeProperty('background-repeat');
  diceElement.style.removeProperty('background-position-x');
  diceElement.style.removeProperty('background-position-y');

  $(myDiceId).removeClass('startDiceRoll showDice').addClass('rollDice');

  // Play roll sound
  if (sound) {
    rollAudio.play();
    rollAudio.playbackRate = 3.2;
  }

  // Start dice animation (will be updated when server responds)
  startDiceAnimation(myDiceId);

  // Send roll request to server
  gameSocket.emit('game_roll_dice', { gameId });

  console.log('[GameV2] Sent game_roll_dice');
}

/**
 * Handle token click
 * @param {string} tokenId - Token ID
 */
function handleTokenClick(tokenId) {
  if (!isMyTurn) {
    showMessage("It's not your turn!");
    return;
  }

  if (gameState.turn.phase !== 'move') {
    showMessage('Please roll the dice first.');
    return;
  }

  // Check if this token is in valid moves
  const validMove = gameState.turn.validMoves.find(m => m.tokenId === tokenId);
  if (!validMove) {
    showMessage('This token cannot move with the current dice value.');
    return;
  }

  // Remove highlights
  clearHighlights();

  // Send move request to server
  gameSocket.emit('game_move_token', { gameId, tokenId });

  console.log(`[GameV2] Sent game_move_token: ${tokenId}`);
}

/**
 * Handle forfeit
 */
function handleForfeit() {
  if (confirm('Are you sure you want to forfeit? You will lose the game.')) {
    gameSocket.emit('game_forfeit', { gameId });
  }
}

// ============ Rendering ============

/**
 * Render the complete game state
 * @param {Object} state - Game state from server
 */
function renderGameState(state) {
  if (!state) return;

  // Clear all pawns from board first
  $('.r-pawn1, .r-pawn2, .r-pawn3, .r-pawn4, .y-pawn1, .y-pawn2, .y-pawn3, .y-pawn4').remove();

  // Render each token
  Object.entries(state.tokens).forEach(([tokenId, token]) => {
    renderToken(tokenId, token);
  });
}

/**
 * Render a single token at its position
 * @param {string} tokenId - Token ID (e.g., 'r-pawn1')
 * @param {Object} token - Token state {area, position, playerIndex}
 */
function renderToken(tokenId, token) {
  const color = tokenId.charAt(0);
  const pawnNum = tokenId.match(/\d+/)[0];
  const className = `${color}-pawn${pawnNum}`;

  // Remove existing token element
  $(`.${className}`).remove();

  let targetId;
  switch (token.area) {
    case 'home':
      targetId = `in-${color}-${token.position}`;
      break;
    case 'board':
      targetId = `out${token.position}`;
      break;
    case 'private':
      targetId = `${color}-out-${token.position}`;
      break;
    case 'finished':
      targetId = `${color}-win-pawn-box`;
      break;
    default:
      console.error(`Unknown token area: ${token.area}`);
      return;
  }

  // Get tokens at same position for stacking
  const tokensAtPos = Object.entries(gameState.tokens).filter(([tid, t]) =>
    t.area === token.area && t.position === token.position
  );

  // Find the index of this token among all tokens at the same position
  const stackIndex = tokensAtPos.findIndex(([tid]) => tid === tokenId);

  // Stack tokens with slight offset - each token offset by 3px in both directions
  const offsetX = stackIndex * 3;
  const offsetY = stackIndex * 3;

  // Add token to target position - full size with stacking offset
  $(`#${targetId}`).append(
    `<div class="${className}" style="position:absolute; left:${offsetX}px; top:${offsetY}px; z-index:${10 + stackIndex};"></div>`
  );

  // Make sure parent has relative positioning for absolute children to work
  $(`#${targetId}`).css('position', 'relative');

  // Add click handler if it's current player's token and their turn
  if (token.playerIndex === playerIndex && isMyTurn && gameState.turn.phase === 'move') {
    $(`.${className}`).css('cursor', 'pointer').off('click').on('click', () => {
      handleTokenClick(tokenId);
    });
  }
}

/**
 * Highlight valid moves
 * @param {Array} validMoves - Array of valid move objects
 */
function highlightValidMoves(validMoves) {
  clearHighlights();

  validMoves.forEach(move => {
    const tokenId = move.tokenId;
    const color = tokenId.charAt(0);
    const pawnNum = tokenId.match(/\d+/)[0];
    const className = `${color}-pawn${pawnNum}`;

    $(`.${className}`).addClass('glow').css('cursor', 'pointer');
    $(`.${className}`).off('click').on('click', () => {
      handleTokenClick(tokenId);
    });
  });
}

/**
 * Clear all highlights
 */
function clearHighlights() {
  $('.glow').removeClass('glow');
  // Remove click handlers from non-current-player tokens
  if (playerColor === 'r') {
    $('.y-pawn1, .y-pawn2, .y-pawn3, .y-pawn4').off('click').css('cursor', 'default');
  } else {
    $('.r-pawn1, .r-pawn2, .r-pawn3, .r-pawn4').off('click').css('cursor', 'default');
  }
}

/**
 * Update turn UI (dice states, etc.)
 */
function updateTurnUI() {
  const myDiceId = PLAYER_CONFIG[playerIndex].diceId;
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponentDiceId = PLAYER_CONFIG[opponentIndex].diceId;

  if (isMyTurn && gameState.turn.phase === 'roll') {
    // Enable my dice - but first clear any inline styles from previous result
    const myDiceElement = $(myDiceId)[0];
    myDiceElement.style.removeProperty('background-image');
    myDiceElement.style.removeProperty('background-size');
    myDiceElement.style.removeProperty('background-repeat');
    myDiceElement.style.removeProperty('background-position-x');
    myDiceElement.style.removeProperty('background-position-y');

    $(myDiceId).addClass('startDiceRoll').removeClass('rollDice showDice');
    $(myDiceId).css('cursor', 'pointer');
    $(myDiceId).off('click').on('click', handleDiceClick);
  } else {
    // Disable my dice - but DON'T remove showDice class if in move phase
    // (we want to keep showing the dice result while player selects a token)
    $(myDiceId).removeClass('startDiceRoll rollDice');
    $(myDiceId).css('cursor', 'not-allowed');
    $(myDiceId).off('click');
  }

  // Always disable opponent's dice for this player
  $(opponentDiceId).removeClass('startDiceRoll rollDice');
  $(opponentDiceId).css('cursor', 'default');
  $(opponentDiceId).off('click');
}

// ============ Animations ============

/**
 * Start dice rolling animation using requestAnimationFrame for better control
 * @param {string} diceId - Dice element ID
 */
function startDiceAnimation(diceId) {
  console.log(`[GameV2] startDiceAnimation called for ${diceId}`);

  // Clear any existing animation
  if (diceAnimationTimers[diceId]) {
    cancelAnimationFrame(diceAnimationTimers[diceId]);
    diceAnimationTimers[diceId] = null;
  }

  // Reset the "result shown" flag - we're starting a new animation
  diceResultShown[diceId] = false;

  // Get the dice element
  const diceElement = $(diceId)[0];
  if (!diceElement) {
    console.error(`[GameV2] Dice element not found for animation: ${diceId}`);
    return;
  }

  // Ensure the rollDice class is using its CSS (clear inline !important styles if any)
  diceElement.style.removeProperty('background-image');
  diceElement.style.removeProperty('background-size');
  diceElement.style.removeProperty('background-repeat');
  diceElement.style.removeProperty('background-position-x');
  diceElement.style.removeProperty('background-position-y');
  // Also clear camelCase versions
  diceElement.style.backgroundImage = '';
  diceElement.style.backgroundSize = '';
  diceElement.style.backgroundRepeat = '';
  diceElement.style.backgroundPositionX = '';
  diceElement.style.backgroundPositionY = '';

  let pX = 0;
  let pY = 0;
  let lastTime = 0;
  let animationStopped = false;

  const animate = (currentTime) => {
    // Stop immediately if result has been shown or animation was stopped
    if (diceResultShown[diceId] || animationStopped) {
      diceAnimationTimers[diceId] = null;
      animationStopped = true;
      console.log(`[GameV2] Animation stopped for ${diceId} - result shown or stopped`);
      return;
    }

    // Throttle to ~50fps (every 20ms)
    if (currentTime - lastTime >= 20) {
      lastTime = currentTime;
      (pX == 100 && ((pX = 0), (pY = pY + 25))) || (pX = pX + 20);

      // Triple-check flag before DOM update
      if (!diceResultShown[diceId] && !animationStopped) {
        diceElement.style.backgroundPositionX = pX + '%';
        diceElement.style.backgroundPositionY = pY + '%';
      }
    }

    // Schedule next frame only if result not shown
    if (!diceResultShown[diceId] && !animationStopped) {
      diceAnimationTimers[diceId] = requestAnimationFrame(animate);
    }
  };

  // Start animation
  diceAnimationTimers[diceId] = requestAnimationFrame(animate);
  console.log(`[GameV2] Started dice animation for ${diceId}`);
}

/**
 * Show dice result
 * @param {number} rollingPlayerIndex - Index of player who rolled
 * @param {number} diceValue - Dice value (0-5 where 0=1, 1=2, ..., 5=6)
 */
function showDiceResult(rollingPlayerIndex, diceValue) {
  const diceId = PLAYER_CONFIG[rollingPlayerIndex].diceId;

  console.log(`[GameV2] showDiceResult: playerIndex=${rollingPlayerIndex}, diceId=${diceId}, diceValue=${diceValue}`);

  // FIRST: Set the flag to stop any running animations immediately
  Object.keys(diceResultShown).forEach(id => {
    diceResultShown[id] = true;
  });

  // Cancel ALL dice animations using cancelAnimationFrame
  Object.keys(diceAnimationTimers).forEach(id => {
    if (diceAnimationTimers[id]) {
      cancelAnimationFrame(diceAnimationTimers[id]);
      console.log(`[GameV2] Cancelled animation for ${id}`);
      diceAnimationTimers[id] = null;
    }
  });

  // Position map for dice faces (2x3 grid with background-size: 200%)
  const pXpYarr = [
    [0, 0],     // diceValue 0 = shows 1
    [100, 0],   // diceValue 1 = shows 2
    [0, 50],    // diceValue 2 = shows 3
    [100, 50],  // diceValue 3 = shows 4
    [0, 100],   // diceValue 4 = shows 5
    [100, 100]  // diceValue 5 = shows 6
  ];

  const [pX, pY] = pXpYarr[diceValue];

  // Get the raw DOM element
  const diceElement = $(diceId)[0];

  if (!diceElement) {
    console.error(`[GameV2] Dice element not found: ${diceId}`);
    return;
  }

  // IMMEDIATELY remove all dice state classes using both jQuery and native
  $(diceId).removeClass('startDiceRoll rollDice showDice');
  diceElement.classList.remove('startDiceRoll', 'rollDice', 'showDice');

  // Clear ALL inline background styles first (both camelCase and kebab-case)
  diceElement.style.backgroundImage = '';
  diceElement.style.backgroundSize = '';
  diceElement.style.backgroundRepeat = '';
  diceElement.style.backgroundPositionX = '';
  diceElement.style.backgroundPositionY = '';

  // Force a browser reflow to ensure styles are cleared
  void diceElement.offsetHeight;

  // Now set the correct styles with !important
  diceElement.style.setProperty('background-image', 'url(/images/dice.png)', 'important');
  diceElement.style.setProperty('background-size', '200%', 'important');
  diceElement.style.setProperty('background-repeat', 'no-repeat', 'important');
  diceElement.style.setProperty('background-position-x', pX + '%', 'important');
  diceElement.style.setProperty('background-position-y', pY + '%', 'important');

  // Add showDice class for any other styling
  diceElement.classList.add('showDice');

  console.log(`[GameV2] Set dice ${diceId} to show value ${diceValue + 1} at position: pX=${pX}%, pY=${pY}%`);
  console.log(`[GameV2] Dice classes after: ${diceElement.className}`);
  console.log(`[GameV2] Dice style.backgroundImage: ${diceElement.style.backgroundImage}`);
}

/**
 * Animate token movement
 * @param {Object} move - Move object with path
 * @param {Function} callback - Callback when animation completes
 */
function animateMove(move, callback) {
  const tokenId = move.tokenId;
  const color = tokenId.charAt(0);
  const pawnNum = tokenId.match(/\d+/)[0];
  const className = `${color}-pawn${pawnNum}`;
  const path = move.path || [];

  if (path.length === 0) {
    // No animation needed (opening from home)
    if (move.isOpen && sound) {
      openAudio.play();
    }
    if (callback) callback();
    return;
  }

  let stepIndex = 0;

  const animateStep = () => {
    if (stepIndex >= path.length) {
      if (callback) callback();
      return;
    }

    const position = path[stepIndex];
    const targetId = position;

    // Remove from current position
    $(`.${className}`).remove();

    // Add to new position with absolute positioning (no size change)
    $(`#${targetId}`).css('position', 'relative').append(
      `<div class="${className}" style="position:absolute; left:0; top:0; z-index:20;"></div>`
    );

    if (sound) jumpAudio.play();

    stepIndex++;
    setTimeout(animateStep, 300);
  };

  animateStep();
}

/**
 * Animate token capture
 * @param {Object} capturedInfo - Capture info
 */
function animateCapture(capturedInfo) {
  const tokenId = capturedInfo.tokenId;
  const color = tokenId.charAt(0);
  const pawnNum = tokenId.match(/\d+/)[0];
  const className = `${color}-pawn${pawnNum}`;

  if (sound) cutAudio.play();

  // Remove from board
  $(`.${className}`).remove();

  // Add to home
  $(`#${capturedInfo.sentToHome}`).append(
    `<div class="${className}"></div>`
  );
}

// ============ UI Helpers ============

/**
 * Show a message to the player
 * @param {string} message - Message to show
 */
function showMessage(message) {
  // Remove existing message
  $('#game-message').remove();

  const messageDiv = $('<div>')
    .attr('id', 'game-message')
    .css({
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px 30px',
      borderRadius: '10px',
      fontSize: '18px',
      fontWeight: 'bold',
      zIndex: 10000,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    })
    .text(message);

  $('body').append(messageDiv);

  setTimeout(() => {
    $('#game-message').fadeOut(500, function() {
      $(this).remove();
    });
  }, 3000);
}

/**
 * Show win/lose message
 * @param {string} message - Message to show
 */
function showWinMessage(message) {
  // Remove existing message
  $('#win-message').remove();

  const overlay = $('<div>')
    .attr('id', 'win-message')
    .css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001
    });

  const content = $('<div>')
    .css({
      backgroundColor: '#fff',
      padding: '40px',
      borderRadius: '20px',
      textAlign: 'center'
    })
    .append($('<h1>').text(message))
    .append(
      $('<button>')
        .text('Back to Dashboard')
        .css({
          marginTop: '20px',
          padding: '10px 30px',
          fontSize: '18px',
          cursor: 'pointer'
        })
        .on('click', () => {
          window.location.href = '/dashboard';
        })
    );

  overlay.append(content);
  $('body').append(overlay);
}

/**
 * Toggle sound on/off
 */
function toggleSound() {
  sound = !sound;
  if (sound) {
    $('#sound').css('background-image', 'url(/images/sound-on.svg)');
  } else {
    $('#sound').css('background-image', 'url(/images/sound-off.svg)');
  }
}

// ============ Chat Functionality ============

// Initialize chat functionality for V2
function initializeChatV2(socket, tableIdParam, playerInfoParam) {
  console.log('Initializing chat for V2 game...');
  
  // Remove existing handlers to prevent duplicates
  $('#chat-toggle').off('click.chat');
  $('#chat-close').off('click.chat');
  $('.chat-quick-btn').off('click.chat');
  
  // Force visibility
  $('#chat-container').css({
    'display': 'block',
    'visibility': 'visible',
    'opacity': '1',
    'z-index': '10000'
  });
  $('#chat-toggle').css({
    'display': 'block',
    'visibility': 'visible',
    'opacity': '1'
  });
  
  // Chat toggle
  $('#chat-toggle').on('click.chat', function() {
    console.log('Chat toggle clicked');
    $('#chat-panel').toggleClass('active');
  });
  
  // Chat close button - use event delegation to ensure it works
  $(document).off('click.chat', '#chat-close').on('click.chat', '#chat-close', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Chat close clicked');
    $('#chat-panel').removeClass('active');
  });
  
  // Also attach directly if element exists
  if ($('#chat-close').length > 0) {
    $('#chat-close').off('click.chatDirect').on('click.chatDirect', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Chat close clicked (direct)');
      $('#chat-panel').removeClass('active');
    });
  }
  
  // Quick message buttons
  $('.chat-quick-btn').on('click.chat', function() {
    const message = $(this).data('message');
    console.log('💬 Chat button clicked:', message);
    if (message && socket && tableIdParam && playerInfoParam) {
      // Add message to sender's chat UI immediately (before sending)
      // This way sender sees it in chat panel but won't trigger notification
      addChatMessage(message, true);
      
      // Send chat message via socket with both playerNo and playerIndex
      // Make sure both are included so receiver can properly identify sender
      const chatData = {
        tableId: tableIdParam,
        gameId: gameId,
        playerNo: playerInfoParam.playerNo,
        playerIndex: playerInfoParam.index,
        message: message
      };
      
      console.log('📤 SENDER: Sending chat message:', chatData);
      console.log('📤 Sender info:', {
        playerNo: playerInfoParam.playerNo,
        playerIndex: playerInfoParam.index,
        color: playerInfoParam.color
      });
      
      socket.emit('game_chat_message', chatData);
      
      // Note: We don't show notification for sender - they already see it in chat panel
      // The receiver will get the socket event and show the notification
    } else {
      console.warn('⚠️ Cannot send chat: socket or playerInfo not ready', {
        hasSocket: !!socket,
        tableId: tableIdParam,
        playerInfo: playerInfoParam,
        hasMessage: !!message
      });
    }
  });
  
  console.log('Chat initialized for V2 game');
}

// Add chat message to UI
function addChatMessage(message, isOwn) {
  const chatMessages = $('#chat-messages');
  if (chatMessages.length === 0) {
    console.warn('Chat messages container not found');
    return;
  }
  
  const messageDiv = $('<div>')
    .addClass('chat-message')
    .addClass(isOwn ? 'own' : 'opponent')
    .text(message);
  
  chatMessages.append(messageDiv);
  chatMessages.scrollTop(chatMessages[0].scrollHeight);
  
  // Auto-remove after 10 seconds for opponent messages
  if (!isOwn) {
    setTimeout(() => {
      messageDiv.fadeOut(300, function() {
        $(this).remove();
      });
    }, 10000);
  }
}

// ============ Export for React ============
window.initializeGameV2 = initializeGameV2;
window.initializeChatV2 = initializeChatV2;
window.addChatMessage = addChatMessage;
window.LudoGameV2 = {
  initialize: initializeGameV2,
  getGameState: () => gameState,
  getPlayerIndex: () => playerIndex,
  isMyTurn: () => isMyTurn
};
