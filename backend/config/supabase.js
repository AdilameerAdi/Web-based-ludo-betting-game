import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
export const testConnection = async () => {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      console.error('   Please check your .env file has SUPABASE_URL and SUPABASE_ANON_KEY');
      return false;
    }

    // Test connection by trying to query (even if table doesn't exist, connection should work)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // PGRST116 = relation does not exist (table not created yet)
    // This is OK - it means connection works but table needs to be created
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('⚠️  Supabase connected, but "users" table not found');
        console.log('   Please create the "users" table in Supabase (see SUPABASE_SETUP.md)');
        return true; // Connection works, just table missing
      } else {
        console.error('❌ Supabase connection error:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Details:', error);
        return false;
      }
    }

    console.log('✅ Supabase connected successfully');
    console.log('✅ "users" table exists and is accessible');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    if (error.message.includes('fetch')) {
      console.error('   Check your SUPABASE_URL is correct');
    }
    if (error.message.includes('Invalid API key')) {
      console.error('   Check your SUPABASE_ANON_KEY is correct');
    }
    return false;
  }
};

