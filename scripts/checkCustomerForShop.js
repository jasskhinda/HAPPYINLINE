import { supabase } from '../src/lib/supabase.js';

async function checkCustomerForShop() {
  try {
    console.log('🔍 Searching for shop with email: app@theavonbarbershop.com\n');

    // Find the shop by email
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, email, created_by')
      .eq('email', 'app@theavonbarbershop.com')
      .single();

    if (shopError) {
      console.error('❌ Error finding shop:', shopError.message);
      return;
    }

    if (!shop) {
      console.log('❌ No shop found with email: app@theavonbarbershop.com');
      return;
    }

    console.log('✅ Shop found:');
    console.log('   ID:', shop.id);
    console.log('   Name:', shop.name);
    console.log('   Email:', shop.email);
    console.log('   Created by user ID:', shop.created_by);
    console.log('');

    // Find all customers (exclusive_shop_id matches this shop)
    console.log('🔍 Searching for customers associated with this shop...\n');

    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, name, email, role, exclusive_shop_id')
      .eq('exclusive_shop_id', shop.id);

    if (customersError) {
      console.error('❌ Error finding customers:', customersError.message);
      return;
    }

    if (!customers || customers.length === 0) {
      console.log('❌ No customers found for this shop');
      console.log('');
    } else {
      console.log(`✅ Found ${customers.length} customer(s):\n`);
      customers.forEach((customer, index) => {
        console.log(`Customer ${index + 1}:`);
        console.log('   ID:', customer.id);
        console.log('   Name:', customer.name);
        console.log('   Email:', customer.email);
        console.log('   Role:', customer.role);
        console.log('   Exclusive Shop ID:', customer.exclusive_shop_id);
        console.log('');
      });
    }

    // Also check the shop owner's profile
    console.log('🔍 Checking shop owner profile...\n');
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', shop.created_by)
      .single();

    if (ownerError) {
      console.error('❌ Error finding owner:', ownerError.message);
    } else if (owner) {
      console.log('✅ Shop owner:');
      console.log('   ID:', owner.id);
      console.log('   Name:', owner.name);
      console.log('   Email:', owner.email);
      console.log('   Role:', owner.role);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCustomerForShop();
