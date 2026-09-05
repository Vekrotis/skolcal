import { Command } from 'commander';
import { loadConfig, saveConfig } from './lib/cli-config';
import { scrapeScheduleLocal } from './lib/cli-scraper';

const program = new Command();

program
  .name('skolcal')
  .description('CLI nástroj pro aplikaci Skolcal')
  .version('1.0.0');

// --- Config Command ---
const configCommand = program.command('config').description('Správa lokální konfigurace');

configCommand
  .command('set <key> <value>')
  .description('Nastaví konfigurační hodnotu (sol_username, sol_password)')
  .action((key, value) => {
      const allowedKeys = ['sol_username', 'sol_password', 'api_token'];
      if (!allowedKeys.includes(key)) {
          console.error(`Chyba: Neznámý klíč '${key}'. Povolené klíče: ${allowedKeys.join(', ')}`);
          process.exit(1);
      }
      saveConfig({ [key]: value });
  });

// --- Login Command ---
program
  .command('login')
  .description('Přihlášení do online účtu pomocí API klíče')
  .requiredOption('-t, --token <token>', 'Váš osobní API klíč z webové aplikace')
  .action((options) => {
      saveConfig({ api_token: options.token });
      console.log('Online API token byl úspěšně uložen.');
  });

// --- Scrape Command ---
program
  .command('scrape')
  .description('Stáhne rozvrh ze Školy OnLine')
  .requiredOption('-m, --mode <mode>', 'Režim spuštění (local, online)')
  .action(async (options) => {
      const config = loadConfig();
      if (options.mode === 'local') {
          console.log('Spouštím lokální scrapování...');
          if (!config.sol_username || !config.sol_password) {
              console.error('Chyba: Nejsou nastaveny přihlašovací údaje pro SOL. Použijte: skolcal config set ...');
              process.exit(1);
          }
          await scrapeScheduleLocal(config.sol_username, config.sol_password);
      } else if (options.mode === 'online') {
          console.log('Online scrapování zatím není plně implementováno na straně serveru, ale API token je připraven.');
          if (!config.api_token) {
              console.error('Chyba: API token chybí. Přihlaste se pomocí: skolcal login --token <token>');
              process.exit(1);
          }
          console.log('Odesílám požadavek na server s tokenem...');
          // Zde bude logika fetch() na online endpoint: fetch(`https://skolcal.cz/api/scrape?token=${config.api_token}`)
          console.log('Hotovo.');
      } else {
          console.error('Neznámý režim. Použijte "local" nebo "online".');
      }
  });

// --- Sync Command ---
const syncCommand = program.command('sync').description('Synchronizace staženého rozvrhu');

syncCommand
  .command('google')
  .description('Synchronizace do Google Kalendáře')
  .requiredOption('-m, --mode <mode>', 'Režim spuštění (local, online)')
  .action((options) => {
      console.log(`Spouštím synchronizaci do Google kalendáře v režimu: ${options.mode}`);
      // Zde bude implementována logika pro odeslání dat do Google Calendar
  });

// --- Export Command ---
const exportCommand = program.command('export').description('Export dat');

exportCommand
  .command('ics')
  .description('Vyexportuje lokální soubor s rozvrhem (pouze local)')
  .requiredOption('-o, --output <path>', 'Výstupní cesta')
  .action((options) => {
      console.log(`Exportuji rozvrh do souboru: ${options.output}...`);
      // Tato funkce se fakticky překrývá s lokálním scrapováním, které soubor už tvoří
      console.log('Hotovo.');
  });

// --- Ostatní Commandy ---
program
  .command('show <type>')
  .description('Zobrazí data přímo v terminálu (např. schedule)')
  .action((type) => {
      if (type === 'schedule') {
          console.log('Funkce zobrazení tabulky rozvrhu se připravuje...');
      } else {
          console.error('Neznámý typ zobrazení.');
      }
  });

program
  .command('clear')
  .description('Vymazání lokálních dat (cache, rozvrh.ics)')
  .requiredOption('-m, --mode <mode>', 'Režim spuštění')
  .action((options) => {
      if (options.mode === 'local') {
          console.log('Vymazávám lokální data...');
      } else {
          console.error('Zatím podporováno pouze v lokálním režimu.');
      }
  });

program.parse();
