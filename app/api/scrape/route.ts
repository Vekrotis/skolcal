import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('skola_online_username, skola_online_password_encrypted, schedule_data')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.skola_online_username) {
      return NextResponse.json({ error: 'Přihlašovací údaje nejsou nastaveny.' }, { status: 400 })
    }

    const username = profile.skola_online_username || process.env.SKOLA_ONLINE_USERNAME
    const password = profile.skola_online_password_encrypted || process.env.SKOLA_ONLINE_PASSWORD

    if (!username || !password) {
      return NextResponse.json({ error: 'Chybí heslo nebo uživatelské jméno' }, { status: 400 })
    }

    // Run scraper in a separate Node.js process to bypass Next.js bundling issues
    const scriptPath = path.resolve(process.cwd(), 'lib/cli-scraper.ts')
    
    // We use npx tsx to run it directly
    const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}" "${username}" "${password}"`)
    
    let lessons = []
    try {
        lessons = JSON.parse(stdout.trim())
    } catch (e) {
        console.error("Failed to parse scraper output:", stdout)
        console.error("Stderr:", stderr)
        throw new Error("Neplatný výstup ze scraperu. Podívejte se do konzole serveru.")
    }

    // Merge with existing schedule data
    const existingLessons = profile.schedule_data || []
    
    // Find the dates that are in the new lessons
    const newDates = new Set()
    lessons.forEach((l: any) => {
      const match = l.time?.match(/(\d+\.\s*\d+\.)/)
      if (match) newDates.add(match[1])
    })

    // Filter out existing lessons that fall on the new dates
    const filteredExisting = existingLessons.filter((l: any) => {
      const match = l.time?.match(/(\d+\.\s*\d+\.)/)
      if (match) {
         return !newDates.has(match[1])
      }
      return true
    })

    const finalLessons = [...filteredExisting, ...lessons]

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ schedule_data: finalLessons, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Chyba při ukládání do databáze' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: lessons.length })
  } catch (error: any) {
    console.error('API Scrape Error:', error)
    return NextResponse.json({ error: error.message || 'Interní chyba serveru' }, { status: 500 })
  }
}
