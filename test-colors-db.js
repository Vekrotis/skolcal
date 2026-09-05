const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  const { data: users, error: userError } = await supabase.from('profiles').select('id, skola_online_username').limit(1);
  console.log("Users:", users);

  const { data: colors, error: colorError } = await supabase.from('subject_colors').select('*');
  console.log("Colors in DB:", colors);
})();
