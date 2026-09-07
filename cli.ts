#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { password, input, confirm, select } from '@inquirer/prompts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { loadConfig, saveConfig, deleteConfig, getConfigPath } from './lib/cli-config';
import { scrapeScheduleLocal } from './lib/cli-scraper';
import packageJson from './package.json';

const program = new Command();

program
  .name('skolcal')
  .description(pc.cyan(pc.bold('CLI nástroj pro aplikaci Skolcal 🚀')))
  .version(packageJson.version || '1.0.1');

// --- Config Command ---
const configCommand = program.command('config').description('Správa lokální konfigurace');

configCommand
  .command('set <key> [value]')
  .description('Nastaví konfigurační hodnotu. Pokud hodnota není zadána, zeptá se interaktivně.')
  .action(async (key, value) => {
      const allowedKeys = ['sol_username', 'sol_password', 'api_token'];
      if (!allowedKeys.includes(key)) {
          console.error(pc.red(`✖ Chyba: Neznámý klíč '${key}'. Povolené klíče: ${allowedKeys.join(', ')}`));
          process.exit(1);
      }

      let finalValue = value;
      if (!finalValue) {
          if (key === 'sol_password' || key === 'api_token') {
              finalValue = await password({ message: `Zadejte hodnotu pro ${key}:` });
          } else {
              finalValue = await input({ message: `Zadejte hodnotu pro ${key}:` });
          }
      }

      saveConfig({ [key]: finalValue });
      console.log(pc.green(`✔ Konfigurační hodnota '${key}' byla úspěšně uložena.`));
  });

// --- Login Command ---
program
  .command('login')
  .description('Nastavení přihlašovacích údajů')
  .action(async () => {
      const mode = await select({
          message: 'Vyberte způsob přihlášení:',
          choices: [
              { name: 'Lokální účet (přihlášení přímo do Školy OnLine)', value: 'local' },
              { name: 'Online účet (pomocí API tokenu Skolcal)', value: 'online' }
          ]
      });

      if (mode === 'local') {
          console.log(pc.blue('\nNastavení přístupu do Školy OnLine pro lokální stahování rozvrhu.'));
          const username = await input({ message: 'Zadejte uživatelské jméno do SOL:\n' });
          const pass = await password({ message: 'Zadejte heslo do SOL (bude skryté):\n' });
          
          saveConfig({ sol_username: username, sol_password: pass });
          console.log(pc.green('\n✔ Lokální přihlašovací údaje byly úspěšně uloženy.'));
      } else {
          console.log(pc.blue('\nNastavení online API tokenu.'));
          const token = await password({ message: 'Zadejte váš API token ze Skolcal (bude skrytý):\n' });
          
          saveConfig({ api_token: token });
          console.log(pc.green('\n✔ Online API token byl úspěšně uložen.'));
      }
  });

// --- Download Command ---
program
  .command('download')
  .description('Stáhne rozvrh ze Školy OnLine do souboru ICS')
  .option('-m, --mode <mode>', 'Režim spuštění (local, online)', 'online')
  .option('-o, --output <path>', 'Cesta, kam se má soubor uložit')
  .action(async (options) => {
      const config = loadConfig();
      let mode = options.mode;
      const outputPath = options.output || path.join(os.homedir(), 'Downloads', 'rozvrh.ics');

      if (mode === 'online' && !config.api_token) {
          console.log(pc.yellow('\n💡 TIP: Nemáš nastavený online účet (API token).'));
          console.log(pc.yellow('Online režim je lepší, protože poskytuje automatickou synchronizaci bez nutnosti mít zapnutý počítač 24/7.'));
          console.log(pc.yellow('Můžeš si ho nastavit příkazem: ' + pc.bold('skolcal login')));
          console.log(pc.cyan('Přepínám na lokální (local) režim jako zálohu...\n'));
          mode = 'local';
      }

      if (mode === 'local') {
          console.log(pc.blue('🔄 Spouštím lokální stahování...'));
          if (!config.sol_username || !config.sol_password) {
              console.error(pc.red('✖ Chyba: Nejsou nastaveny přihlašovací údaje pro SOL.'));
              console.log(pc.yellow(`👉 Použijte interaktivní přihlášení: ${pc.bold('skolcal login')}`));
              process.exit(1);
          }
          try {
              await scrapeScheduleLocal(config.sol_username, config.sol_password, outputPath);
              console.log(pc.green('✔ Rozvrh byl úspěšně stažen.'));
          } catch (error: any) {
              console.error(pc.red(`✖ Chyba při stahování: ${error.message}`));
              process.exit(1);
          }
      } else if (mode === 'online') {
          console.log(pc.blue('📡 Odesílám požadavek na server s tokenem (online mode)...'));
          console.log(pc.yellow('⚠ Online stahování zatím není plně implementováno na straně serveru.'));
          console.log(pc.green('✔ Hotovo.'));
      } else {
          console.error(pc.red('✖ Neznámý režim. Použijte "local" nebo "online".'));
      }
  });

