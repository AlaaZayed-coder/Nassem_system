const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSeed() {
  const { data: warehouses, error } = await supabase.from('erp_warehouses').select('*');
  console.log('Warehouses:', warehouses);
  if (error) {
    console.error('Error fetching warehouses:', error);
  }
  
  if (!warehouses || warehouses.length === 0) {
    console.log('Inserting default warehouses...');
    const { error: insertError } = await supabase.from('erp_warehouses').insert([
      { name: 'مستودع الخليل', location: 'الخليل' },
      { name: 'مستودع ترقوميا', location: 'ترقوميا' }
    ]);
    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Inserted default warehouses successfully.');
    }
  }
}

checkAndSeed();
