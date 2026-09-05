const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data: tokens, error } = await supabase.from('google_tokens').select('*');
  if (error) {
    console.error("Error fetching tokens:", error);
    return;
  }
  if (!tokens || tokens.length === 0) {
    console.log("No tokens found in DB.");
    return;
  }
  
  for (const t of tokens) {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${t.access_token}`);
    const data = await res.json();
    console.log(`User ${t.user_id} scopes:`, data.scope);
  }
})();