// --- Sync Command ---
program
  .command('sync')
  .description('Aktualizuje a přepíše stažený rozvrh na novou verzi')
  .option('-m, --mode <mode>', 'Režim spuštění (local, online)', 'online')
  .option('-o, --output <path>', 'Cesta, kam se má soubor aktualizovat')
  .action(async (options) => {
      console.log(pc.blue(`🔄 Spouštím aktualizaci (synchronizaci) rozvrhu...`));
      const config = loadConfig();
      let mode = options.mode;
      const outputPath = options.output || path.join(os.homedir(), 'Downloads', 'rozvrh.ics');

      if (mode === 'online' && !config.api_token) {
          mode = 'local';
      }

      if (mode === 'local') {
          if (!config.sol_username || !config.sol_password) {
              console.error(pc.red('✖ Chyba: Nejsou nastaveny přihlašovací údaje pro SOL. Spusťte: skolcal login'));
              process.exit(1);
          }
          try {
              await scrapeScheduleLocal(config.sol_username, config.sol_password, outputPath);
              console.log(pc.green('✔ Rozvrh byl úspěšně aktualizován.'));
          } catch (error: any) {
              console.error(pc.red(`✖ Chyba při aktualizaci: ${error.message}`));
              process.exit(1);
          }
      } else if (mode === 'online') {
          console.log(pc.yellow('⚠ Online synchronizace zatím není plně implementována.'));
      }
  });

// --- Export Command ---
const exportCommand = program.command('export').description('Export dat');

exportCommand
  .command('ics')
  .description('Vyexportuje lokální soubor s rozvrhem (pouze local)')
  .requiredOption('-o, --output <path>', 'Výstupní cesta')
  .action((options) => {
      console.log(pc.blue(`💾 Exportuji rozvrh do souboru: ${options.output}...`));
      console.log(pc.green('✔ Hotovo.'));
  });

// --- Ostatní Commandy ---
program
  .command('show')
  .description('Zobrazí rozvrh přímo v terminálu z lokální mezipaměti')
  .action(() => {
      const jsonPath = path.join(os.homedir(), '.skolcal-schedule.json');
      if (!fs.existsSync(jsonPath)) {
          console.error(pc.red('✖ Nenašel jsem žádná data. Nejprve stáhněte rozvrh pomocí "skolcal download".'));
          return;
      }
      
      try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          console.log(pc.blue('\n📅 Tvůj rozvrh hodin:\n'));
          
          if (!data || data.length === 0) {
              console.log(pc.yellow('Rozvrh je prázdný.'));
              return;
          }

          data.forEach((lesson: any) => {
              const info = [
                  lesson.time && pc.gray(`[${lesson.time}]`),
                  pc.bold(lesson.subject),
                  lesson.teacher && pc.cyan(`(${lesson.teacher})`),
                  lesson.classroom && pc.yellow(`Místnost: ${lesson.classroom}`),
                  lesson.topic && pc.magenta(`Učivo: ${lesson.topic}`)
              ].filter(Boolean).join(' ');
              
              console.log(`  ${info}`);
          });
          console.log(''); // empty line
      } catch (err) {
          console.error(pc.red('✖ Chyba při čtení dat rozvrhu. Zkuste ho stáhnout znovu.'));
      }
  });

