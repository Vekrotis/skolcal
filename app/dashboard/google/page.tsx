'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { ArrowLeft, Save, CalendarDays, ExternalLink, Unlink, RefreshCw, Plus, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function GoogleDashboard() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  const [calendars, setCalendars] = useState<any[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState('primary')
  const [notificationMinutes, setNotificationMinutes] = useState<number | null>(null)
  const [syncFrequency, setSyncFrequency] = useState(24)
  const [syncWeeks, setSyncWeeks] = useState(1)
  const [fetchingCalendars, setFetchingCalendars] = useState(false)
  
  const [scheduleData, setScheduleData] = useState<any[]>([])
  const [googleColors, setGoogleColors] = useState<any[]>([])
  const [subjectColors, setSubjectColors] = useState<Record<string, string>>({})
  const [fetchingColors, setFetchingColors] = useState(false)
  
  const [syncing, setSyncing] = useState(false)

  // New calendar state
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (profile) {
          setUsername(profile.skola_online_username || '')
          setSelectedCalendarId(profile.google_calendar_id || 'primary')
          setNotificationMinutes(profile.google_notification_minutes)
          setSyncFrequency(profile.google_sync_frequency_hours || 24)
          setSyncWeeks(profile.google_sync_weeks_ahead || 1)
          setScheduleData(profile.schedule_data || [])
        }
        
        const { data: googleToken } = await supabase
          .from('google_tokens')
          .select('user_id')
          .eq('user_id', user.id)
          .single()
          
        if (googleToken) {
          setIsConnected(true)
          fetchGoogleData()
        }
        
        const { data: colors } = await supabase
          .from('subject_colors')
          .select('*')
          .eq('user_id', user.id)
          
        if (colors) {
          const colorMap: Record<string, string> = {}
          colors.forEach(c => {
             colorMap[c.subject_name] = c.google_color_id || ''
          })
          setSubjectColors(colorMap)
        }
      }
      setLoading(false)
    }
    
    loadProfile()
  }, [])

  // Google Calendar event colors are static, no need to fetch them from API
  const GOOGLE_COLORS = [
    { id: '1', background: '#a4bdfc', foreground: '#1d1d1d', name: 'Levandulová' }, 
    { id: '2', background: '#7ae7bf', foreground: '#1d1d1d', name: 'Šalvějová' }, 
    { id: '3', background: '#dbadff', foreground: '#1d1d1d', name: 'Hroznová' }, 
    { id: '4', background: '#ff887c', foreground: '#1d1d1d', name: 'Plameňáková' }, 
    { id: '5', background: '#fbd75b', foreground: '#1d1d1d', name: 'Banánová' }, 
    { id: '6', background: '#ffb878', foreground: '#1d1d1d', name: 'Mandarinková' }, 
    { id: '7', background: '#46d6db', foreground: '#1d1d1d', name: 'Paví' }, 
    { id: '8', background: '#e1e1e1', foreground: '#1d1d1d', name: 'Grafitová' }, 
    { id: '9', background: '#5484ed', foreground: '#1d1d1d', name: 'Borůvková' }, 
    { id: '10', background: '#51b749', foreground: '#1d1d1d', name: 'Bazalková' }, 
    { id: '11', background: '#dc2127', foreground: '#1d1d1d', name: 'Rajčatová' }  
  ]

  const fetchGoogleData = async () => {
    setFetchingCalendars(true)
    try {
      const res = await fetch('/api/google/calendars')
      const data = await res.json()
      
      if (res.status === 403) {
        alert(data.error)
        setIsConnected(false) // Force them to disconnect/reconnect visually
      } else if (data.calendars) {
        setCalendars(data.calendars)
      }
    } catch (e) {
      console.error(e)
    }
    setFetchingCalendars(false)
    
    // Use static colors instead of fetching
    setGoogleColors(GOOGLE_COLORS)
  }

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/google/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: newCalendarName })
      })
      const data = await res.json()
      if (res.ok && data.id) {
        setCalendars(prev => [data, ...prev])
        setSelectedCalendarId(data.id)
        setIsCreatingCalendar(false)
        setNewCalendarName('')
        alert('Kalendář úspěšně vytvořen!')
      } else {
        alert('Chyba při vytváření: ' + data.error)
      }
    } catch (e) {
      console.error(e)
      alert('Neznámá chyba při vytváření kalendáře.')
    }
    setCreating(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          skola_online_username: username,
          skola_online_password_encrypted: password ? password : undefined, 
          calendar_mode: 'google',
          google_calendar_id: selectedCalendarId,
          google_notification_minutes: notificationMinutes,
          google_sync_frequency_hours: syncFrequency,
          google_sync_weeks_ahead: syncWeeks
        })
        .eq('id', user.id)
        
      if (updateError) {
        alert('Chyba při ukládání profilu: ' + updateError.message)
        setSaving(false)
        return
      }
        
      for (const [subject, colorId] of Object.entries(subjectColors)) {
        if (colorId) {
          // Check if exists
          const { data: existing } = await supabase
            .from('subject_colors')
            .select('id')
            .eq('user_id', user.id)
            .eq('subject_name', subject)
            .single()
            
          if (existing) {
            await supabase.from('subject_colors').update({ google_color_id: colorId }).eq('id', existing.id)
          } else {
            await supabase.from('subject_colors').insert({ user_id: user.id, subject_name: subject, google_color_id: colorId })
          }
        }
      }
        
      alert('Uloženo úspěšně.')
    }
    setSaving(false)
  }

  const connectGoogle = async () => {
    window.location.href = '/api/auth/google/login'
  }
  
  const handleColorChange = (subject: string, colorId: string) => {
    setSubjectColors(prev => ({ ...prev, [subject]: colorId }))
  }

  const handleDisconnect = async () => {
    if (!confirm('Opravdu chcete odpojit Google účet?')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('google_tokens').delete().eq('user_id', user.id)
      setIsConnected(false)
      alert('Google účet byl odpojen.')
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/google', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert('Synchronizace byla úspěšná!')
      } else {
        alert('Chyba při synchronizaci: ' + data.error)
      }
    } catch (e) {
      console.error(e)
      alert('Neznámá chyba při synchronizaci.')
    }
    setSyncing(false)
  }

  const uniqueSubjects = Array.from(new Set(scheduleData.map(lesson => lesson.subject).filter(Boolean)))

  if (loading) return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
    </div>
  )

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto relative z-10">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link href="/dashboard" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-8 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Zpět na panel
        </Link>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
          <CalendarDays className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">Google Integrace</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Propojte svůj rozvrh s osobním kalendářem.</p>
        </div>
      </motion.div>
      
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        
        <motion.div variants={itemVariants}>
          <GlassCard className="p-8 border-emerald-500/20 shadow-emerald-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -z-10 pointer-events-none" />
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-slate-200">
              Propojení účtu
            </h2>
            {isConnected ? (
              <div className="bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/50 p-5 rounded-2xl flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-medium">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="text-emerald-600 dark:text-emerald-300 w-5 h-5" />
                  </div>
                  Úspěšně propojeno
                </div>
                <button onClick={handleDisconnect} className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all border border-slate-200 dark:border-slate-700 font-medium shadow-sm">
                  <Unlink className="w-4 h-4" /> Odpojit
                </button>
              </div>
            ) : (
              <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-2xl shadow-inner">
                <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">Pro zápis událostí přímo do vašeho kalendáře je nutné propojit aplikaci s vaším Google účtem. Postaráme se o všechnu synchronizaci na pozadí.</p>
                <button 
                  onClick={connectGoogle}
                  className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-emerald-600/20 w-full sm:w-auto justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  Povolit přístup ke Kalendáři
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard className="p-8 shadow-sm">
            <form onSubmit={handleSave} className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-5">
                  Synchronizační údaje
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Škola OnLine: Přihlašovací jméno</label>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Škola OnLine: Heslo</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Nové heslo (nechte prázdné pro zachování)"
                      />
                    </div>
                  </div>

                  {isConnected && (
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Cílový Google Kalendář</label>
                        <div className="flex gap-2">
                          <select 
                            value={selectedCalendarId}
                            onChange={(e) => setSelectedCalendarId(e.target.value)}
                            className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10 truncate"
                            disabled={fetchingCalendars || isCreatingCalendar}
                          >
                            <option value="primary">Hlavní kalendář (Výchozí)</option>
                            {calendars.map(cal => (
                              <option key={cal.id} value={cal.id}>{cal.summary}</option>
                            ))}
                          </select>
                          <button 
                            type="button"
                            onClick={() => setIsCreatingCalendar(!isCreatingCalendar)}
                            className="px-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50"
                            title="Vytvořit nový kalendář"
                          >
                            <Plus className={`w-5 h-5 transition-transform ${isCreatingCalendar ? 'rotate-45' : ''}`} />
                          </button>
                        </div>
                        
                        <AnimatePresence>
                          {isCreatingCalendar && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
                                <input 
                                  type="text"
                                  placeholder="Např. Rozvrh 24/25..."
                                  value={newCalendarName}
                                  onChange={(e) => setNewCalendarName(e.target.value)}
                                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-all focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateCalendar}
                                  disabled={creating || !newCalendarName.trim()}
                                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                                >
                                  {creating ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <Check className="w-4 h-4" />}
                                  Vytvořit
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Notifikace</label>
                        <select 
                          value={notificationMinutes == null ? 'none' : notificationMinutes.toString()}
                          onChange={(e) => setNotificationMinutes(e.target.value === 'none' ? null : parseInt(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="none">Žádné upozornění</option>
                          <option value="5">5 minut předem</option>
                          <option value="15">15 minut předem</option>
                          <option value="30">30 minut předem</option>
                          <option value="60">1 hodina předem</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Frekvence automatizace</label>
                        <select 
                          value={(syncFrequency ?? 24).toString()}
                          onChange={(e) => setSyncFrequency(parseInt(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="0">Pouze manuálně</option>
                          <option value="6">Každých 6 hodin</option>
                          <option value="12">Každých 12 hodin</option>
                          <option value="24">Jednou denně</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Synchronizovat dopředu (týdnů)</label>
                        <select 
                          value={syncWeeks.toString()}
                          onChange={(e) => setSyncWeeks(parseInt(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="1">1 týden (pouze aktuální)</option>
                          <option value="2">2 týdny</option>
                          <option value="3">3 týdny</option>
                          <option value="4">4 týdny (měsíc)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-all disabled:opacity-70 shadow-lg shadow-emerald-600/20"
                >
                  {saving ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"/> : <Save className="w-5 h-5" />}
                  {saving ? 'Ukládám nastavení...' : 'Uložit nastavení'}
                </button>
                {isConnected && (
                  <button 
                    type="button" 
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-6 py-3 rounded-xl font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all disabled:opacity-70 shadow-sm"
                  >
                    <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Probíhá synchronizace...' : 'Synchronizovat nyní'}
                  </button>
                )}
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {isConnected && (
          <motion.div variants={itemVariants}>
            <GlassCard className="p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Barevné odlišení předmětů</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nastavte si vlastní barvy pro každý předmět ve vašem rozvrhu. (Aplikují se po synchronizaci)</p>
              </div>
              
              {uniqueSubjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uniqueSubjects.map(subject => {
                    const subjStr = subject as string;
                    const currentValue = subjectColors[subjStr] || '';
                    const selectedColor = googleColors.find(c => c.id === currentValue);
                    
                    return (
                      <div key={subjStr} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-xl transition-all hover:border-emerald-300 dark:hover:border-emerald-700 gap-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 break-words flex-1">{subjStr}</span>
                        <div className="flex items-center shrink-0 relative group">
                          {/* Custom Color Picker logic built-in using details/summary for simple dropdown without external state */}
                          <details className="relative">
                            <summary className="list-none cursor-pointer flex items-center justify-between w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium">
                              <span className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner" 
                                  style={{ backgroundColor: selectedColor ? selectedColor.background : 'transparent' }}
                                />
                                {selectedColor ? selectedColor.name : 'Výchozí'}
                              </span>
                            </summary>
                            
                            <div className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-56 grid grid-cols-4 gap-2">
                              <div className="col-span-4 text-xs text-slate-500 mb-1">Google podporuje jen těchto 11 barev:</div>
                              <label
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${!currentValue ? 'border-emerald-500' : 'border-transparent'}`}
                                title="Výchozí barva"
                              >
                                <input 
                                  type="radio" 
                                  name={`color-${subjStr}`} 
                                  value=""
                                  className="sr-only"
                                  checked={!currentValue}
                                  onChange={() => handleColorChange(subjStr, '')} 
                                />
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                   <span className="text-slate-400 text-xs">/</span>
                                </div>
                              </label>
                              
                              {googleColors.map(color => (
                                <label
                                  key={color.id}
                                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${currentValue === color.id ? 'border-emerald-500' : 'border-transparent'}`}
                                  title={color.name}
                                >
                                  <input 
                                    type="radio" 
                                    name={`color-${subjStr}`} 
                                    value={color.id}
                                    className="sr-only"
                                    checked={currentValue === color.id}
                                    onChange={() => handleColorChange(subjStr, color.id)} 
                                  />
                                  <div 
                                    className="w-7 h-7 rounded-full shadow-inner"
                                    style={{ backgroundColor: color.background }}
                                  />
                                </label>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 p-8 rounded-2xl text-center shadow-inner">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                    <CalendarDays className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-medium">Zatím nemáte stažený žádný rozvrh</div>
                  <div className="text-sm text-slate-500 mt-1">Uložte údaje k Škola OnLine a klikněte na "Synchronizovat nyní".</div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
