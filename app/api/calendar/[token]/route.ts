import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateIcs } from '@/lib/ics-generator'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params
  const token = rawToken.replace('.ics', '')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.SUPABASE_KEY! // fallback for backward compatibility
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, schedule_data')
    .eq('ics_token', token)
    .single()

  if (!profile) {
    return new NextResponse('Calendar not found', { status: 404 })
  }

  const lessons = profile.schedule_data || []
  
  if (lessons.length === 0) {
    return new NextResponse('Calendar not generated yet (no data)', { status: 404 })
  }

  const icsContent = generateIcs(lessons)

  if (!icsContent) {
    return new NextResponse('Failed to generate calendar', { status: 500 })
  }

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="rozvrh.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
