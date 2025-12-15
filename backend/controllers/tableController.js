import { supabase } from '../config/supabase.js';

// Create a custom table
export const createTable = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { betAmount } = req.body;

    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bet amount must be greater than 0'
      });
    }

    // Check user balance (assuming balance is stored in users table)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance, mobile')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const balance = userData.balance || 0;
    
    if (balance < betAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Cancel any existing waiting tables created by this user
    const { data: existingTables, error: findError } = await supabase
      .from('tables')
      .select('id, bet_amount')
      .eq('creator_id', userId)
      .eq('status', 'waiting');

    if (!findError && existingTables && existingTables.length > 0) {
      // Return balance for existing tables
      for (const table of existingTables) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('balance')
          .eq('id', userId)
          .single();
        
        if (currentUser) {
          const newBalance = (currentUser.balance || 0) + table.bet_amount;
          const { error: refundError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);
          
          if (!refundError) {
            // Delete the old table
            await supabase
              .from('tables')
              .delete()
              .eq('id', table.id);
          }
        }
      }
    }

    // Create table record in database
    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data: tableData, error: tableError } = await supabase
      .from('tables')
      .insert([
        {
          id: tableId,
          creator_id: userId,
          bet_amount: betAmount,
          status: 'waiting',
          players: [userId],
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (tableError) {
      console.error('Table creation error:', tableError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create table',
        error: tableError.message
      });
    }

    // Deduct bet amount from user balance
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: balance - betAmount })
      .eq('id', userId);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
      // Rollback table creation
      await supabase.from('tables').delete().eq('id', tableId);
      return res.status(500).json({
        success: false,
        message: 'Failed to deduct balance'
      });
    }

    res.json({
      success: true,
      message: 'Table created successfully',
      data: {
        ...tableData,
        creatorMobile: userData.mobile
      }
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all waiting tables
export const getWaitingTables = async (req, res) => {
  try {
    const { data: tables, error } = await supabase
      .from('tables')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get tables error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tables',
        error: error.message
      });
    }

    // Fetch creator mobile for each table
    const tablesWithCreator = await Promise.all(
      (tables || []).map(async (table) => {
        const { data: creator } = await supabase
          .from('users')
          .select('mobile')
          .eq('id', table.creator_id)
          .single();
        
        return {
          ...table,
          creatorMobile: creator?.mobile || ''
        };
      })
    );

    res.json({
      success: true,
      data: tablesWithCreator
    });
  } catch (error) {
    console.error('Get waiting tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get table by ID
export const getTableById = async (req, res) => {
  try {
    const { tableId } = req.params;

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Join a table
export const joinTable = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tableId } = req.params;

    // Get table
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    if (table.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Table is not accepting new players'
      });
    }

    if (table.players && table.players.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Table is full'
      });
    }

    if (table.players && table.players.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this table'
      });
    }

    // Check user balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const balance = userData.balance || 0;
    
    if (balance < table.bet_amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Deduct bet amount from user balance
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: balance - table.bet_amount })
      .eq('id', userId);

    if (balanceError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to deduct balance'
      });
    }

    // Add player to table
    const updatedPlayers = [...(table.players || []), userId];
    const isFull = updatedPlayers.length >= 2;
    
    const updateData = {
      players: updatedPlayers,
      status: isFull ? 'ready' : 'waiting'
    };
    
    const { data: updatedTable, error: updateError } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', tableId)
      .select()
      .single();

    if (updateError) {
      // Rollback balance deduction
      await supabase
        .from('users')
        .update({ balance: balance })
        .eq('id', userId);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to join table',
        error: updateError.message
      });
    }

    res.json({
      success: true,
      message: 'Joined table successfully',
      data: updatedTable
    });
  } catch (error) {
    console.error('Join table error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

