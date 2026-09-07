import * as ics from 'ics';
import { ScheduleLesson } from './cli-scraper';

export function generateIcs(lessons: ScheduleLesson[]): string | null {
    const lessonTimes: Record<string, [number, number]> = {
        '0': [7, 0], '1': [8, 0], '2': [8, 55], '3': [9, 50],
        '4': [10, 55], '5': [11, 50], '6': [12, 45], '7': [13, 40],
        '8': [14, 30], '9': [15, 20], '10': [16, 10], '11': [17, 0],
        '12': [17, 50], '13': [18, 40]
    };

    const events: ics.EventAttributes[] = [];
    const currentYear = new Date().getFullYear();

    for (const lesson of lessons) {
        if (!lesson.time) continue;
        const timeMatch = lesson.time.match(/(\d+)\.\s*(\d+)\.\s*\((\d+)\)/);
        if (timeMatch) {
            const day = parseInt(timeMatch[1], 10);
            const month = parseInt(timeMatch[2], 10);
            const lessonIndex = timeMatch[3];

            const timeTuple = lessonTimes[lessonIndex];
            if (timeTuple) {
                const startIdx = parseInt(lessonIndex, 10);
                const colSpan = lesson.colspan || 1;
                const endIdx = startIdx + colSpan - 1;
                
                const startTuple = timeTuple;
                const endTuple = lessonTimes[endIdx.toString()] || timeTuple;
                
                const startTotalMins = startTuple[0] * 60 + startTuple[1];
                const endTotalMins = endTuple[0] * 60 + endTuple[1] + 45;
                const durationMins = endTotalMins - startTotalMins;

                let desc = `Vyučující: ${lesson.teacher}`;
                if (lesson.students) desc += `\nSkupina: ${lesson.students}`;
                if (lesson.topic) desc += `\nUčivo: ${lesson.topic}`;
                if (lesson.notes) desc += `\nPoznámka: ${lesson.notes}`;

                let categories: string[] | undefined = undefined;
                let eventTitle = lesson.subject || 'Neznámý předmět';
                
                if (lesson.className && lesson.className.includes('KuvSuplovanaHodina')) {
                    categories = ['SUPLOVANI'];
                    eventTitle = `[Změna] ${eventTitle}`;
                } else if (lesson.className && lesson.className.includes('KuvSkolniAkceHodina')) {
                    categories = ['AKCE'];
                    eventTitle = `[Akce] ${eventTitle}`;
                }

                events.push({
                    title: eventTitle,
                    location: lesson.classroom,
                    description: desc,
                    categories: categories,
                    start: [currentYear, month, day, startTuple[0], startTuple[1]],
                    duration: { minutes: durationMins },
                    alarms: [{
                        action: 'display',
                        description: 'Začátek hodiny',
                        trigger: { minutes: 0, before: true }
                    }]
                });
            }
        }
    }

    if (events.length > 0) {
        const { error, value } = ics.createEvents(events);
        if (error) {
            console.error('Chyba při generování ICS:', error);
            return null;
        } else if (value) {
            let icsContent = value;
            const metadata = "X-PUBLISHED-TTL:PT15M\r\nREFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n";
            icsContent = icsContent.replace(/BEGIN:VCALENDAR\r?\n/, `BEGIN:VCALENDAR\r\n${metadata}`);
            
            icsContent = icsContent.replace(/CATEGORIES:SUPLOVANI\r?\n/g, 'CATEGORIES:SUPLOVANI\r\nCOLOR:tomato\r\n');
            icsContent = icsContent.replace(/CATEGORIES:AKCE\r?\n/g, 'CATEGORIES:AKCE\r\nCOLOR:mediumpurple\r\n');
            return icsContent;
        }
    }
    
    return null;
}
