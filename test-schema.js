const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { error } = await supabase.rpc('execute_sql', { 
    sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_sync_weeks_ahead INTEGER DEFAULT 1;"
  });
  if (error) {
    console.error("RPC error:", error);
  } else {
    console.log("Column added.");
  }
}
run();
