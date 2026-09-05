import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  )

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar' // Added for creating custom calendars
  ]

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Důležité pro získání refresh_tokenu
    scope: scopes,
    prompt: 'consent' // Vynutí consent screen pro zajištění refresh tokenu při opakovaném přihlášení
  })

  return NextResponse.redirect(url)
}
