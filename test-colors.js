const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data: users, error } = await supabase.from('google_tokens').select('*').limit(1);
  if (!users || users.length === 0) {
      console.log("No users found"); return;
  }
  const tokenData = users[0];
  const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/auth/google/callback'
  );
  oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date,
  });

  try {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.colors.get();
      console.log("Colors event:", Object.keys(response.data.event || {}).length);
  } catch (e) {
      console.error("Error:", e.message);
  }
})();
