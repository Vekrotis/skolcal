const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://example.supabase.co', 'dummy-key');
(async () => {
  try {
    const res = await supabase.from('nonexistent').select('*').single();
    console.log("Returned:", res);
  } catch(e) {
    console.error("Thrown:", e);
  }
})();
