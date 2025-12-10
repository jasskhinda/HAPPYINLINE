const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://efxcjndkalqfjxhxmrjq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGNqbmRrYWxxZmp4aHhtcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTExNzYsImV4cCI6MjA3NDU2NzE3Nn0.NOQGiaLiTHBDguukT25R_osUn-PReEJTaHpnHN8mgkU'
);

async function checkAndFixShopStaff() {
  console.log('\n=== Checking Shops and Staff ===\n');

  // Get all shops with owners
  const { data: shops, error: shopsErr } = await supabase
    .from('shops')
    .select('id, name, created_by, subscription_plan, subscription_status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (shopsErr) {
    console.error('Error fetching shops:', shopsErr);
    return;
  }

  console.log('Recent Shops:');
  shops.forEach(s => {
    console.log(`  - ${s.name} (ID: ${s.id})`);
    console.log(`    Created by: ${s.created_by}`);
    console.log(`    Plan: ${s.subscription_plan}, Status: ${s.subscription_status}`);
  });

  // Get shop_staff entries for those shops
  const shopIds = shops.map(s => s.id);
  const { data: staff, error: staffErr } = await supabase
    .from('shop_staff')
    .select('shop_id, user_id, role, is_active')
    .in('shop_id', shopIds);

  if (staffErr) {
    console.error('Error fetching staff:', staffErr);
    return;
  }

  console.log('\n\nShop Staff entries:');
  staff.forEach(s => {
    console.log(`  - Shop: ${s.shop_id}, User: ${s.user_id}, Role: ${s.role}, Active: ${s.is_active}`);
  });

  // Find shops without staff
  const shopsWithStaff = new Set(staff.map(s => s.shop_id));
  const shopsWithoutStaff = shops.filter(s => !shopsWithStaff.has(s.id));

  console.log('\n\nShops WITHOUT staff entries (need fixing):');
  if (shopsWithoutStaff.length === 0) {
    console.log('  None - all shops have staff!');
  } else {
    for (const shop of shopsWithoutStaff) {
      console.log(`  - ${shop.name} (${shop.id})`);
      console.log(`    Will add owner: ${shop.created_by}`);

      // Fix: Add owner to shop_staff
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
          console.log(`    ERROR adding: ${insertErr.message}`);
        } else {
          console.log(`    ✅ FIXED - Added owner to shop_staff`);
        }
      }
    }
  }

  console.log('\n=== Done ===\n');
}

checkAndFixShopStaff().catch(console.error);
