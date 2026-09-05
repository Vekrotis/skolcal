import { scrapeScheduleData } from './lib/scraper';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
(async () => {
    try {
        const data = await scrapeScheduleData(process.env.SKOLA_ONLINE_USERNAME!, process.env.SKOLA_ONLINE_PASSWORD!);
        console.log("Got lessons:", data.length);
        if (data.length > 0) {
            console.log("First lesson time:", data[0].time);
            console.log("All times:");
            data.slice(0,5).forEach((l: any) => console.log(l.time));
        }
    } catch(e) {
        console.error(e);
    }
})();
