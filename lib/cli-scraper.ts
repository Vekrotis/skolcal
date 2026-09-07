import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import * as ics from 'ics';
import { writeFileSync } from 'fs';
import * as os from 'os';
import { generateIcs } from './ics-generator';

chromium.use(stealth());

export interface ScheduleLesson {
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

export async function scrapeScheduleLocal(username: string, password: string, outputPath: string) {
    if (!username || !password) {
        throw new Error('Jméno nebo heslo pro Škola OnLine není nastaveno.');
    }

    console.log('Spouštím prohlížeč pro lokální scrapování...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Naviguji na přihlašovací stránku Škola OnLine...');
        await page.goto('https://www.skolaonline.cz/prihlaseni/?', { waitUntil: 'domcontentloaded' });

        console.log('Vyplňuji přihlašovací údaje...');
        await page.locator('#JmenoUzivatele').fill(username);
        await page.locator('#HesloUzivatele').fill(password);

        console.log('Přihlašuji se...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.locator('#btnLogin').click()
        ]);

        console.log('Úspěšně přihlášeno. Přecházím na rozvrh...');
        await page.goto('https://aplikace.skolaonline.cz/SOL/App/Kalendar/KZK001_KalendarTyden.aspx#', { waitUntil: 'domcontentloaded' });

        console.log('Extrahuje data z rozvrhu...');
        
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
        console.log(`Nalezeno ${lessons.length} hodin.`);

        console.log('Generuji iCalendar soubor...');
        const icsContent = generateIcs(lessons);
        
        if (icsContent) {
            writeFileSync(outputPath, icsContent);
            console.log(`Soubor úspěšně vytvořen: ${outputPath}`);
        } else {
            console.log('ICS soubor nebyl vytvořen (žádné hodiny nebo chyba generování).');
        }

        const jsonPath = path.join(os.homedir(), '.skolcal-schedule.json');
        writeFileSync(jsonPath, JSON.stringify(lessons, null, 2));

        return lessons;

    } catch (error) {
        console.error('Došlo k chybě během scrapování:', error);
        throw error;
    } finally {
        console.log('Zavírám prohlížeč...');
        await browser.close();
    }
}
