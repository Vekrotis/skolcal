import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data } = await supabase.from('google_tokens').select('*').limit(1).single()
  if (!data) return console.log('No token found')

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  )

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  try {
    const res = await calendar.calendars.insert({
      requestBody: { summary: 'Test Cal' }
    })
    console.log('Success:', res.data.id)
  } catch (e: any) {
    console.log('Error creating:', e.message, e.code, e.errors)
  }
}
run()
