import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tokenData } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json({ error: 'Google tokens not found' }, { status: 404 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    )

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date,
    })

    // Listen to token refresh events
    oauth2Client.on('tokens', async (tokens) => {
        const updateData: any = {
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            updated_at: new Date().toISOString()
        }
        if (tokens.refresh_token) {
            updateData.refresh_token = tokens.refresh_token
        }
        await supabase.from('google_tokens').update(updateData).eq('user_id', user.id)
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.calendarList.list({
      minAccessRole: 'writer'
    })

    return NextResponse.json({ calendars: response.data.items || [] })
  } catch (error: any) {
    console.error('Error fetching calendars:', error)
    
    // Check for insufficient scope error
    if (error.message?.includes('insufficient authentication scopes') || error.code === 403) {
        return NextResponse.json({ error: 'Je nutné znovu autorizovat Google účet pro nová oprávnění (Odpojit a znovu Připojit).' }, { status: 403 })
    }
    
    import('fs').then(fs => fs.appendFileSync('calendars_error.log', new Date().toISOString() + ': ' + error.message + '\n'))
    return NextResponse.json({ error: error.message || 'Error fetching calendars' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    if (!body.summary) {
      return NextResponse.json({ error: 'Missing calendar name' }, { status: 400 })
    }

    const { data: tokenData } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json({ error: 'Google tokens not found' }, { status: 404 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    )

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date,
    })
    
    try {
      const tokenInfo = await oauth2Client.getTokenInfo(tokenData.access_token)
      console.log('Current token scopes:', tokenInfo.scopes)
    } catch (e) {
      console.log('Could not get token info:', e)
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.calendars.insert({
      requestBody: {
        summary: body.summary,
        timeZone: 'Europe/Prague'
      }
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error creating calendar:', error)
    try {
        const fs = require('fs')
        fs.appendFileSync('calendars_error.log', new Date().toISOString() + ' POST: ' + error.message + '\n')
    } catch(e) {}
    
    // Catch insufficient scope error
    if (error.message?.includes('insufficient authentication scopes') || error.code === 403) {
        return NextResponse.json({ error: 'Je nutné znovu autorizovat Google účet pro nová oprávnění (Odpojit a znovu Připojit).' }, { status: 403 })
    }
    
    return NextResponse.json({ error: error.message || 'Error creating calendar' }, { status: 500 })
  }
}
