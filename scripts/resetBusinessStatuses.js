/**
 * Reset Business Statuses Script
 *
 * This script updates all existing businesses in the database to have
 * the correct status based on your business rules.
 *
 * Run with: node scripts/resetBusinessStatuses.js
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

async function resetBusinessStatuses() {
  console.log('🔧 Resetting business statuses...\n');

  try {
    // Get all shops
    const { data: shops, error: fetchError } = await supabase
      .from('shops')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching shops:', fetchError.message);
      return;
    }

    if (!shops || shops.length === 0) {
      console.log('ℹ️  No shops found in database');
      return;
    }

    console.log(`📊 Found ${shops.length} business(es)\n`);
    console.log('═'.repeat(80));

    // Show current status
    shops.forEach((shop, index) => {
      console.log(`\n${index + 1}. ${shop.name}`);
      console.log(`   Current Status: ${shop.status || 'null'}`);
      console.log(`   Created: ${shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'Unknown'}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n❓ What would you like to do?\n');
    console.log('1. Set all to "pending_approval" (requires admin review)');
    console.log('2. Keep "approved" businesses as is, set others to "pending_approval"');
    console.log('3. Cancel (no changes)\n');

    // For this automated script, let's use option 2 (safest)
    console.log('🔄 Applying Option 2: Keeping approved, updating others...\n');

    let updateCount = 0;

    for (const shop of shops) {
      if (shop.status !== 'approved' && shop.status !== 'active') {
        const { error: updateError } = await supabase
          .from('shops')
          .update({ status: 'pending_approval' })
          .eq('id', shop.id);

        if (updateError) {
          console.error(`❌ Failed to update ${shop.name}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${shop.name}: ${shop.status || 'null'} → pending_approval`);
          updateCount++;
        }
      } else {
        console.log(`⏭️  Skipped ${shop.name}: Already ${shop.status}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n✨ Complete! Updated ${updateCount} business(es)\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
resetBusinessStatuses();
