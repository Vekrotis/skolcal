import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params
  const token = rawToken.replace('.ics', '')
  
  // Use service role key because this is a public endpoint but needs access to user's file
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.SUPABASE_KEY! // fallback for backward compatibility
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('ics_token', token)
    .single()

  if (!profile) {
    return new NextResponse('Calendar not found', { status: 404 })
  }

  const { data: fileData, error } = await supabase
    .storage
    .from('rozvrhy')
    .download(`${profile.id}.ics`)

  if (error || !fileData) {
    // If not found, maybe it hasn't been generated yet
    return new NextResponse('Calendar not generated yet', { status: 404 })
  }

  const text = await fileData.text()

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="rozvrh.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
