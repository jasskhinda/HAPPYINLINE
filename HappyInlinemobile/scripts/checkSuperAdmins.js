/**
 * Script to check who are the super_admins in the database
 *
 * Usage: node scripts/checkSuperAdmins.js
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

async function checkSuperAdmins() {
  console.log('🔍 Checking for super_admins in the database...\n');

  try {
    // Query all users with super_admin role
    const { data: superAdmins, error } = await supabase
      .from('profiles')
      .select('id, email, name, phone, role, created_at')
      .eq('role', 'super_admin')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error querying super_admins:', error.message);
      return;
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log('⚠️  No super_admins found in the database!');
      console.log('\nTo create a super_admin, you can run:');
      console.log('UPDATE profiles SET role = \'super_admin\' WHERE email = \'your-email@example.com\';');
      return;
    }

    console.log(`✅ Found ${superAdmins.length} super_admin(s):\n`);
    console.log('═'.repeat(80));

    superAdmins.forEach((admin, index) => {
      console.log(`\n${index + 1}. Super Admin`);
      console.log('─'.repeat(80));
      console.log(`   ID:         ${admin.id}`);
      console.log(`   Email:      ${admin.email || 'Not set'}`);
      console.log(`   Name:       ${admin.name || 'Not set'}`);
      console.log(`   Phone:      ${admin.phone || 'Not set'}`);
      console.log(`   Role:       ${admin.role}`);
      console.log(`   Created:    ${new Date(admin.created_at).toLocaleString()}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`\n✨ Total: ${superAdmins.length} super_admin(s)\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the check
checkSuperAdmins()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
