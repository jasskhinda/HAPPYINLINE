import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  'https://efxcjndkalqfjxhxmrjq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGNqbmRrYWxxZmp4aHhtcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTExNzYsImV4cCI6MjA3NDU2NzE3Nn0.NOQGiaLiTHBDguukT25R_osUn-PReEJTaHpnHN8mgkU'
);

async function main() {
  console.log('Fetching shops...');

  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('id, name, created_by, subscription_plan, subscription_status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (shopsErr) {
    console.error('Error:', shopsErr.message);
    return;
  }

  console.log('Shops found:', shops.length);

  for (const shop of shops) {
    console.log(`\nShop: ${shop.name}`);
    console.log(`  ID: ${shop.id}`);
    console.log(`  Owner: ${shop.created_by}`);
    console.log(`  Plan: ${shop.subscription_plan}`);

    // Check if owner exists in shop_staff
    const { data: staff } = await supabase
      .from('shop_staff')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('role', 'owner');

    if (!staff || staff.length === 0) {
      console.log('  ⚠️ NO OWNER IN SHOP_STAFF - Fixing...');

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
          console.log(`  ❌ Error: ${insertErr.message}`);
        } else {
          console.log('  ✅ Fixed - added owner to shop_staff');
        }
      }
    } else {
      console.log('  ✓ Owner exists in shop_staff');
    }
  }
}

main().catch(console.error);
