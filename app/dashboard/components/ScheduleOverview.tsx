'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, User, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { parse, startOfWeek, format, isValid, addDays } from 'date-fns'
import { cs } from 'date-fns/locale'

// Same as in scraper
interface ScheduleLesson {
  subject: string;
  time: string; // e.g. "2. 9. (1)" - Day. Month. (Lesson Index)
  classroom: string;
  teacher: string;
  colspan?: number;
  students?: string;
  topic?: string;
  notes?: string;
  className?: string;
}

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek']
const TIMES = [
  '7:00 - 7:45',
  '8:00 - 8:45',
  '8:55 - 9:40',
  '9:50 - 10:35',
  '10:55 - 11:40',
  '11:50 - 12:35',
  '12:45 - 13:30',
  '13:40 - 14:25',
  '14:30 - 15:15',
  '15:20 - 16:05'
]

const GOOGLE_COLORS: Record<string, { bg: string, text: string }> = {
  '1': { bg: '#a4bdfc', text: '#1d1d1d' }, // Levandulová
  '2': { bg: '#7ae7bf', text: '#1d1d1d' }, // Šalvějová
  '3': { bg: '#dbadff', text: '#1d1d1d' }, // Hroznová
  '4': { bg: '#ff887c', text: '#1d1d1d' }, // Plameňáková
  '5': { bg: '#fbd75b', text: '#1d1d1d' }, // Banánová
  '6': { bg: '#ffb878', text: '#1d1d1d' }, // Mandarinková
  '7': { bg: '#46d6db', text: '#1d1d1d' }, // Paví
  '8': { bg: '#e1e1e1', text: '#1d1d1d' }, // Grafitová
  '9': { bg: '#5484ed', text: '#1d1d1d' }, // Borůvková
  '10': { bg: '#51b749', text: '#1d1d1d' }, // Bazalková
  '11': { bg: '#dc2127', text: '#ffffff' }  // Rajčatová
}

// Map subject names to beautiful Tailwind colors
const SUBJECT_COLORS: Record<string, string> = {
  'M': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'ČJ': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 border-rose-200 dark:border-rose-800',
  'AJ': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  'F': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  'D': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  'Z': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200 border-teal-200 dark:border-teal-800',
  'TV': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  'DEFAULT': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
}

function getSubjectColor(subject: string) {
  for (const key in SUBJECT_COLORS) {
    if (subject.includes(key)) return SUBJECT_COLORS[key]
  }
  return SUBJECT_COLORS['DEFAULT']
}