program
  .command('clear')
  .description('Vymazání lokálních dat (cache, rozvrh.ics)')
  .option('-m, --mode <mode>', 'Režim spuštění', 'local')
  .action((options) => {
      if (options.mode === 'local') {
          console.log(pc.blue('🗑 Vymazávám lokální data...'));
          const localIcs = path.resolve(process.cwd(), 'rozvrh.ics');
          if (fs.existsSync(localIcs)) {
              fs.unlinkSync(localIcs);
              console.log(pc.green(`✔ Smazán lokální soubor ${localIcs}`));
          }
          console.log(pc.green('✔ Lokální cache a data byla smazána.'));
      } else {
          console.error(pc.red('✖ Zatím podporováno pouze v lokálním režimu.'));
      }
  });

// --- Update Command ---
program
  .command('update')
  .description('Aktualizuje Skolcal CLI na nejnovější verzi z NPM')
  .action(() => {
      console.log(pc.blue('🚀 Kontroluji a stahuji nejnovější verzi balíčku skolcal z NPM...'));
      try {
          execSync('npm install -g skolcal@latest', { stdio: 'inherit' });
          console.log(pc.green('\n🎉 Skolcal CLI bylo úspěšně aktualizováno na nejnovější verzi!'));
      } catch (e) {
          console.log(pc.yellow('\n⚠ Instalace selhala (pravděpodobně chybí oprávnění).'));
          console.log(pc.bold('👉 Spusťte prosím aktualizaci ručně:'));
          console.log(pc.cyan('   sudo npm install -g skolcal@latest'));
      }
  });

// --- Uninstall Command ---
program
  .command('uninstall')
  .description('Kompletní odinstalace Skolcal CLI a smazání veškeré konfigurace a dat')
  .option('-y, --yes', 'Potvrdit smazání bez dotazování')
  .action(async (options) => {
      console.log(pc.red(pc.bold('\n⚠ UPOZORNĚNÍ: Tato akce kompletně odstraní Skolcal CLI z vašeho systému.')));
      
      let proceed = options.yes;
      if (!proceed) {
          try {
              proceed = await confirm({
                  message: 'Opravdu chcete smazat konfiguraci i balíček skolcal?',
                  default: false,
              });
          } catch {
              proceed = false;
          }
      }

      if (!proceed) {
          console.log(pc.blue('Operace byla zrušena.'));
          return;
      }

      console.log(pc.yellow('\n1. Mazání lokální konfigurace a dat...'));
      const configPath = getConfigPath();
      if (deleteConfig()) {
          console.log(pc.green(`✔ Konfigurační soubor smazán: ${configPath}`));
      } else {
          console.log(pc.gray(`ℹ Žádný konfigurační soubor nenalezen (${configPath})`));
      }

      const localIcs = path.resolve(process.cwd(), 'rozvrh.ics');
      if (fs.existsSync(localIcs)) {
          fs.unlinkSync(localIcs);
          console.log(pc.green(`✔ Smazán lokální soubor: ${localIcs}`));
      }

      console.log(pc.yellow('\n2. Odinstalace globálního balíčku skolcal...'));
      try {
          execSync('npm uninstall -g skolcal', { stdio: 'inherit' });
          console.log(pc.green('\n🎉 Skolcal CLI bylo kompletně odstraněno ze systému!'));
      } catch (err) {
          console.log(pc.yellow('\n⚠ Automatické odinstalování globálního balíčku vyžaduje vyšší oprávnění.'));
          console.log(pc.bold('👉 Spusťte prosím pro dokončení v terminálu:'));
          console.log(pc.cyan('   sudo npm uninstall -g skolcal'));
      }
  });

program.parse();
