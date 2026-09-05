import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/google?error=no_code', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    
    // Save tokens to database
    await supabase.from('google_tokens').upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // might be undefined if not first time
      expiry_date: tokens.expiry_date,
      updated_at: new Date().toISOString()
    })

    return NextResponse.redirect(new URL('/dashboard/google?success=true', request.url))
  } catch (error) {
    console.error('Error getting Google tokens:', error)
    return NextResponse.redirect(new URL('/dashboard/google?error=token_failed', request.url))
  }
}
