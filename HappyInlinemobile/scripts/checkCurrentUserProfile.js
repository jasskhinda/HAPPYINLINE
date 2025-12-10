/**
 * Check Current User Profile Script
 *
 * This script checks all profiles and their details
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  console.log('🔍 Checking all user profiles...\n');

  try {
    // Query all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, name, phone, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles found in the database!');
      return;
    }

    console.log(`✅ Found ${profiles.length} profile(s):\n`);
    console.log('═'.repeat(80));

    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. User Profile`);
      console.log('─'.repeat(80));
      console.log(`   ID:         ${profile.id}`);
      console.log(`   Email:      ${profile.email || 'Not set'}`);
      console.log(`   Name:       ${profile.name || 'Not set'}`);
      console.log(`   Phone:      ${profile.phone || 'Not set'}`);
      console.log(`   Role:       ${profile.role || 'Not set'}`);
      console.log(`   Created:    ${new Date(profile.created_at).toLocaleString()}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`\n✨ Total: ${profiles.length} profile(s)\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
checkProfiles();
