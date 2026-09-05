import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './components/DashboardClient'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile to see which mode is active and if they have schedule_data
  const { data: profile } = await supabase
    .from('profiles')
    .select('calendar_mode, skola_online_username, schedule_data')
    .eq('id', user.id)
    .single()

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-400/20 dark:bg-indigo-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute -bottom-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-rose-400/20 dark:bg-rose-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="relative z-10 w-[96vw] max-w-[1800px] mx-auto p-4 sm:p-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Skolcal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button className="text-sm font-medium bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full transition-all shadow-sm">
                Odhlásit
              </button>
            </form>
          </div>
        </header>

        <DashboardClient profile={profile || {}} subjectColors={colorMap} />
      </div>
    </div>
  )
}
