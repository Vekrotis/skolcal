Aplikace **Skolcal** slouží k **automatickému přenosu a synchronizaci školního rozvrhu ze systému Škola OnLine (SOL) do osobních kalendářů studentů** (Google Kalendář, Apple Kalendář, Outlook apod.) s podporou pro suplování, vlastní barvy předmětů a notifikace.

---

### 1. O čem aplikace je a jaký problém řeší

Systém **Škola OnLine** neposkytuje pohodlný a přímý způsob, jak mít aktuální rozvrh s reálnými změnami a suplováním v běžném mobilním kalendáři. 

**Skolcal** tento problém řeší tím, že:
- Automaticky stahuje rozvrh ze Školy OnLine včetně suplovaných hodin, poznámek, témat a učeben.
- Zobrazuje moderní webový rozvrh s týdenním i mobilním zobrazením.
- Nabízí dva způsoby exportu: **přímou synchronizaci do Google Kalendáře** (s volbou barev a notifikací) nebo **veřejný ICS odběr** (pro Apple Kalendář, Outlook a další).

---

### 2. Co všechno umí (Funkce)

1. **Uživatelské účty a zabezpečení:**
   - Přihlašování přes OAuth (Google a Discord) přes Supabase Auth ([`Login`](file:///Users/vekro/Documents/GitHub/skolcal/app/login/page.tsx)).
   - Ochrana tras a sezení pomocí Next.js middleware ([`middleware.ts`](file:///Users/vekro/Documents/GitHub/skolcal/middleware.ts)).
   - Bezpečné oddělení dat uživatelů na úrovni databáze (PostgreSQL Row Level Security – RLS).

2. **Webový dashboard s interaktivním rozvrhem:**
   - **Týdenní mřížka:** Přehledné zobrazení pondělí až pátek se standardními vyučovacími časy (1.–10. hodina) a podporou vícehodinových bloků (`colspan`).
   - **Detekce a zvýraznění suplování / akcí:** Hodiny se suplováním (`KuvSuplovanaHodina`) jsou orámované a označené štítkem `SUPLOVÁNÍ / ZMĚNA`.
   - **Detailní náhled:** Po najetí myší (tooltip) se zobrazí vyučující, učebna, téma hodiny a poznámka.
   - **Přepínání týdnů:** Možnost procházet jednotlivé týdny dopředu i do historie.
   - **Mobilní zobrazení:** Snap-scroll karusel s dny a vertikální časovou osou optimalizovanou pro telefony.

3. **Synchronizace do Google Kalendáře:**
   - Propojení s osobním Google účtem přes Google OAuth2.
   - Možnost synchronizovat do existujícího kalendáře, nebo **přímo z aplikace vytvořit nový samostatný kalendář** (např. „Škola“).
   - **Barevné mapování předmětů:** Každému předmětu (Matematika, Čeština, Angličtina...) lze přiřadit jednu z 11 oficiálních barev Google Kalendáře (Levandulová, Šalvějová, Banánová, Rajčatová atd.).
   - Nastavení automatického upozornění před hodinou (pop-up notifikace).
   - Nastavení počtu týdnů dopředu, které se mají synchronizovat.
   - Inteligentní vkládání (deduplikace událostí podle unikátního ID, aby nevznikaly duplicity).

4. **Režim ICS odběru (Apple Kalendář, Outlook):**
   - Vygenerování unikátní URL adresy ve formátu `https://.../api/calendar/[token].ics`.
   - Podpora automatického obnovování (`X-PUBLISHED-TTL:PT15M`) a barevného odlišení kategorií.
   - Snadné vložení do aplikace Kalendář v iOS/macOS nebo jiných systémech.

5. **Správa a čištění dat:**
   - Uložení/změna přihlašovacích údajů do Škola OnLine.
   - Možnost vymazání historie rozvrhu v databázi pro znovunačtení čerstvých dat.

---

### 3. Jak to dělá (Architektura a vnitřní fungování)

```
               ┌───────────────────────┐
               │    Škola OnLine       │
               │  (webové rozhraní)    │
               └───────────┬───────────┘
                           │ Playwright + Stealth scraper
                           ▼
                  ┌─────────────────┐
                  │ Next.js Backend │
                  │  (API Routes)   │
                  └────────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │  Supabase   │   │   Google    │   │  ICS Feed   │
  │  PostgreSQL │   │  Calendar   │   │  (Apple /   │
  │ & Auth/Disk │   │     API     │   │  Outlook)   │
  └─────────────┘   └─────────────┘   └─────────────┘
```

1. **Scraping rozvrhu:**
   - Když uživatel klikne na „Aktualizovat data“, zavolá se endpoint [`/api/scrape`](file:///Users/vekro/Documents/GitHub/skolcal/app/api/scrape/route.ts).
   - Backend spustí samostatný Node proces s [`lib/cli-scraper.ts`](file:///Users/vekro/Documents/GitHub/skolcal/lib/cli-scraper.ts) přes `npx tsx` (čímž obchází omezení bundleru Next.js s binárkami prohlížeče).
   - Skript otevře bezhlavý prohlížeč Chromium se stealth módem, vyplní uživatelské jméno a heslo, přihlásí se a přejde na týdenní kalendář SOL (`KZK001_KalendarTyden.aspx`).
   - Naparsuje buňky rozvrhu z atributů `onmouseover="onMouseOverTooltip(...)"`, vytáhne předmět, učitele, třídu, učebnu a čas.
   - Získaná data se sloučí s existujícími daty uživatele a uloží se do sloupce `schedule_data` typu `JSONB` v tabulce `profiles`.

2. **Zápis do Google Kalendáře:**
   - Endpoint [`/api/sync/google`](file:///Users/vekro/Documents/GitHub/skolcal/app/api/sync/google/route.ts) načte uložený rozvrh a Google OAuth refresh token z tabulky `google_tokens`.
   - Inicializuje `oauth2Client` z knihovny `googleapis`.
   - Pro každou hodinu spočítá přesný datum a čas podle rozvrhového harmonogramu (`TIMETABLE` – např. 8:00–8:45).
   - Vygeneruje deterministické ID události (např. `skolcal-{userId}-{date}-{period}`), přiřadí barvu zvolenou uživatelem a odešle `insert` (nebo `update` v případě konfliktu 409).

3. **Distribuce přes ICS:**
   - Endpoint [`/api/calendar/[token]/route.ts`](file:///Users/vekro/Documents/GitHub/skolcal/app/api/calendar/[token]/route.ts) přijímá požadavky kalendářových klientů.
   - Vyhledá uživatele podle vygenerovaného UUID `ics_token`.
   - Vrátí `.ics` soubor se správným MIME typem `text/calendar; charset=utf-8` a hlavičkami zakazujícími nežádoucí cache, takže kalendářový klient má vždy aktuální rozvrh.

---

### 4. Co aplikace používá (Technologický stack)

| Oblast | Technologie / Knihovna | K čemu slouží |
|---|---|---|
| **Framework** | **Next.js 16** (React 19) | App Router, Server Actions/Components, API Route handlery |
| **Styling** | **Tailwind CSS v4** + `@tailwindcss/postcss` | Moderní UI, utility-first styly, tmavý režim |
| **Design & UI** | **Framer Motion** + **Lucide React** | Plynulé animace tabů/karet ([`GlassCard`](file:///Users/vekro/Documents/GitHub/skolcal/components/ui/GlassCard.tsx)), moderní SVG ikony |
| **Databáze & Auth** | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) | PostgreSQL databáze, RLS politiky, OAuth přihlášení (Google, Discord), Storage |
| **Web Scraping** | **Playwright** + `puppeteer-extra-plugin-stealth` | Ovládání prohlížeče Chromium a maskování automatizace před ochranami SOL |
| **Google Integrace** | **googleapis** (v178) | Autentizace OAuth2, čtení seznamu kalendářů, vytváření nového kalendáře a zápis událostí |
| **Kalendář & Čas** | **ics** (v3.12) & **date-fns** (v4.4 s českou lokalizací) | Tvorba standardních iCalendar `.ics` souborů a parsování českých formátů data a času |
| **TypeScript / Tooling** | **TypeScript 7**, **tsx** | Typová kontrola a spouštění scraperu v CLI procesu |

---

### 5. Skolcal CLI (Terminálové rozhraní)

Aplikace Skolcal obsahuje plnohodnotný modul pro terminál (Command Line Interface), který umožňuje používat všechny funkce bez webového panelu. Je dostupný na Windows, macOS i Linuxu a přizpůsobí se vašim potřebám díky dvěma režimům běhu.

#### Režimy běhu (Local vs. Online)

- **Local (`--mode local`)**: Vše běží pouze na vašem počítači. K přihlášení do Školy OnLine se využije lokální instalace prohlížeče, rozvrh se stáhne a uloží do lokálního souboru na vašem disku. Vaše heslo k SOL ani data z rozvrhu se nikdy neodesílají na žádný server.
- **Online (`--mode online`)**: CLI se připojí k vašemu cloudovému Skolcal účtu pomocí API klíče. Příkazy z terminálu pouze instruují vzdálený server (Next.js/Supabase), aby provedl scrapování nebo synchronizaci s Google Kalendářem za vás.

#### Instalace (bez nutnosti stahovat repozitář)

Abyste mohli používat terminálovou verzi, nemusíte složitě klonovat a nastavovat celý zdrojový kód aplikace. Modul si stačí nainstalovat globálně a ovládat jej pomocí jednoduchého příkazu `skolcal`.

**Instalace přes NPM (Windows, macOS, Linux):**
```bash
npm install -g skolcal-cli
```

**Rychlý instalační skript (macOS a Linux):**
```bash
curl -sSL https://skolcal.cz/install.sh | bash
```

Po úspěšné instalaci stačí k vypsání dostupné nápovědy zadat:
```bash
skolcal --help
```

#### Přehled příkazů

**1. Nastavení a připojení**
```bash
# Pro lokální režim: Nastavení přihlašovacích údajů do Školy OnLine (uloží se bezpečně na disk)
skolcal config set sol_username "jmeno.prijmeni"
skolcal config set sol_password "mojetajneheslo"

# Pro online režim: Propojení CLI s vaším webovým účtem
skolcal login --token "VAS_OSOBNI_API_KLIC"
```

**2. Stahování rozvrhu (Scraping)**
```bash
# Spustí lokální Chromium a stáhne rozvrh k vám do počítače
skolcal scrape --mode local

# Pošle pokyn serveru, aby stáhl rozvrh a uložil ho do vaší cloud databáze
skolcal scrape --mode online
```

**3. Synchronizace s kalendáři**
```bash
# Synchronizace staženého rozvrhu do Google Kalendáře
skolcal sync google --mode local
skolcal sync google --mode online

# Vytvoření lokálního .ics souboru pro Apple Kalendář nebo Outlook (pouze local)
skolcal export ics --output ./rozvrh.ics
```

**4. Ostatní funkce**
```bash
# Zobrazení tabulky rozvrhu přímo v textovém terminálu
skolcal show schedule

# Vymazání uložených dat (reset)
skolcal clear --mode local
```

Díky tomuto CLI můžete Skolcal snadno zapojit do vlastních automatizací (např. Windows Task Scheduler, Apple Automator, nebo Linux cron), a to buď zcela odděleně od cloudu v lokálním režimu, nebo jako pohodlné ovládání vašeho online účtu z příkazové řádky.