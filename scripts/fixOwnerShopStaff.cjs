const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efxcjndkalqfjxhxmrjq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGNqbmRrYWxxZmp4aHhtcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTExNzYsImV4cCI6MjA3NDU2NzE3Nn0.NOQGiaLiTHBDguukT25R_osUn-PReEJTaHpnHN8mgkU';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log('Fetching shops...');

  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('id, name, created_by, subscription_plan, subscription_status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (shopsErr) {
    console.error('Error fetching shops:', shopsErr);
    return;
  }

  console.log('Shops found:', shops ? shops.length : 0);

  if (!shops || shops.length === 0) {
    console.log('No shops found in database');
    return;
  }

  for (const shop of shops) {
    console.log('\nShop:', shop.name);
    console.log('  ID:', shop.id);
    console.log('  Owner ID:', shop.created_by);
    console.log('  Plan:', shop.subscription_plan);
    console.log('  Status:', shop.subscription_status);

    // Check if owner exists in shop_staff
    const { data: staff, error: staffErr } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('role', 'owner');

    if (staffErr) {
      console.log('  Error checking staff:', staffErr.message);
      continue;
    }

    if (!staff || staff.length === 0) {
      console.log('  ⚠️  NO OWNER IN SHOP_STAFF - Fixing...');

      if (shop.created_by) {
        const { error: insertErr } = await supabase
          .from('shop_staff')
          .insert({
            shop_id: shop.id,
            user_id: shop.created_by,
            role: 'owner',
            is_active: true,
          });

        if (insertErr) {
          console.log('  ❌ Error inserting:', insertErr.message);
        } else {
          console.log('  ✅ Fixed - added owner to shop_staff');
        }
      } else {
        console.log('  ❌ Cannot fix - no created_by user ID');
      }
    } else {
      console.log('  ✓ Owner exists in shop_staff (user:', staff[0].user_id + ')');
    }
  }

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
