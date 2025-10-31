// Quick script to check existing users in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efxcjndkalqfjxhxmrjq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGNqbmRrYWxxZmp4aHhtcmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTExNzYsImV4cCI6MjA3NDU2NzE3Nn0.NOQGiaLiTHBDguukT25R_osUn-PReEJTaHpnHN8mgkU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  console.log('🔍 Checking users in database...\n');

  // Fetch all profiles - first check what columns exist
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching profiles:', error.message);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ No users found in database');
    console.log('\n📝 To create your first user:');
    console.log('   1. Open the app on your phone');
    console.log('   2. Enter your email address');
    console.log('   3. Check your email for the OTP code');
    console.log('   4. Enter the code to create your account\n');
    return;
  }

  console.log(`✅ Found ${profiles.length} user(s):\n`);

  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.name || 'No name'}`);
    console.log(`   📧 Email: ${profile.email}`);
    console.log(`   👤 Role: ${profile.role || 'customer'}`);
    console.log(`   🔐 Platform Admin: ${profile.is_platform_admin ? 'Yes' : 'No'}`);
    console.log(`   ⭐ Super Admin: ${profile.is_super_admin ? 'Yes' : 'No'}`);
    console.log(`   ✅ Onboarding: ${profile.onboarding_completed ? 'Complete' : 'Incomplete'}`);
    console.log('');
  });

  // Summary
  const roles = profiles.reduce((acc, p) => {
    const role = p.role || 'customer';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 User Summary:');
  Object.entries(roles).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });
}

checkUsers().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
