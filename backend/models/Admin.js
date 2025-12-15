import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

export class Admin {
  // Find admin by username
  static async findByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Admin not found' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Find admin by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Admin not found' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update admin password
  static async updatePassword(id, hashedPassword) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
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

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Hash password
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
}

