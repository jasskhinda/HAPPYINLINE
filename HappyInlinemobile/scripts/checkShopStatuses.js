import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data } = await supabase.from('shops').select('name, status, created_at').order('created_at', { ascending: true });
console.log('\n📊 Current shop statuses:\n');
data?.forEach(s => console.log(`  - ${s.name}: ${s.status} (created: ${s.created_at})`));
console.log('');
