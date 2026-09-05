const lessons = [
  { time: "1. 9. (1)" },
  { time: "12. 10. (11)" },
  { time: "Úterý 1.9.2026 (1. vyuč. hodina)" },
  { time: "Pondělí 14. 5. (3)" },
  { time: "Středa (1. vyuč. hodina)" }, 
]

for (const lesson of lessons) {
  const timeMatch = lesson.time.match(/(\d+)\.\s*(\d+)\.[\s\S]*?\((\d+)/)
  if (timeMatch) {
    const eventDate = `${timeMatch[1]}.${timeMatch[2]}.${new Date().getFullYear()}`
    const period = timeMatch[3]
    console.log(`Matched '${lesson.time}': Date: ${eventDate}, Period: ${period}`)
  } else {
    console.log(`Failed to match '${lesson.time}'`)
  }
}
