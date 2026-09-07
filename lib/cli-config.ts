import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.skolcal-cli.json');

export interface CliConfig {
    sol_username?: string;
    sol_password?: string;
    api_token?: string;
}

export function loadConfig(): CliConfig {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(data) as CliConfig;
        }
    } catch (e) {
        console.error('Nepodařilo se načíst konfiguraci:', e);
    }
    return {};
}

export function saveConfig(config: CliConfig) {
    try {
        const currentConfig = loadConfig();
        const merged = { ...currentConfig, ...config };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });
        console.log(`Konfigurace úspěšně uložena do ${CONFIG_PATH}`);
    } catch (e) {
        console.error('Nepodařilo se uložit konfiguraci:', e);
    }
}

export function deleteConfig(): boolean {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
            return true;
        }
    } catch (e) {
        console.error('Nepodařilo se smazat konfiguraci:', e);
    }
    return false;
}

export function getConfigPath(): string {
    return CONFIG_PATH;
}
