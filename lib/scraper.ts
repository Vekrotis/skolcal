import { chromium } from 'playwright';

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

export async function scrapeScheduleData(username: string, password: string): Promise<ScheduleLesson[]> {
    if (!username || !password) {
        throw new Error('Chybí přihlašovací údaje.');
    }

    console.log('Spouštím prohlížeč (API)...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Naviguji na přihlašovací stránku Škola OnLine...');
        await page.goto('https://www.skolaonline.cz/prihlaseni/?', { waitUntil: 'domcontentloaded' });
        
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
        
        return lessons;
    } catch (error) {
        console.error('Došlo k chybě během scrapování:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
