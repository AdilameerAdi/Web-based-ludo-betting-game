import { supabase } from '../config/supabase.js';

export class Withdrawal {
  // Create a new withdrawal request
  static async create(withdrawalData) {
    const { userId, amount, paymentMethod, accountDetails } = withdrawalData;
    
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .insert([
          {
            user_id: userId,
            amount: amount,
            payment_method: paymentMethod,
            account_details: accountDetails,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Withdrawal request created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Withdrawal creation failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create withdrawal request',
        errorDetails: error
      };
    }
  }

  // Get all withdrawals for a user
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get all withdrawals (for admin)
  static async findAll() {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          users:user_id (
            id,
            mobile
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get withdrawal by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          users:user_id (
            id,
            mobile
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Withdrawal not found' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update withdrawal status
  static async updateStatus(id, status, adminId = null, adminNotes = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (adminId) {
        updateData.processed_by = adminId;
      }

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('withdrawals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

