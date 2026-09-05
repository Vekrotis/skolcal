import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { google } from 'googleapis'
import { parse } from 'date-fns'
import { cs } from 'date-fns/locale'

// Basic timetable mapping for start times (assuming standard school timetable)
const TIMETABLE: Record<string, { start: string, duration: number }> = {
    '0': { start: '07:05', duration: 45 },
    '1': { start: '08:00', duration: 45 },
    '2': { start: '08:55', duration: 45 },
    '3': { start: '10:00', duration: 45 },
    '4': { start: '10:55', duration: 45 },
    '5': { start: '11:50', duration: 45 },
    '6': { start: '12:45', duration: 45 },
    '7': { start: '13:35', duration: 45 },
    '8': { start: '14:25', duration: 45 },
    '9': { start: '15:20', duration: 45 },
    '10': { start: '16:15', duration: 45 },
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch profile settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.schedule_data) {
      return NextResponse.json({ error: 'Rozvrh není stažen. Prosím synchronizujte nejprve rozvrh.' }, { status: 400 })
    }

    const calendarId = profile.google_calendar_id || 'primary'
    const notifyMinutes = profile.google_notification_minutes

    // 2. Fetch subject colors
    const { data: colors } = await supabase
      .from('subject_colors')
      .select('subject_name, google_color_id')
      .eq('user_id', user.id)

    const colorMap: Record<string, string> = {}
    if (colors) {
      colors.forEach(c => {
        if (c.google_color_id) colorMap[c.subject_name] = c.google_color_id
      })
    }
    console.log("SYNC DEBUG - colorMap:", colorMap)

    // 3. Setup Google Auth
    const { data: tokenData } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json({ error: 'Google účet není propojen.' }, { status: 400 })
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

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const syncWeeks = profile.google_sync_weeks_ahead || 1

    // 4. Sync events
    const lessons = profile.schedule_data as any[]
    let synced = 0

    for (const lesson of lessons) {
      if (!lesson.time) continue
      
      const timeMatch = lesson.time.match(/(\d+)\.\s*(\d+)\.[\s\S]*?\((\d+)/)
      let eventDate = ''
      let period = ''
      
      if (timeMatch) {
          const currentYear = new Date().getFullYear();
          eventDate = `${timeMatch[1]}.${timeMatch[2]}.${currentYear}`
          period = timeMatch[3]
      } else {
          continue
      }
      
      if (!eventDate || !period || !TIMETABLE[period]) continue
      
      try {
        const [day, month, year] = eventDate.split('.')
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const timeConf = TIMETABLE[period]
        
        const baseStartDateTime = new Date(`${dateStr}T${timeConf.start}:00+02:00`)
        const baseEndDateTime = new Date(baseStartDateTime.getTime() + (lesson.colspan || 1) * timeConf.duration * 60000)

        // Find color, normalize strings to avoid mismatch
        const normalizedSubject = lesson.subject ? lesson.subject.trim() : ''
        let colorId = null
        for (const [subj, colId] of Object.entries(colorMap)) {
            if (subj.trim() === normalizedSubject) {
                colorId = colId
                break
            }
        }

        // Loop over weeks ahead
        for (let week = 0; week < syncWeeks; week++) {
            const startDateTime = new Date(baseStartDateTime.getTime() + week * 7 * 24 * 60 * 60 * 1000)
            const endDateTime = new Date(baseEndDateTime.getTime() + week * 7 * 24 * 60 * 60 * 1000)
            
            // Format current loop date for unique ID
            const loopDateStr = startDateTime.toISOString().split('T')[0]
            const uniqueString = `skolcal-${user.id}-${loopDateStr}-${period}`.replace(/[^a-v0-9]/g, '0').toLowerCase()
            
            const eventBody: any = {
                summary: lesson.subject,
                location: lesson.classroom,
                description: `Učitel: ${lesson.teacher}\nTéma: ${lesson.topic || ''}\nPoznámka: ${lesson.notes || ''}`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'Europe/Prague',
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'Europe/Prague',
                },
                id: uniqueString.substring(0, 1024),
            }

            if (colorId) {
                eventBody.colorId = colorId
            }

            if (notifyMinutes !== null && notifyMinutes !== undefined) {
                eventBody.reminders = {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: notifyMinutes }
                    ]
                }
            }

            try {
                await calendar.events.insert({
                    calendarId: calendarId,
                    requestBody: eventBody,
                })
            } catch (insertErr: any) {
                if (insertErr.code === 409) {
                    await calendar.events.update({
                        calendarId: calendarId,
                        eventId: eventBody.id,
                        requestBody: eventBody,
                    })
                } else {
                    console.error("Error inserting event", insertErr)
                    throw insertErr
                }
            }
            
            synced++
        }
      } catch(e) {
          console.error("Failed to parse or insert lesson", lesson, e)
      }
    }

    return NextResponse.json({ success: true, syncedCount: synced })
  } catch (error: any) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json({ error: error.message || 'Error syncing to Google Calendar' }, { status: 500 })
  }
}
