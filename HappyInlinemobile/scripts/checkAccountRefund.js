const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efxcjndkalqfjxhxmrjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmeGNqbmRrYWxxZmp4aHhtcmpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTE3NiwiZXhwIjoyMDc0NTY3MTc2fQ.TR-Xb6P3VuRGaUxvQZ-VZHsULqVCdKNXPnKqQHQrCzE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccount() {
  const email = 'kigasa3386@besenica.com';
  
  console.log('🔍 Looking up account:', email);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, subscription_plan, subscription_status, subscription_start_date, refund_eligible_until, next_billing_date, created_at')
    .eq('email', email)
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data) {
    console.log('❌ Account not found');
    return;
  }
  
  console.log('\n📋 Account Details:');
  console.log('━'.repeat(50));
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Name:', data.name);
  console.log('Subscription Plan:', data.subscription_plan);
  console.log('Subscription Status:', data.subscription_status);
  console.log('Created At:', data.created_at);
  console.log('━'.repeat(50));
  console.log('subscription_start_date:', data.subscription_start_date);
  console.log('refund_eligible_until:', data.refund_eligible_until);
  console.log('next_billing_date:', data.next_billing_date);
  
  // Calculate refund eligibility
  if (data.refund_eligible_until) {
    const refundDate = new Date(data.refund_eligible_until);
    const now = new Date();
    const diffMs = refundDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    console.log('\n📅 Refund Calculation:');
    console.log('━'.repeat(50));
    console.log('Refund Deadline:', refundDate.toISOString());
    console.log('Current Time:', now.toISOString());
    console.log('Days Remaining:', daysRemaining);
    console.log('Is Eligible:', daysRemaining > 0 ? 'YES' : 'NO');
  } else {
    console.log('\n⚠️ refund_eligible_until is NULL - not eligible for refund');
  }
}

checkAccount();
