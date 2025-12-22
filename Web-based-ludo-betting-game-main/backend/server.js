import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { testConnection } from './config/supabase.js';
import morgan from 'morgan';
import { debitWallet, TRANSACTION_TYPES } from './services/walletService.js';

// Import game engine
import GameManager from './game/gameManager.js';
import { registerGameHandlers, initializeGame } from './game/handlers/gameHandlers.js';
import { PLAYER_CONFIG } from './game/utils/constants.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});


// Store io globally for game manager timer callbacks
global.io = io;

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Store active tables in memory (in production, use Redis or database)
const activeTables = new Map();
// Store timeout timers for tables
const tableTimeouts = new Map();
// Store matchmaking queues for default tables (key: tableAmount, value: array of players)
const matchmakingQueues = new Map();
// Store socket IDs mapped to user IDs for matchmaking
const socketToUser = new Map();
// Store user IDs mapped to socket IDs (reverse lookup)
const userToSocket = new Map();
// Store matching locks to prevent race conditions (key: tableAmount, value: boolean)
const matchingLocks = new Map();
// Store table socket readiness (tableId -> Set of ready userIds)
const tableSocketReady = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register game handlers for this socket
  registerGameHandlers(io, socket);

  // Join waiting room to receive table updates
  socket.on('join_waiting_room', () => {
    socket.join('waiting_room');
    // Send current active tables to the newly connected user
    const tablesArray = Array.from(activeTables.values());
    socket.emit('tables_update', tablesArray);
  });

  // Create a new custom table
  socket.on('create_table', async (tableData) => {
    console.log(`[create_table] Creating table for creator ${tableData.creatorId}, tableId: ${tableData.tableId}`);
    // Cancel any existing table by this creator
    for (const [existingTableId, existingTable] of activeTables.entries()) {
      console.log(`[create_table] Checking existing table ${existingTableId}: creatorId=${existingTable.creatorId}, status=${existingTable.status}`);
      if (existingTable.creatorId === tableData.creatorId && existingTable.status === 'waiting') {
        console.log(`[create_table] REMOVING existing waiting table ${existingTableId} by same creator`);
        // Clear timeout if exists
        if (tableTimeouts.has(existingTableId)) {
          clearTimeout(tableTimeouts.get(existingTableId));
          tableTimeouts.delete(existingTableId);
        }
        // Remove from active tables
        activeTables.delete(existingTableId);
        // Notify waiting room
        io.to('waiting_room').emit('table_removed', { tableId: existingTableId });
      }
    }

    // Use the tableId from the database if provided, otherwise generate one
    const tableId = tableData.tableId || `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const table = {
      id: tableId,
      creatorId: tableData.creatorId,
      creatorName: tableData.creatorName || 'Player',
      creatorMobile: tableData.creatorMobile || '',
      betAmount: tableData.betAmount,
      bet_amount: tableData.betAmount, // For compatibility
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      players: [tableData.creatorId],
      status: 'waiting'
    };

    activeTables.set(tableId, table);

    // Set 2-minute timeout to return balance if game doesn't start
    const timeout = setTimeout(async () => {
      const currentTable = activeTables.get(tableId);
      // Timeout applies to both 'waiting' (1 player) and 'ready' (2 players but game not started)
      if (currentTable && (currentTable.status === 'waiting' || currentTable.status === 'ready')) {
        console.log(`[timeout] Table ${tableId} timed out (status: ${currentTable.status}, players: ${currentTable.players.length})`);

        // Return balance to all players in the table
        try {
          const { supabase } = await import('./config/supabase.js');

          for (const playerId of currentTable.players) {
            const { data: userData } = await supabase
              .from('users')
              .select('balance')
              .eq('id', playerId)
              .single();

            if (userData) {
              const newBalance = (userData.balance || 0) + currentTable.betAmount;
              await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', playerId);
              console.log(`[timeout] Refunded ${currentTable.betAmount} to player ${playerId}`);
            }
          }

          // Remove table
          console.log(`[timeout] Table ${tableId} timed out, emitting table_removed`);
          activeTables.delete(tableId);
          tableSocketReady.delete(tableId); // Clean up socket readiness tracking
          await supabase.from('tables').delete().eq('id', tableId);
          io.to('waiting_room').emit('table_removed', { tableId });
          io.to(`table_${tableId}`).emit('table_timeout', { tableId, message: 'Table timed out after 2 minutes. Your balance has been refunded.' });
        } catch (err) {
          console.error('Error returning balance on timeout:', err);
        }
      }
      tableTimeouts.delete(tableId);
    }, 2 * 60 * 1000); // 2 minutes

    tableTimeouts.set(tableId, timeout);

    // Join creator to the table room and set socket-user mapping
    socket.join(`table_${tableId}`);
    socketToUser.set(socket.id, tableData.creatorId);
    userToSocket.set(tableData.creatorId, socket.id);

    // Initialize socket readiness tracking for this table
    if (!tableSocketReady.has(tableId)) {
      tableSocketReady.set(tableId, new Set());
    }
    tableSocketReady.get(tableId).add(tableData.creatorId);

    console.log(`Creator ${tableData.creatorId} joined table room: table_${tableId}, socket: ${socket.id}`);

    // Notify all users in waiting room
    io.to('waiting_room').emit('table_created', table);

    // Confirm to creator
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    socket.emit('table_created_success', { table, tableLink: `${frontendUrl}/table/${tableId}` });
  });

  // Join a specific table
  socket.on('join_table', async ({ tableId, userId }) => {
    console.log(`[join_table] User ${userId} (socket ${socket.id}) joining table ${tableId}`);

    let table = activeTables.get(tableId);

    // If table not in memory, try to load from database
    if (!table) {
      try {
        const { supabase } = await import('./config/supabase.js');
        const { data: dbTable, error } = await supabase
          .from('tables')
          .select('*')
          .eq('id', tableId)
          .single();

        if (!error && dbTable) {
          // Load table into memory
          table = {
            id: dbTable.id,
            creatorId: dbTable.creator_id,
            creatorName: dbTable.creator_name || 'Player',
            creatorMobile: dbTable.creator_mobile || '',
            betAmount: dbTable.bet_amount,
            bet_amount: dbTable.bet_amount,
            createdAt: dbTable.created_at,
            created_at: dbTable.created_at,
            players: dbTable.players || [],
            status: dbTable.status || 'waiting'
          };
          activeTables.set(tableId, table);
          console.log(`[join_table] Loaded table ${tableId} from database into memory`);
        }
      } catch (err) {
        console.error('[join_table] Error loading table from database:', err);
      }
    }

    if (!table) {
      console.log(`[join_table] Table ${tableId} not found`);
      socket.emit('join_error', { message: 'Table not found' });
      return;
    }

    // CRITICAL: Always update socket mappings when joining
    // Remove old socket mapping for this user if exists
    const oldSocketId = userToSocket.get(userId);
    if (oldSocketId && oldSocketId !== socket.id) {
      socketToUser.delete(oldSocketId);
      console.log(`[join_table] Removed old socket mapping: ${oldSocketId} for user ${userId}`);
    }

    // Set new socket mappings
    socketToUser.set(socket.id, userId);
    userToSocket.set(userId, socket.id);

    // Join the socket room for game events
    socket.join(`table_${tableId}`);

    // Track socket readiness for this table
    if (!tableSocketReady.has(tableId)) {
      tableSocketReady.set(tableId, new Set());
    }
    tableSocketReady.get(tableId).add(userId);

    console.log(`[join_table] Socket mappings set: socket ${socket.id} -> user ${userId}`);
    console.log(`[join_table] Socket joined room: table_${tableId}`);
    console.log(`[join_table] Table ${tableId}: status=${table.status}, players=${JSON.stringify(table.players)}`);

    // Sync players from database if needed
    try {
      const { supabase } = await import('./config/supabase.js');
      const { data: dbTable } = await supabase
        .from('tables')
        .select('players, status')
        .eq('id', tableId)
        .single();

      if (dbTable) {
        table.players = dbTable.players || table.players;
        // Only update status if not active (preserve game state)
        if (table.status !== 'active') {
          table.status = dbTable.status || table.status;
        }
        activeTables.set(tableId, table);
      }
    } catch (err) {
      console.error('[join_table] Error syncing table from database:', err);
    }

    // Determine what to do based on table status and player status
    const isPlayerInTable = table.players.includes(userId);

    if (table.status === 'active') {
      // Handle rejoining an active game
      if (!isPlayerInTable) {
        console.log(`[join_table] User ${userId} is not a player in active table ${tableId}`);
        socket.emit('join_error', { message: 'You are not a player in this game' });
        return;
      }

      socket.emit('table_joined', { table, userId });

      // Check if there's an active game for this table
      const game = GameManager.getGameByTableId(tableId);
      console.log(`[join_table] Found game for table ${tableId}:`, game ? game.gameId : 'NO GAME FOUND');

      if (game) {
        const reconnectResult = GameManager.handleReconnect(game.gameId, userId, socket.id);
        console.log(`[join_table] Reconnect result for ${userId}:`, reconnectResult.success ? 'SUCCESS' : `FAILED: ${reconnectResult.error}`);

        if (reconnectResult.success) {
          socket.join(`game_${game.gameId}`);

          const playerIdx = reconnectResult.playerIndex;
          const opponentIdx = playerIdx === 0 ? 1 : 0;
          const gamePlayers = game.players || [];
          const opponentName = gamePlayers[opponentIdx]?.name || 'Opponent';

          const initData = {
            gameId: game.gameId,
            tableId: tableId,
            playerIndex: playerIdx,
            color: PLAYER_CONFIG[playerIdx].color,
            playerNo: PLAYER_CONFIG[playerIdx].playerNo,
            opponentName: opponentName,
            gameState: reconnectResult.gameState
          };

          console.log(`[join_table] Sending game_initialized to player ${userId}`);
          socket.emit('game_initialized', initData);
        } else {
          const gameState = GameManager.getGameState(game.gameId, socket.id);
          if (gameState) {
            socket.emit('game_state_update', { gameId: game.gameId, gameState });
          }
        }
      }
      return;
    }

    // Table is waiting or ready
    if (isPlayerInTable) {
      // Player is already in table (creator or already joined via API)
      console.log(`[join_table] Player ${userId} already in table ${tableId} (status: ${table.status})`);
      socket.emit('table_joined', { table, userId });

      // Check if table should be ready (has 2 players)
      if (table.players.length >= 2 && table.status !== 'ready') {
        table.status = 'ready';
        activeTables.set(tableId, table);

        try {
          const { supabase } = await import('./config/supabase.js');
          await supabase.from('tables').update({ status: 'ready' }).eq('id', tableId);
        } catch (err) {
          console.error('[join_table] Error updating table status:', err);
        }
      }

      if (table.status === 'ready') {
        io.to('waiting_room').emit('table_updated', table);
        io.to(`table_${tableId}`).emit('table_ready', table);
      }

      // Check socket readiness
      await checkAndEmitAllPlayersReady(tableId, table);
    } else if (table.status === 'waiting' && table.players.length < 2) {
      // New player joining - but they should have joined via API first
      // This is a socket-only join, they may not have paid yet
      console.log(`[join_table] New player ${userId} joining via socket only - should use API first`);
      socket.emit('join_error', { message: 'Please join the table through the lobby first' });
    } else {
      console.log(`[join_table] Cannot join - table status: ${table.status}, players: ${table.players.length}`);
      socket.emit('join_error', { message: 'Table is not accepting players' });
    }
  });

  // Helper function to check if all players are ready and emit event
  async function checkAndEmitAllPlayersReady(tableId, table) {
    if (!table || table.players.length < 2) return;

    const socketsInRoom = await io.in(`table_${tableId}`).fetchSockets();
    const readySet = tableSocketReady.get(tableId) || new Set();

    console.log(`[checkAllPlayersReady] Table ${tableId}: ${socketsInRoom.length} sockets in room, ${readySet.size} users ready`);
    console.log(`[checkAllPlayersReady] Ready users: ${Array.from(readySet).join(', ')}`);
    console.log(`[checkAllPlayersReady] Table players: ${table.players.join(', ')}`);

    // Check if all table players have sockets ready
    const allPlayersReady = table.players.every(playerId => readySet.has(playerId));

    if (allPlayersReady && socketsInRoom.length >= 2) {
      console.log(`[checkAllPlayersReady] All players ready, emitting all_players_ready`);
      io.to(`table_${tableId}`).emit('all_players_ready', { tableId, table });
    }
  }

  // Leave waiting room
  socket.on('leave_waiting_room', () => {
    socket.leave('waiting_room');
  });

  // Request game state (for when client reconnects or misses game_initialized)
  socket.on('request_game_state', async ({ tableId, userId }) => {
    console.log(`[request_game_state] User ${userId} requesting game state for table ${tableId}`);

    const table = activeTables.get(tableId);
    if (!table) {
      console.log(`[request_game_state] Table ${tableId} not found`);
      socket.emit('game_state_error', { message: 'Table not found' });
      return;
    }

    // Check if user is a player in this table
    if (!table.players.includes(userId)) {
      console.log(`[request_game_state] User ${userId} is not a player in table ${tableId}`);
      socket.emit('game_state_error', { message: 'You are not a player in this game' });
      return;
    }

    // Find the game for this table
    const game = GameManager.getGameByTableId(tableId);
    if (!game) {
      console.log(`[request_game_state] No game found for table ${tableId}`);
      socket.emit('game_state_error', { message: 'Game not found' });
      return;
    }

    // Update socket mapping
    socketToUser.set(socket.id, userId);

    // Join the table room
    socket.join(`table_${tableId}`);
    socket.join(`game_${game.gameId}`);

    // Get player index
    const playerIndex = table.players.indexOf(userId);
    const opponentIndex = playerIndex === 0 ? 1 : 0;

    // Try to reconnect to the game
    const reconnectResult = GameManager.handleReconnect(game.gameId, userId, socket.id);
    console.log(`[request_game_state] Reconnect result for ${userId}:`, reconnectResult.success ? 'SUCCESS' : `FAILED: ${reconnectResult.error}`);

    const gameState = reconnectResult.success ? reconnectResult.gameState : GameManager.getGameState(game.gameId, socket.id);

    // Get opponent name
    const opponentName = playerIndex === 0 ? 'Player 2' : table.creatorName;

    const initData = {
      gameId: game.gameId,
      tableId: tableId,
      playerIndex: playerIndex,
      color: PLAYER_CONFIG[playerIndex].color,
      playerNo: PLAYER_CONFIG[playerIndex].playerNo,
      opponentName: opponentName,
      gameState: gameState
    };

    console.log(`[request_game_state] Sending game_initialized to player ${userId}:`, {
      gameId: initData.gameId,
      playerIndex: initData.playerIndex,
      color: initData.color
    });

    socket.emit('game_initialized', initData);
  });

  // Get table by ID (for link sharing)
  socket.on('get_table', (tableId) => {
    const table = activeTables.get(tableId);
    if (table) {
      socket.emit('table_data', table);
    } else {
      socket.emit('table_not_found', { tableId });
    }
  });

  // Start game (when table is full)
  socket.on('start_game', async ({ tableId }) => {
    console.log(`[start_game] Received start_game for table ${tableId} from socket ${socket.id}`);
    let table = activeTables.get(tableId);

    // If table not in memory, try to load from database
    if (!table) {
      console.log(`[start_game] Table ${tableId} not in memory, loading from database`);
      try {
        const { supabase } = await import('./config/supabase.js');
        const { data: dbTable, error } = await supabase
          .from('tables')
          .select('*')
          .eq('id', tableId)
          .single();

        if (!error && dbTable) {
          table = {
            id: dbTable.id,
            creatorId: dbTable.creator_id,
            creatorName: dbTable.creator_name || 'Player',
            creatorMobile: dbTable.creator_mobile || '',
            betAmount: dbTable.bet_amount,
            bet_amount: dbTable.bet_amount,
            createdAt: dbTable.created_at,
            created_at: dbTable.created_at,
            players: dbTable.players || [],
            status: dbTable.status || 'waiting'
          };
          activeTables.set(tableId, table);
          console.log(`[start_game] Loaded table from database: players=${JSON.stringify(table.players)}, status=${table.status}`);
        }
      } catch (err) {
        console.error('[start_game] Error loading table from database:', err);
      }
    }

    if (!table) {
      console.log(`[start_game] Table ${tableId} not found`);
      socket.emit('start_game_error', { tableId, message: 'Table not found' });
      return;
    }

    // Prevent starting an already active game
    if (table.status === 'active') {
      console.log(`[start_game] Table ${tableId} already active`);
      socket.emit('start_game_error', { tableId, message: 'Game already started' });
      return;
    }

    if (table.players.length < 2) {
      console.log(`[start_game] Not enough players in table ${tableId}: ${table.players.length}`);
      socket.emit('start_game_error', { tableId, message: 'Waiting for another player to join' });
      return;
    }

    console.log(`[start_game] Table ${tableId}: players=${JSON.stringify(table.players)}, status=${table.status}`);

    // Clear timeout if exists
    if (tableTimeouts.has(tableId)) {
      clearTimeout(tableTimeouts.get(tableId));
      tableTimeouts.delete(tableId);
    }

    // Use userToSocket mapping to find player sockets (more reliable than room search)
    const player0SocketId = userToSocket.get(table.players[0]);
    const player1SocketId = userToSocket.get(table.players[1]);

    console.log(`[start_game] userToSocket lookup: player0=${table.players[0]} -> ${player0SocketId}, player1=${table.players[1]} -> ${player1SocketId}`);

    // Get actual socket objects
    const player0Socket = player0SocketId ? io.sockets.sockets.get(player0SocketId) : null;
    const player1Socket = player1SocketId ? io.sockets.sockets.get(player1SocketId) : null;

    console.log(`[start_game] Socket objects: player0=${!!player0Socket}, player1=${!!player1Socket}`);

    // Fallback: Also check the room
    const socketsInRoom = await io.in(`table_${tableId}`).fetchSockets();
    console.log(`[start_game] Found ${socketsInRoom.length} sockets in room table_${tableId}`);
    socketsInRoom.forEach((s, i) => {
      const userId = socketToUser.get(s.id);
      console.log(`[start_game] Room socket ${i}: ${s.id} -> userId: ${userId}`);
    });

    // Try to find sockets from room if direct lookup failed
    const finalPlayer0Socket = player0Socket || socketsInRoom.find(s => socketToUser.get(s.id) === table.players[0]);
    const finalPlayer1Socket = player1Socket || socketsInRoom.find(s => socketToUser.get(s.id) === table.players[1]);

    if (!finalPlayer0Socket || !finalPlayer1Socket) {
      console.log(`[start_game] Could not find sockets for both players`);
      console.log(`[start_game] Player 0 (${table.players[0]}): socket found = ${!!finalPlayer0Socket}`);
      console.log(`[start_game] Player 1 (${table.players[1]}): socket found = ${!!finalPlayer1Socket}`);

      socket.emit('start_game_error', {
        tableId,
        message: 'Not all players are connected. Please wait for both players to be ready.'
      });
      return;
    }

    // Mark table as active BEFORE initializing game to prevent double-start
    table.status = 'active';
    activeTables.set(tableId, table);

    // Update database
    try {
      const { supabase } = await import('./config/supabase.js');
      await supabase.from('tables').update({ status: 'active' }).eq('id', tableId);
    } catch (err) {
      console.error('[start_game] Error updating table status:', err);
    }

    // Prepare player data for game initialization
    const players = table.players.map((odId, index) => {
      const playerSocket = index === 0 ? finalPlayer0Socket : finalPlayer1Socket;
      return {
        userId: odId,
        socketId: playerSocket?.id,
        userName: index === 0 ? table.creatorName : 'Player 2'
      };
    });

    console.log(`[start_game] Initializing game with players:`, players.map(p => ({ odId: p.userId, socketId: p.socketId })));

    // Initialize the server-authoritative game with sockets in correct order
    const { gameId, gameState } = initializeGame(
      io,
      finalPlayer0Socket,  // Creator's socket (player index 0)
      finalPlayer1Socket,  // Joiner's socket (player index 1)
      tableId,
      players,
      table.betAmount
    );

    // Store game ID in table
    table.gameId = gameId;

    console.log(`[start_game] Game ${gameId} started for table ${tableId}`);

    // Emit game_started to table room
    io.to(`table_${tableId}`).emit('game_started', table);

    // Remove table from waiting room now that game has started
    io.to('waiting_room').emit('table_removed', { tableId });

    // Clean up socket readiness tracking for this table
    tableSocketReady.delete(tableId);
  });

  // ============ Legacy Game Events (for backward compatibility during transition) ============
  // These will be gradually phased out as frontend is updated

  // Game turn change event (legacy - now handled by server)
  socket.on('game_turn_change', ({ tableId, playerNo, playerName }) => {
    console.log(`[LEGACY] Turn change: Player ${playerNo} for table ${tableId}`);
    // Still broadcast for legacy clients
    io.to(`table_${tableId}`).emit('game_turn_change', {
      tableId,
      playerNo,
      playerName
    });
  });

  // Game dice roll event (legacy - now server generates dice)
  socket.on('game_dice_roll', ({ tableId, playerNo }) => {
    console.log(`[LEGACY] Dice roll: Player ${playerNo} for table ${tableId}`);
    io.to(`table_${tableId}`).emit('game_dice_roll', {
      tableId,
      playerNo
    });
  });

  // Game dice result event (legacy - dice now generated on server)
  socket.on('game_dice_result', ({ tableId, playerNo, diceValue, diceBoxId }) => {
    console.log(`[LEGACY] Dice result: Player ${playerNo} rolled ${diceValue} for table ${tableId}`);
    io.to(`table_${tableId}`).emit('game_dice_result', {
      tableId,
      playerNo,
      diceValue,
      diceBoxId
    });
  });

  // Game chat message event (works for both legacy and V2 games)
  socket.on('game_chat_message', ({ tableId, gameId, playerNo, playerIndex, message }) => {
    console.log(`[CHAT] Chat message: Player ${playerNo || playerIndex} (index: ${playerIndex}) sent "${message}" for table ${tableId || 'N/A'} game ${gameId || 'N/A'}`);

    const chatData = {
      tableId: tableId || null,
      gameId: gameId || null,
      playerNo: playerNo || null,
      playerIndex: playerIndex !== undefined ? playerIndex : null,
      message: message
    };

    // Broadcast to table room (legacy games)
    if (tableId) {
      console.log(`[CHAT] Broadcasting to table_${tableId}`);
      io.to(`table_${tableId}`).emit('game_chat_message', chatData);
    }

    // Broadcast to game room (V2 games) - includes both playerNo and playerIndex
    if (gameId) {
      console.log(`[CHAT] Broadcasting to game_${gameId}`);
      io.to(`game_${gameId}`).emit('game_chat_message', chatData);
    }

    // If both are present, broadcast to both (some games might use both)
    if (tableId && gameId) {
      console.log(`[CHAT] Message has both tableId and gameId, broadcasting to both rooms`);
    }
  });

  // Game pawn open event (legacy)
  socket.on('game_pawn_open', ({ tableId, playerNo, playerName, pawnClass, startPoint, width, height }) => {
    console.log(`[LEGACY] Pawn open: Player ${playerNo} opened ${pawnClass} for table ${tableId}`);
    io.to(`table_${tableId}`).emit('game_pawn_open', {
      tableId,
      playerNo,
      playerName,
      pawnClass,
      startPoint,
      width,
      height
    });
  });

  // Game pawn move event (legacy)
  socket.on('game_pawn_move', ({ tableId, playerNo, playerName, pawnClass, newPosition, oldPosition, moveType }) => {
    console.log(`[LEGACY] Pawn move: Player ${playerNo} moved ${pawnClass} from ${oldPosition} to ${newPosition} for table ${tableId}`);
    io.to(`table_${tableId}`).emit('game_pawn_move', {
      tableId,
      playerNo,
      playerName,
      pawnClass,
      newPosition,
      oldPosition,
      moveType
    });
  });

  // ============ End Legacy Events ============

  // Cancel table
  socket.on('cancel_table', async ({ tableId, userId }) => {
    const table = activeTables.get(tableId);
    if (table && table.creatorId === userId && table.status === 'waiting') {
      // Clear timeout
      if (tableTimeouts.has(tableId)) {
        clearTimeout(tableTimeouts.get(tableId));
        tableTimeouts.delete(tableId);
      }

      // Return balance if only creator is in table
      if (table.players.length === 1) {
        try {
          const { supabase } = await import('./config/supabase.js');
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

          if (userData) {
            const newBalance = (userData.balance || 0) + table.betAmount;
            await supabase
              .from('users')
              .update({ balance: newBalance })
              .eq('id', userId);
          }
        } catch (err) {
          console.error('Error returning balance on cancel:', err);
        }
      }

      // Remove table
      activeTables.delete(tableId);
      tableSocketReady.delete(tableId); // Clean up socket readiness tracking
      try {
        const { supabase } = await import('./config/supabase.js');
        await supabase.from('tables').delete().eq('id', tableId);
      } catch (err) {
        console.error('Error deleting table:', err);
      }

      console.log(`[cancel_table] Table ${tableId} cancelled, emitting table_removed`);
      io.to('waiting_room').emit('table_removed', { tableId });
      io.to(`table_${tableId}`).emit('table_cancelled', { tableId });
    }
  });

  // Remove table when game ends or creator leaves
  socket.on('remove_table', ({ tableId }) => {
    console.log(`[remove_table] Table ${tableId} being removed, emitting table_removed`);
    // Clear timeout if exists
    if (tableTimeouts.has(tableId)) {
      clearTimeout(tableTimeouts.get(tableId));
      tableTimeouts.delete(tableId);
    }
    activeTables.delete(tableId);
    io.to('waiting_room').emit('table_removed', { tableId });
  });

  // Matchmaking for default tables
  socket.on('search_match', async ({ userId, tableAmount, userName, userMobile }) => {
    try {
      // Store socket to user mapping
      socketToUser.set(socket.id, userId);

      // Get or create queue for this table amount
      if (!matchmakingQueues.has(tableAmount)) {
        matchmakingQueues.set(tableAmount, []);
      }

      const queue = matchmakingQueues.get(tableAmount);

      // Check if user is already in queue
      const existingIndex = queue.findIndex(p => p.userId === userId);
      if (existingIndex !== -1) {
        // User already searching, just confirm
        socket.emit('search_started', { tableAmount, position: queue.length });
        return;
      }

      // Add player to queue
      const player = {
        userId,
        userName: userName || 'Player',
        userMobile: userMobile || '',
        socketId: socket.id,
        tableAmount,
        joinedAt: new Date().toISOString()
      };

      queue.push(player);
      matchmakingQueues.set(tableAmount, queue);

      console.log(`Player ${userId} searching for table ${tableAmount}. Queue size: ${queue.length}`);

      // Notify player they're in queue
      socket.emit('search_started', { tableAmount, position: queue.length });

      // Check if we can match players
      setTimeout(async () => {
        const currentQueue = matchmakingQueues.get(tableAmount);
        if (!currentQueue) return;

        const queueLength = currentQueue.length;
        const isLocked = matchingLocks.get(tableAmount);

        console.log(`Checking match for table ${tableAmount}: queue length=${queueLength}, locked=${isLocked}`);

        if (queueLength >= 2 && !isLocked) {
          matchingLocks.set(tableAmount, true);
          console.log(`Attempting to match players for table ${tableAmount}, queue size: ${queueLength}`);
          try {
            await matchPlayers(tableAmount, currentQueue);
          } catch (matchError) {
            console.error('Error in matchPlayers:', matchError);
            matchingLocks.delete(tableAmount);
          }
        }
      }, 0);
    } catch (error) {
      console.error('Error in search_match:', error);
      socket.emit('search_error', { message: 'Failed to start search' });
    }
  });

  // Cancel matchmaking search
  socket.on('cancel_search', ({ userId, tableAmount }) => {
    if (matchmakingQueues.has(tableAmount)) {
      const queue = matchmakingQueues.get(tableAmount);
      const index = queue.findIndex(p => p.userId === userId);
      if (index !== -1) {
        queue.splice(index, 1);
        if (queue.length === 0) {
          matchmakingQueues.delete(tableAmount);
        } else {
          matchmakingQueues.set(tableAmount, queue);
        }
        socket.emit('search_cancelled', { tableAmount });
        console.log(`Player ${userId} cancelled search for table ${tableAmount}`);
      }
    }
  });

  // Helper function to match players and create game
  async function matchPlayers(tableAmount, queue) {
    if (!queue || queue.length < 2) {
      console.log(`Cannot match: queue has < 2 players for table ${tableAmount}`);
      matchingLocks.delete(tableAmount);
      return;
    }

    const player1 = queue.shift();
    const player2 = queue.shift();

    if (!player1 || !player2) {
      console.error(`Failed to get both players for table ${tableAmount}`);
      if (player1) queue.unshift(player1);
      if (player2) queue.unshift(player2);
      matchingLocks.delete(tableAmount);
      return;
    }

    console.log(`Matching players: ${player1.userId} and ${player2.userId} for table ${tableAmount}`);

    if (queue.length === 0) {
      matchmakingQueues.delete(tableAmount);
    } else {
      matchmakingQueues.set(tableAmount, queue);
    }

    try {
      const { supabase } = await import('./config/supabase.js');

      // Check balances
      const [user1Data, user2Data] = await Promise.all([
        supabase.from('users').select('balance').eq('id', player1.userId).single(),
        supabase.from('users').select('balance').eq('id', player2.userId).single()
      ]);

      if (user1Data.error || !user1Data.data || user1Data.data.balance < tableAmount) {
        queue.unshift(player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId).emit('match_error', { message: 'Insufficient balance' });
        return;
      }

      if (user2Data.error || !user2Data.data || user2Data.data.balance < tableAmount) {
        queue.unshift(player1);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player2.socketId).emit('match_error', { message: 'Insufficient balance' });
        return;
      }

      // Check sockets
      const socket1 = io.sockets.sockets.get(player1.socketId);
      const socket2 = io.sockets.sockets.get(player2.socketId);

      if (!socket1 || !socket2) {
        console.error(`One or both sockets not found: ${player1.socketId}, ${player2.socketId}`);
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        return;
      }

      // Create table in database
      const tableId = `default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .insert({
          id: tableId,
          creator_id: player1.userId,
          bet_amount: tableAmount,
          status: 'waiting',
          players: [player1.userId, player2.userId],
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tableError) {
        console.error('Error creating table:', tableError);
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId).emit('match_error', { message: 'Failed to create game' });
        io.to(player2.socketId).emit('match_error', { message: 'Failed to create game' });
        return;
      }

      // Deduct balances using wallet service (atomic with transaction logging)
      const [debitResult1, debitResult2] = await Promise.all([
        debitWallet(
          player1.userId,
          tableAmount,
          TRANSACTION_TYPES.GAME_BET,
          tableId,
          {
            game_type: 'default_table',
            table_id: tableId,
            opponent_id: player2.userId
          }
        ),
        debitWallet(
          player2.userId,
          tableAmount,
          TRANSACTION_TYPES.GAME_BET,
          tableId,
          {
            game_type: 'default_table',
            table_id: tableId,
            opponent_id: player1.userId
          }
        )
      ]);

      if (!debitResult1.success || !debitResult2.success) {
        console.error('[Matchmaking] Error deducting balance:', debitResult1.error || debitResult2.error);
        await supabase.from('tables').delete().eq('id', tableId);
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);

        // Notify players
        io.to(player1.socketId).emit('match_error', { message: 'Failed to deduct balance' });
        io.to(player2.socketId).emit('match_error', { message: 'Failed to deduct balance' });
        return;
      }

      // Emit wallet updates
      io.to(`user_${player1.userId}`).emit('wallet_updated', {
        balance: debitResult1.newBalance,
        amount: -tableAmount,
        type: 'debit',
        reason: 'game_bet',
        tableId: tableId
      });

      io.to(`user_${player2.userId}`).emit('wallet_updated', {
        balance: debitResult2.newBalance,
        amount: -tableAmount,
        type: 'debit',
        reason: 'game_bet',
        tableId: tableId
      });

      // Update table status
      await supabase.from('tables').update({ status: 'active' }).eq('id', tableId);

      // Create active table object
      const table = {
        id: tableId,
        creatorId: player1.userId,
        creatorName: player1.userName,
        creatorMobile: player1.userMobile,
        betAmount: tableAmount,
        bet_amount: tableAmount,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        players: [player1.userId, player2.userId],
        status: 'active',
        isDefault: true
      };

      activeTables.set(tableId, table);

      // Join both players to table room
      socket1.join(`table_${tableId}`);
      socket2.join(`table_${tableId}`);

      // Notify both players that match is found
      socket1.emit('match_found', { table, opponent: player2 });
      socket2.emit('match_found', { table, opponent: player1 });

      // Initialize the server-authoritative game
      const players = [
        {
          userId: player1.userId,
          socketId: player1.socketId,
          userName: player1.userName
        },
        {
          userId: player2.userId,
          socketId: player2.socketId,
          userName: player2.userName
        }
      ];

      // Start game after a short delay
      setTimeout(() => {
        const { gameId, gameState } = initializeGame(
          io,
          socket1,
          socket2,
          tableId,
          players,
          tableAmount
        );

        table.gameId = gameId;

        socket1.emit('game_started', table);
        socket2.emit('game_started', table);
        io.to(`table_${tableId}`).emit('game_started', table);
        console.log(`Game started: ${gameId} for table ${tableId}`);
      }, 500);

      console.log(`Match created: Table ${tableId} with players ${player1.userId} and ${player2.userId}`);
      matchingLocks.delete(tableAmount);
    } catch (error) {
      console.error('Error matching players:', error);

      // Refund on error
      try {
        const { supabase } = await import('./config/supabase.js');
        const [user1Data, user2Data] = await Promise.all([
          supabase.from('users').select('balance').eq('id', player1.userId).single(),
          supabase.from('users').select('balance').eq('id', player2.userId).single()
        ]);

        if (user1Data.data) {
          await supabase.from('users').update({ balance: (user1Data.data.balance || 0) + tableAmount }).eq('id', player1.userId);
        }
        if (user2Data.data) {
          await supabase.from('users').update({ balance: (user2Data.data.balance || 0) + tableAmount }).eq('id', player2.userId);
        }
      } catch (refundError) {
        console.error('Error refunding balance:', refundError);
      }

      queue.unshift(player1, player2);
      matchmakingQueues.set(tableAmount, queue);
      matchingLocks.delete(tableAmount);
      io.to(player1.socketId).emit('match_error', { message: 'Failed to create match. Balance refunded.' });
      io.to(player2.socketId).emit('match_error', { message: 'Failed to create match. Balance refunded.' });
    }
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Handle game disconnection (managed by game handlers)
    // The registerGameHandlers already sets up disconnect handling

    // Remove from matchmaking queues and clean up mappings
    const userId = socketToUser.get(socket.id);
    if (userId) {
      // Remove from matchmaking queues
      for (const [tableAmount, queue] of matchmakingQueues.entries()) {
        const index = queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
          queue.splice(index, 1);
          if (queue.length === 0) {
            matchmakingQueues.delete(tableAmount);
          } else {
            matchmakingQueues.set(tableAmount, queue);
          }
          console.log(`Removed player ${userId} from queue for table ${tableAmount} due to disconnect`);
        }
      }

      // Clean up socket mappings
      socketToUser.delete(socket.id);
      // Only remove userToSocket if it points to this socket (could have been updated by reconnect)
      if (userToSocket.get(userId) === socket.id) {
        userToSocket.delete(userId);
      }

      // Remove from table socket readiness
      for (const [tableId, readySet] of tableSocketReady.entries()) {
        if (readySet.has(userId)) {
          readySet.delete(userId);
          console.log(`Removed user ${userId} from socket readiness for table ${tableId}`);
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Cleanup stale tables from database
async function cleanupStaleTables() {
  try {
    const { supabase } = await import('./config/supabase.js');
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    console.log('[Cleanup] Starting stale table cleanup...');

    // Get all tables that are waiting, ready, or active but older than 2 minutes
    const { data: staleTables, error: fetchError } = await supabase
      .from('tables')
      .select('*')
      .or(`status.eq.waiting,status.eq.ready,status.eq.active`)
      .lt('created_at', twoMinutesAgo);

    if (fetchError) {
      console.error('[Cleanup] Error fetching stale tables:', fetchError);
      return;
    }

    if (!staleTables || staleTables.length === 0) {
      console.log('[Cleanup] No stale tables found');
      return;
    }

    console.log(`[Cleanup] Found ${staleTables.length} stale tables to clean up`);

    // Refund players and delete tables
    for (const table of staleTables) {
      console.log(`[Cleanup] Processing table ${table.id} (status: ${table.status}, players: ${table.players?.length || 0})`);

      // Refund all players in the table
      if (table.players && table.players.length > 0) {
        for (const playerId of table.players) {
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', playerId)
            .single();

          if (userData) {
            const newBalance = (userData.balance || 0) + table.bet_amount;
            await supabase
              .from('users')
              .update({ balance: newBalance })
              .eq('id', playerId);
            console.log(`[Cleanup] Refunded ${table.bet_amount} to player ${playerId}`);
          }
        }
      }

      // Delete the table
      const { error: deleteError } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id);

      if (deleteError) {
        console.error(`[Cleanup] Error deleting table ${table.id}:`, deleteError);
      } else {
        console.log(`[Cleanup] Deleted table ${table.id}`);
      }
    }

    console.log('[Cleanup] Stale table cleanup completed');
  } catch (err) {
    console.error('[Cleanup] Error during stale table cleanup:', err);
  }
}

// Start server and test database connection
httpServer.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Testing Supabase connection...');
  await testConnection();

  // Clean up stale tables on startup
  await cleanupStaleTables();

  // Run cleanup every 5 minutes
  setInterval(cleanupStaleTables, 5 * 60 * 1000);
});