export function ScheduleOverview({ data, subjectColors = {} }: { data: ScheduleLesson[], subjectColors?: Record<string, string> }) {
  const [isMobile, setIsMobile] = useState(false)
  const [activeDay, setActiveDay] = useState(0) // 0-4 (Mon-Fri)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>('')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Group data by week
  const weekGroups = new Map<string, ScheduleLesson[]>()
  
  data.forEach(lesson => {
    const timeMatch = lesson.time.match(/(\d+\.\s*\d+\.)/)
    if (timeMatch) {
      const currentYear = new Date().getFullYear()
      const dateStr = `${timeMatch[1]} ${currentYear}`
      const dateObj = parse(dateStr, 'd. M. yyyy', new Date())
      if (isValid(dateObj)) {
        const monday = startOfWeek(dateObj, { weekStartsOn: 1 })
        const mondayStr = format(monday, 'yyyy-MM-dd')
        
        if (!weekGroups.has(mondayStr)) {
          weekGroups.set(mondayStr, [])
        }
        weekGroups.get(mondayStr)!.push(lesson)
      }
    }
  })

  const availableWeeks = Array.from(weekGroups.keys()).sort()
  
  useEffect(() => {
    if (availableWeeks.length > 0 && !selectedWeekStart) {
      const today = startOfWeek(new Date(), { weekStartsOn: 1 })
      const todayStr = format(today, 'yyyy-MM-dd')
      
      if (availableWeeks.includes(todayStr)) {
         setSelectedWeekStart(todayStr)
      } else {
         setSelectedWeekStart(availableWeeks[0]) // default to first available
      }
    }
  }, [availableWeeks, selectedWeekStart])

  const displayData = selectedWeekStart && weekGroups.has(selectedWeekStart) 
    ? weekGroups.get(selectedWeekStart)! 
    : data

  const handlePrevWeek = () => {
    const idx = availableWeeks.indexOf(selectedWeekStart)
    if (idx > 0) setSelectedWeekStart(availableWeeks[idx - 1])
  }

  const handleNextWeek = () => {
    const idx = availableWeeks.indexOf(selectedWeekStart)
    if (idx < availableWeeks.length - 1) setSelectedWeekStart(availableWeeks[idx + 1])
  }

  const DAY_PREFIXES: Record<string, number> = {
    'Po': 0,
    'Út': 1,
    'St': 2,
    'Čt': 3,
    'Pá': 4
  }

  const getLessonsForDay = (dayIdx: number) => {
    return displayData.filter(lesson => {
      const prefix = lesson.time.substring(0, 2)
      return DAY_PREFIXES[prefix] === dayIdx
    })
  }

  const headerDates: string[] = ['', '', '', '', '']
  displayData.forEach(lesson => {
    const prefix = lesson.time.substring(0, 2)
    const dayIdx = DAY_PREFIXES[prefix]
    if (dayIdx !== undefined) {
      const match = lesson.time.match(/(\d+\.\s*\d+\.)/)
      if (match) {
        headerDates[dayIdx] = match[1]
      }
    }
  })

  // Format week label
  const formatWeekLabel = (mondayStr: string) => {
    if (!mondayStr) return ''
    const monday = parse(mondayStr, 'yyyy-MM-dd', new Date())
    const friday = addDays(monday, 4)
    return `${format(monday, 'd. M.', { locale: cs })} - ${format(friday, 'd. M.', { locale: cs })}`
  }

  const renderLessonCard = (lesson: ScheduleLesson) => {
    const subjectColorId = subjectColors[lesson.subject.trim()]
    const customColor = subjectColorId ? GOOGLE_COLORS[subjectColorId] : null
    const fallbackClasses = getSubjectColor(lesson.subject)
    
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={`w-full h-full p-2 rounded-lg border ${!customColor ? fallbackClasses : 'border-black/10 dark:border-white/10'} ${lesson.className?.includes('KuvSuplovanaHodina') ? 'ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-900' : ''} flex flex-col relative z-10 cursor-default`}
        style={customColor ? { backgroundColor: customColor.bg, color: customColor.text } : undefined}
      >
        <div className="font-bold text-sm line-clamp-1">{lesson.subject}</div>
        <div className="text-xs opacity-80 mt-auto flex justify-between">
          <span className="truncate max-w-[50%]">{lesson.classroom}</span>
          <span className="truncate max-w-[50%]">{lesson.teacher.split(' ')[0]}</span>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute hidden group-hover:block z-[100] w-64 bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white p-4 rounded-xl shadow-2xl -top-2 left-full ml-2 pointer-events-none">
          <h4 className="font-bold text-lg mb-2 text-white">{lesson.subject}</h4>
          <div className="space-y-1 text-sm text-slate-300">
            <p><strong className="text-white">Učitel:</strong> {lesson.teacher}</p>
            <p><strong className="text-white">Učebna:</strong> {lesson.classroom}</p>
            {lesson.topic && <p><strong className="text-white">Téma:</strong> {lesson.topic}</p>}
            {lesson.notes && <p><strong className="text-white">Poznámka:</strong> {lesson.notes}</p>}
            {lesson.className?.includes('KuvSuplovanaHodina') && (
              <span className="inline-block mt-2 bg-rose-500/20 text-rose-300 px-2 py-1 rounded text-xs font-bold border border-rose-500/30">
                SUPLOVÁNÍ / ZMĚNA
              </span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Week Selector */}
      {availableWeeks.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit mb-2">
          <button 
            onClick={handlePrevWeek} 
            disabled={availableWeeks.indexOf(selectedWeekStart) === 0}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 font-semibold text-sm min-w-[150px] text-center">
            {formatWeekLabel(selectedWeekStart)}
          </div>
          <button 
            onClick={handleNextWeek} 
            disabled={availableWeeks.indexOf(selectedWeekStart) === availableWeeks.length - 1}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col gap-6">
          <div className="flex overflow-x-auto pb-2 -mx-4 px-4 snap-x hide-scrollbar">
            <div className="flex gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(idx)}
                  className={`snap-center shrink-0 px-6 py-3 rounded-2xl font-medium transition-all ${
                    activeDay === idx
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="text-sm opacity-80">{headerDates[idx] || ''}</div>
                  <div className="text-lg">{day}</div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay + selectedWeekStart}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {getLessonsForDay(activeDay).length === 0 ? (
                <div className="text-center p-8 text-slate-500">Žádná výuka</div>
              ) : (
                getLessonsForDay(activeDay).map((lesson, i) => {
                  const match = lesson.time.match(/\((\d+)\)/)
                  const lessonIdx = match ? parseInt(match[1]) : 0
                  const timeStr = TIMES[lessonIdx] || ''
                  
                  const subjectColorId = subjectColors[lesson.subject.trim()]
                  const customColor = subjectColorId ? GOOGLE_COLORS[subjectColorId] : null
                  const borderColor = customColor ? customColor.bg : (lesson.className?.includes('KuvSuplovanaHodina') ? '#f43f5e' : '#6366f1')

                  return (
                    <GlassCard key={i} className="p-4 border-l-4" style={{ borderLeftColor: borderColor }}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{lesson.subject}</h4>
                        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {timeStr}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mt-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 opacity-70" />
                          <span className="truncate">{lesson.teacher}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 opacity-70" />
                          <span className="truncate">{lesson.classroom}</span>
                        </div>
                        {lesson.topic && (
                          <div className="flex items-center gap-1.5 col-span-2 mt-1 text-xs">
                            <BookOpen className="w-4 h-4 opacity-70 shrink-0" />
                            <span className="line-clamp-2">{lesson.topic}</span>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  )
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-4">
          <div className="min-w-[1000px] border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950 shadow-sm">
            <div className="grid grid-cols-6 border-b border-slate-200 dark:border-slate-800 rounded-t-3xl overflow-hidden">
              <div className="p-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <Clock className="w-5 h-5 text-slate-400 mx-auto" />
              </div>
            {DAYS.map((day, idx) => (
              <div key={day} className="p-4 text-center font-semibold border-r border-slate-200 dark:border-slate-800 last:border-0 bg-slate-50/50 dark:bg-slate-900/50">
                {day} <span className="block text-xs font-normal text-slate-500">{headerDates[idx]}</span>
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {TIMES.map((time, timeIdx) => (
              <div key={timeIdx} className="grid grid-cols-6">
                <div className="px-2 py-3 text-xs font-medium text-slate-500 text-center border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/30 whitespace-nowrap">
                  <span className="opacity-60 text-[10px] uppercase">{timeIdx}. hodina</span>
                  <span>{time.replace(' - ', '-')}</span>
                </div>

                {DAYS.map((_, dayIdx) => {
                  const lessons = getLessonsForDay(dayIdx)
                  const lesson = lessons.find(l => {
                    const match = l.time.match(/\((\d+)\)/)
                    return match && parseInt(match[1]) === timeIdx
                  })

                  return (
                    <div key={`${dayIdx}-${timeIdx}`} className="border-r border-slate-200 dark:border-slate-800 last:border-0 p-1.5 min-h-[5rem] relative group">
                      {lesson && renderLessonCard(lesson)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
