/**
 * Update Super Admin Name Script
 *
 * This script updates the name for a super_admin user
 * Run with: node scripts/updateSuperAdminName.js YOUR_EMAIL "Your Name"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSuperAdminName() {
  const email = process.argv[2];
  const name = process.argv[3];

  if (!email || !name) {
    console.error('❌ Usage: node scripts/updateSuperAdminName.js YOUR_EMAIL "Your Name"');
    console.error('Example: node scripts/updateSuperAdminName.js admin@example.com "John Doe"');
    process.exit(1);
  }

  console.log(`🔧 Updating name for user: ${email}\n`);

  try {
    // First, check if the user exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('email', email)
      .single();

    if (fetchError || !existingProfile) {
      console.error(`❌ User not found with email: ${email}`);
      console.error('Error:', fetchError?.message);
      return;
    }

    console.log('Current profile:');
    console.log(`  Email: ${existingProfile.email}`);
    console.log(`  Name: ${existingProfile.name || 'Not set'}`);
    console.log(`  Role: ${existingProfile.role || 'Not set'}\n`);

    // Update the name
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ name: name })
      .eq('email', email)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update name:', updateError.message);
      return;
    }

    console.log('✅ Successfully updated!');
    console.log('\nUpdated profile:');
    console.log(`  Email: ${updatedProfile.email}`);
    console.log(`  Name: ${updatedProfile.name}`);
    console.log(`  Role: ${updatedProfile.role}\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
updateSuperAdminName();
