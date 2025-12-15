import { supabase } from '../config/supabase.js';

export class User {
  // Create a new user
  static async create(userData) {
    const { mobile, password } = userData;
    
    try {
      console.log('📝 Creating user in database:', { mobile, passwordLength: password.length });
      
      // Only insert mobile and password - let database handle timestamps with defaults
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            mobile: mobile,
            password: password
            // Don't manually set created_at/updated_at - let database defaults handle it
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      console.log('✅ User created successfully in database:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ User creation failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create user',
        errorDetails: error
      };
    }
  }

  // Find user by mobile number
  static async findByMobile(mobile) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User not found' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User not found' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update user
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
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

  // Delete user
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

