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

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan())

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
// Store matching locks to prevent race conditions (key: tableAmount, value: boolean)
const matchingLocks = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join waiting room to receive table updates
  socket.on('join_waiting_room', () => {
    socket.join('waiting_room');
    // Send current active tables to the newly connected user
    const tablesArray = Array.from(activeTables.values());
    socket.emit('tables_update', tablesArray);
  });

  // Create a new custom table
  socket.on('create_table', async (tableData) => {
    // Cancel any existing table by this creator
    for (const [existingTableId, existingTable] of activeTables.entries()) {
      if (existingTable.creatorId === tableData.creatorId && existingTable.status === 'waiting') {
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
    
    // Set 5-minute timeout to return balance if no one joins
    const timeout = setTimeout(async () => {
      const currentTable = activeTables.get(tableId);
      if (currentTable && currentTable.status === 'waiting' && currentTable.players.length === 1) {
        // Return balance to creator
        try {
          const { supabase } = await import('./config/supabase.js');
          const { data: userData } = await supabase
            .from('users')
            .select('balance')
            .eq('id', currentTable.creatorId)
            .single();
          
          if (userData) {
            const newBalance = (userData.balance || 0) + currentTable.betAmount;
            const { error } = await supabase
              .from('users')
              .update({ balance: newBalance })
              .eq('id', currentTable.creatorId);
            
            if (!error) {
              // Remove table
              activeTables.delete(tableId);
              await supabase.from('tables').delete().eq('id', tableId);
              io.to('waiting_room').emit('table_removed', { tableId });
              io.to(`table_${tableId}`).emit('table_timeout', { tableId });
            }
          }
        } catch (err) {
          console.error('Error returning balance on timeout:', err);
        }
      }
      tableTimeouts.delete(tableId);
    }, 5 * 60 * 1000); // 5 minutes
    
    tableTimeouts.set(tableId, timeout);
    
    // Notify all users in waiting room
    io.to('waiting_room').emit('table_created', table);
    
    // Confirm to creator
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    socket.emit('table_created_success', { table, tableLink: `${frontendUrl}/table/${tableId}` });
  });

  // Join a specific table
  socket.on('join_table', async ({ tableId, userId }) => {
    const table = activeTables.get(tableId);
    // Allow joining even if table is active (for game synchronization)
    if (table) {
      // Join the socket room for game events
      socket.join(`table_${tableId}`);
      console.log(`Socket ${socket.id} joined table room: table_${tableId} for user ${userId}`);
      
      if (table.status === 'waiting' && table.players.length < 2 && !table.players.includes(userId)) {
        // Clear timeout since someone joined
        if (tableTimeouts.has(tableId)) {
          clearTimeout(tableTimeouts.get(tableId));
          tableTimeouts.delete(tableId);
        }
        
        table.players.push(userId);
        
        // If table is now full (2 players), remove it from waiting room
        if (table.players.length >= 2) {
          // Update table status in database
          try {
            const { supabase } = await import('./config/supabase.js');
            await supabase
              .from('tables')
              .update({ status: 'ready', players: table.players })
              .eq('id', tableId);
          } catch (err) {
            console.error('Error updating table status:', err);
          }
          
          // Remove from waiting room
          io.to('waiting_room').emit('table_removed', { tableId });
          
          // Notify table room that it's ready
          io.to(`table_${tableId}`).emit('table_ready', table);
        } else {
          // Notify all users in waiting room about the update
          io.to('waiting_room').emit('table_updated', table);
        }
        
        // Notify table room
        io.to(`table_${tableId}`).emit('player_joined', { table, userId });
      } else if (table.status === 'active' && table.players.includes(userId)) {
        // Player is rejoining an active game - just confirm they're in the room
        console.log(`Player ${userId} rejoined active table ${tableId}`);
        socket.emit('table_joined', { table, userId });
      }
    }
  });

  // Leave waiting room
  socket.on('leave_waiting_room', () => {
    socket.leave('waiting_room');
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
  socket.on('start_game', ({ tableId }) => {
    const table = activeTables.get(tableId);
    if (table) {
      // Clear timeout if exists
      if (tableTimeouts.has(tableId)) {
        clearTimeout(tableTimeouts.get(tableId));
        tableTimeouts.delete(tableId);
      }
      
      table.status = 'active';
      activeTables.set(tableId, table);
      io.to(`table_${tableId}`).emit('game_started', table);
      io.to('waiting_room').emit('table_updated', table);
    }
  });

  // Game turn change event (when player's turn changes)
  socket.on('game_turn_change', ({ tableId, playerNo, playerName }) => {
    console.log(`[SERVER] Turn change: Player ${playerNo} for table ${tableId}`);
    // Broadcast turn change to ALL players in the table (including sender for sync)
    io.to(`table_${tableId}`).emit('game_turn_change', {
      tableId,
      playerNo,
      playerName
    });
  });

  // Game dice roll event (when player rolls dice)
  socket.on('game_dice_roll', ({ tableId, playerNo }) => {
    console.log(`[SERVER] Dice roll: Player ${playerNo} for table ${tableId}`);
    // Broadcast dice roll to ALL players in the table (including sender for sync)
    io.to(`table_${tableId}`).emit('game_dice_roll', {
      tableId,
      playerNo
    });
  });

  // Game dice result event (when dice roll completes)
  socket.on('game_dice_result', ({ tableId, playerNo, diceValue, diceBoxId }) => {
    console.log(`[SERVER] Dice result: Player ${playerNo} rolled ${diceValue} for table ${tableId}`);
    // Broadcast dice result to ALL players in the table (including sender for sync)
    io.to(`table_${tableId}`).emit('game_dice_result', {
      tableId,
      playerNo,
      diceValue,
      diceBoxId
    });
  });

  // Game pawn open event (when player opens a pawn)
  socket.on('game_pawn_open', ({ tableId, playerNo, playerName, pawnClass, startPoint, width, height }) => {
    console.log(`[SERVER] Pawn open: Player ${playerNo} opened ${pawnClass} for table ${tableId}`);
    // Broadcast pawn open to ALL players in the table (including sender for sync)
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

  // Game pawn move event (when player moves a pawn)
  socket.on('game_pawn_move', ({ tableId, playerNo, playerName, pawnClass, newPosition, oldPosition, moveType }) => {
    console.log(`[SERVER] Pawn move: Player ${playerNo} moved ${pawnClass} from ${oldPosition} to ${newPosition} for table ${tableId}`);
    // Broadcast pawn movement to ALL players in the table (including sender for sync)
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
      try {
        const { supabase } = await import('./config/supabase.js');
        await supabase.from('tables').delete().eq('id', tableId);
      } catch (err) {
        console.error('Error deleting table:', err);
      }
      
      io.to('waiting_room').emit('table_removed', { tableId });
      io.to(`table_${tableId}`).emit('table_cancelled', { tableId });
    }
  });

  // Remove table when game ends or creator leaves
  socket.on('remove_table', ({ tableId }) => {
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
      
      // Check if we can match players (need 2 players) and no matching is in progress
      // Use setTimeout with 0 delay to ensure queue is fully updated before checking
      // This handles race conditions when two players search simultaneously
      setTimeout(async () => {
        // Re-check queue length and lock status to handle race conditions
        const currentQueue = matchmakingQueues.get(tableAmount);
        if (!currentQueue) {
          return; // Queue was deleted (shouldn't happen, but safety check)
        }
        
        const queueLength = currentQueue.length;
        const isLocked = matchingLocks.get(tableAmount);
        
        console.log(`Checking match for table ${tableAmount}: queue length=${queueLength}, locked=${isLocked}`);
        
        if (queueLength >= 2 && !isLocked) {
          // Set lock before matching to prevent concurrent matching attempts
          matchingLocks.set(tableAmount, true);
          console.log(`Attempting to match players for table ${tableAmount}, queue size: ${queueLength}`);
          try {
            // Pass the queue reference - matchPlayers will modify it by shifting players
            await matchPlayers(tableAmount, currentQueue);
          } catch (matchError) {
            console.error('Error in matchPlayers:', matchError);
            // Lock will be deleted in finally block of matchPlayers, but ensure it's cleared on error
            matchingLocks.delete(tableAmount);
          }
        } else if (queueLength >= 2 && isLocked) {
          console.log(`Match already in progress for table ${tableAmount}, queue size: ${queueLength}`);
        } else if (queueLength < 2) {
          console.log(`Not enough players for table ${tableAmount}, queue size: ${queueLength}`);
        }
      }, 0); // Use 0 delay to run on next tick, ensuring queue updates are processed
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
    // Double-check queue length before proceeding
    if (!queue || queue.length < 2) {
      console.log(`Cannot match: queue is ${queue ? 'empty or has < 2 players' : 'null'} for table ${tableAmount}`);
      matchingLocks.delete(tableAmount);
      return;
    }
    
    // Get first two players (this modifies the queue)
    const player1 = queue.shift();
    const player2 = queue.shift();
    
    // Validate we got both players
    if (!player1 || !player2) {
      console.error(`Failed to get both players for table ${tableAmount}. Player1: ${player1?.userId}, Player2: ${player2?.userId}`);
      // Put players back in queue if we got them
      if (player1) queue.unshift(player1);
      if (player2) queue.unshift(player2);
      matchingLocks.delete(tableAmount);
      return;
    }
    
    console.log(`Matching players: ${player1.userId} and ${player2.userId} for table ${tableAmount}`);
    
    // Update queue
    if (queue.length === 0) {
      matchmakingQueues.delete(tableAmount);
    } else {
      matchmakingQueues.set(tableAmount, queue);
    }
    
    console.log(`Matching players: ${player1.userId} and ${player2.userId} for table ${tableAmount}`);
    
    try {
      const { supabase } = await import('./config/supabase.js');
      
      // Deduct balance from both players
      const [user1Data, user2Data] = await Promise.all([
        supabase.from('users').select('balance').eq('id', player1.userId).single(),
        supabase.from('users').select('balance').eq('id', player2.userId).single()
      ]);
      
      if (user1Data.error || !user1Data.data || user1Data.data.balance < tableAmount) {
        // Player 1 insufficient balance, put player 2 back in queue
        queue.unshift(player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId).emit('match_error', { message: 'Insufficient balance' });
        return;
      }
      
      if (user2Data.error || !user2Data.data || user2Data.data.balance < tableAmount) {
        // Player 2 insufficient balance, put player 1 back in queue
        queue.unshift(player1);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player2.socketId).emit('match_error', { message: 'Insufficient balance' });
        return;
      }
      
      // Check if sockets are still connected before proceeding
      const socket1 = io.sockets.sockets.get(player1.socketId);
      const socket2 = io.sockets.sockets.get(player2.socketId);
      
      if (!socket1 || !socket2) {
        console.error(`One or both sockets not found: ${player1.socketId}, ${player2.socketId}`);
        // Put players back in queue (no balance deducted yet)
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId || socket1?.id).emit('match_error', { message: 'Connection lost. Please try again.' });
        io.to(player2.socketId || socket2?.id).emit('match_error', { message: 'Connection lost. Please try again.' });
        return;
      }
      
      // Create table in database first (before deducting balance)
      const tableId = `default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .insert({
          id: tableId,
          creator_id: player1.userId,
          bet_amount: tableAmount,
          status: 'waiting', // Set to waiting first, will change to active after balance deduction
          players: [player1.userId, player2.userId],
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (tableError) {
        console.error('Error creating table:', tableError);
        // Put players back in queue (no balance deducted yet)
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId).emit('match_error', { message: 'Failed to create game' });
        io.to(player2.socketId).emit('match_error', { message: 'Failed to create game' });
        return;
      }
      
      // Now deduct balance from both players (after table is created and sockets confirmed)
      const [balanceUpdate1, balanceUpdate2] = await Promise.all([
        supabase.from('users').update({ balance: user1Data.data.balance - tableAmount }).eq('id', player1.userId),
        supabase.from('users').update({ balance: user2Data.data.balance - tableAmount }).eq('id', player2.userId)
      ]);
      
      // Check if balance deduction failed
      if (balanceUpdate1.error || balanceUpdate2.error) {
        console.error('Error deducting balance:', balanceUpdate1.error || balanceUpdate2.error);
        // Delete table and put players back in queue
        await supabase.from('tables').delete().eq('id', tableId);
        queue.unshift(player1, player2);
        matchmakingQueues.set(tableAmount, queue);
        matchingLocks.delete(tableAmount);
        io.to(player1.socketId).emit('match_error', { message: 'Failed to process payment' });
        io.to(player2.socketId).emit('match_error', { message: 'Failed to process payment' });
        return;
      }
      
      // Update table status to active after successful balance deduction
      await supabase
        .from('tables')
        .update({ status: 'active' })
        .eq('id', tableId);
      
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
      
      // Automatically start the game for default tables (both players matched)
      // Emit game_started after a delay to ensure match_found is processed first
      setTimeout(() => {
        // Emit to both sockets individually to ensure they receive it
        socket1.emit('game_started', table);
        socket2.emit('game_started', table);
        // Also broadcast to room as backup
        io.to(`table_${tableId}`).emit('game_started', table);
        console.log(`Game started event sent for table ${tableId} to both players`);
      }, 500); // Increased delay to ensure navigation completes
      
      console.log(`Match created: Table ${tableId} with players ${player1.userId} and ${player2.userId}`);
      matchingLocks.delete(tableAmount);
    } catch (error) {
      console.error('Error matching players:', error);
      
      // Try to refund balance if it was deducted
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
      
      // Put players back in queue on error
      queue.unshift(player1, player2);
      matchmakingQueues.set(tableAmount, queue);
      matchingLocks.delete(tableAmount);
      io.to(player1.socketId).emit('match_error', { message: 'Failed to create match. Balance refunded.' });
      io.to(player2.socketId).emit('match_error', { message: 'Failed to create match. Balance refunded.' });
    }
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from matchmaking queues
    const userId = socketToUser.get(socket.id);
    if (userId) {
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
      socketToUser.delete(socket.id);
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

// Start server and test database connection
httpServer.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Testing Supabase connection...');
  await testConnection();
});

