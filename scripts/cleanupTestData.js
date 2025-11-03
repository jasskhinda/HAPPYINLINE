/**
 * Script to clean up test/demo stores from the database
 *
 * This will delete:
 * - Test shops (Avon Barber shop, etc.)
 * - Associated bookings
 * - Associated shop_staff entries
 * - Associated shop_services
 * - Associated conversations
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

// Read app.json to get Supabase credentials
const appJsonPath = join(__dirname, '..', 'app.json');
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));

const supabaseUrl = appJson.expo.extra.supabaseUrl;
const supabaseKey = appJson.expo.extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in app.json');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log('\n🧹 Starting cleanup of test/demo data...\n');
  console.log('━'.repeat(60));

  try {
    // Step 1: Find all test shops
    console.log('\n📊 Step 1: Finding test/demo shops...');
    const { data: testShops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name, created_at')
      .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%avon%');

    if (shopsError) {
      console.error('❌ Error fetching shops:', shopsError);
      return;
    }

    if (!testShops || testShops.length === 0) {
      console.log('✅ No test shops found. Database is clean!');
      return;
    }

    console.log(`\n📋 Found ${testShops.length} test shop(s):`);
    testShops.forEach((shop, index) => {
      console.log(`   ${index + 1}. ${shop.name} (ID: ${shop.id})`);
      console.log(`      Created: ${new Date(shop.created_at).toLocaleString()}`);
    });

    const shopIds = testShops.map(shop => shop.id);

    // Step 2: Delete associated bookings
    console.log('\n🗑️  Step 2: Deleting associated bookings...');
    const { error: bookingsError, count: bookingsCount } = await supabase
      .from('bookings')
      .delete()
      .in('shop_id', shopIds);

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError);
    } else {
      console.log(`   ✅ Deleted ${bookingsCount || 0} booking(s)`);
    }

    // Step 3: Delete shop_staff entries
    console.log('\n🗑️  Step 3: Deleting shop_staff entries...');
    const { error: staffError, count: staffCount } = await supabase
      .from('shop_staff')
      .delete()
      .in('shop_id', shopIds);

    if (staffError) {
      console.error('❌ Error deleting shop_staff:', staffError);
    } else {
      console.log(`   ✅ Deleted ${staffCount || 0} staff entry(ies)`);
    }

    // Step 4: Delete shop_services
    console.log('\n🗑️  Step 4: Deleting shop_services...');
    const { error: servicesError, count: servicesCount } = await supabase
      .from('shop_services')
      .delete()
      .in('shop_id', shopIds);

    if (servicesError) {
      console.error('❌ Error deleting shop_services:', servicesError);
    } else {
      console.log(`   ✅ Deleted ${servicesCount || 0} service(s)`);
    }

    // Step 5: Delete conversations
    console.log('\n🗑️  Step 5: Deleting conversations...');
    const { error: conversationsError, count: conversationsCount } = await supabase
      .from('conversations')
      .delete()
      .in('shop_id', shopIds);

    if (conversationsError) {
      console.error('❌ Error deleting conversations:', conversationsError);
    } else {
      console.log(`   ✅ Deleted ${conversationsCount || 0} conversation(s)`);
    }

    // Step 6: Delete the shops themselves
    console.log('\n🗑️  Step 6: Deleting the test shops...');
    const { error: deleteShopsError, count: shopsDeletedCount } = await supabase
      .from('shops')
      .delete()
      .in('id', shopIds);

    if (deleteShopsError) {
      console.error('❌ Error deleting shops:', deleteShopsError);
    } else {
      console.log(`   ✅ Deleted ${shopsDeletedCount || 0} shop(s)`);
    }

    // Step 7: Verify cleanup
    console.log('\n✅ Step 7: Verifying cleanup...');
    const { data: remainingShops } = await supabase
      .from('shops')
      .select('id, name')
      .or('name.ilike.%test%,name.ilike.%demo%,name.ilike.%avon%');

    if (!remainingShops || remainingShops.length === 0) {
      console.log('   ✅ All test shops successfully deleted!');
    } else {
      console.log(`   ⚠️  Warning: ${remainingShops.length} test shop(s) still remain:`);
      remainingShops.forEach(shop => {
        console.log(`      - ${shop.name} (ID: ${shop.id})`);
      });
    }

    console.log('\n━'.repeat(60));
    console.log('🎉 Cleanup completed!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error during cleanup:');
    console.error(error);
  }
}

// Run the cleanup
cleanupTestData();
