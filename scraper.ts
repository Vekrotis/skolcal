import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as ics from 'ics';
import { writeFileSync, readFileSync } from 'fs';

// Načtení proměnných prostředí z .env souboru
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;

async function uploadToSupabase() {
  const fileBuffer = readFileSync(path.resolve(__dirname, 'rozvrh.ics'));

  const response = await fetch(`${supabaseUrl}/storage/v1/object/rozvrhy/rozvrh.ics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'text/calendar',
      'cache-control': '3600',
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Chyba při nahrávání do Supabase:', errorText);
  } else {
    console.log('Rozvrh úspěšně nahrán / aktualizován v Supabase.');
  }
}

interface ScheduleLesson {
    subject: string;
    time: string;
    classroom: string;
    teacher: string;
    colspan?: number;
    students?: string;
    topic?: string;
    notes?: string;
    className?: string;
}

async function scrapeSchedule() {
    const username = process.env.SKOLA_ONLINE_USERNAME;
    const password = process.env.SKOLA_ONLINE_PASSWORD;

    if (!username || !password) {
        console.error('Chyba: Jméno nebo heslo není nastaveno v .env souboru.');
        process.exit(1);
    }

    console.log('Spouštím prohlížeč...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Naviguji na přihlašovací stránku Škola OnLine...');
        await page.goto('https://www.skolaonline.cz/prihlaseni/?', { waitUntil: 'domcontentloaded' });

        // Kliknutí na tlačítko pro přihlášení (pokud je potřeba přejít na samotný login formulář)
        // Příklad: await page.click('text=Přihlášení');
        // Přímá URL loginu bývá často něco jako: https://aplikace.skolaonline.cz/SOL/Prihlaseni.aspx
        await page.goto('https://www.skolaonline.cz/prihlaseni/?', { waitUntil: 'domcontentloaded' });

        console.log('Vyplňuji přihlašovací údaje...');
        // POZNÁMKA: Následující selektory je nutné upravit podle skutečného HTML Školy OnLine
        await page.screenshot({ path: 'debug.png', fullPage: true });
        await page.locator('#JmenoUzivatele').fill(username);
        await page.locator('#HesloUzivatele').fill(password);

        console.log('Přihlašuji se...');
        // Odklepnutí přihlášení
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.locator('#btnLogin').click()
        ]);

        console.log('Úspěšně přihlášeno. Přecházím na rozvrh...');
        // Zde případně doplnit navigaci přímo na stránku s rozvrhem, pokud není výchozí
        await page.goto('https://aplikace.skolaonline.cz/SOL/App/Kalendar/KZK001_KalendarTyden.aspx#', { waitUntil: 'domcontentloaded' });

        console.log('Extrahuje data z rozvrhu...');
        const html = await page.content();
        writeFileSync(path.resolve(__dirname, 'debug_schedule.html'), html);

        const lessons: ScheduleLesson[] = [];

        const lessonCells = page.locator('td[onmouseover*="onMouseOverTooltip"]');
        const count = await lessonCells.count();

        for (let i = 0; i < count; i++) {
            const cell = lessonCells.nth(i);
            const onMouseOver = await cell.getAttribute('onmouseover');
            
            const colSpanStr = await cell.evaluate((el: Element) => {
                const tdWithColspan = el.closest('td[colspan]');
                return tdWithColspan ? tdWithColspan.getAttribute('colspan') : '1';
            });
            const colSpan = parseInt(colSpanStr || '1', 10);
            const cellClass = await cell.getAttribute('class');

            if (onMouseOver) {
                const match = onMouseOver.match(/onMouseOverTooltip\('(.*?)','(.*?)'\)/);
                if (match) {
                    const subjectTitle = match[1].trim(); 
                    const tooltipData = match[2]; 

                    const parts = tooltipData.split('~');
                    const details: Record<string, string> = {};
                    for (let j = 0; j < parts.length; j += 2) {
                        if (j + 1 < parts.length) {
                            const key = parts[j].replace(':', '').trim();
                            const value = parts[j + 1].replace(/<[^>]*>?/gm, '').trim();
                            details[key] = value;
                        }
                    }

                    lessons.push({
                        subject: subjectTitle,
                        teacher: details['Učitel'] || '',
                        classroom: details['Učebna'] || '',
                        time: details['Den (vyuč. hodina)'] || '',
                        colspan: colSpan,
                        students: details['Žáci'] || '',
                        topic: details['Probrané učivo'] || '',
                        notes: details['Poznámka'] || '',
                        className: cellClass || undefined
                    });
                }
            }
        }

        console.log('Získaný rozvrh:');
        console.log(JSON.stringify(lessons, null, 2));

        console.log('Generuji iCalendar soubor...');
        const lessonTimes: Record<string, [number, number]> = {
            '0': [7, 0], '1': [8, 0], '2': [8, 55], '3': [9, 50],
            '4': [10, 55], '5': [11, 50], '6': [12, 45], '7': [13, 40],
            '8': [14, 30], '9': [15, 20], '10': [16, 10], '11': [17, 0],
            '12': [17, 50], '13': [18, 40]
        };

        const events: ics.EventAttributes[] = [];
        const currentYear = new Date().getFullYear();

        for (const lesson of lessons) {
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
            } else if (value) {
                let icsContent = value;
                const metadata = "X-PUBLISHED-TTL:PT15M\r\nREFRESH-INTERVAL;VALUE=DURATION:PT15M\r\n";
                icsContent = icsContent.replace(/BEGIN:VCALENDAR\r?\n/, `BEGIN:VCALENDAR\r\n${metadata}`);
                
                // Přidání barviček pro suplování a akce pomocí tagu COLOR
                icsContent = icsContent.replace(/CATEGORIES:SUPLOVANI\r?\n/g, 'CATEGORIES:SUPLOVANI\r\nCOLOR:tomato\r\n');
                icsContent = icsContent.replace(/CATEGORIES:AKCE\r?\n/g, 'CATEGORIES:AKCE\r\nCOLOR:mediumpurple\r\n');
                
                writeFileSync(path.resolve(__dirname, 'rozvrh.ics'), icsContent);
                console.log('Soubor rozvrh.ics byl úspěšně vytvořen.');
                await uploadToSupabase();
            }
        } else {
            console.log('Žádné hodiny nenalezeny, rozvrh.ics nebyl vytvořen.');
        }

        return lessons;

    } catch (error) {
        console.error('Došlo k chybě během scrapování:', error);
    } finally {
        console.log('Zavírám prohlížeč...');
        await browser.close();
    }
}

// Spuštění skriptu
scrapeSchedule();
