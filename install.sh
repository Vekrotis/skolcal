#!/bin/bash
set -e

# Barvy a formátování
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}${BOLD}🚀 Instalátor Skolcal CLI${NC}\n"

# Kontrola Node.js a npm
echo -ne "📦 Kontroluji závislosti... "
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Chyba: npm není nainstalováno.${NC}"
    echo -e "${YELLOW}👉 Nainstalujte Node.js a npm z https://nodejs.org/ a zkuste to znovu.${NC}"
    exit 1
fi
echo -e "${GREEN}OK${NC} (npm verze: $(npm -v))"

echo -e "\n⚙️  ${YELLOW}Instaluji Skolcal CLI z NPM...${NC}"
if npm install -g skolcal@latest --silent > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Globální instalace proběhla úspěšně.${NC}"
else
    echo -e "${YELLOW}ℹ Zkouším instalaci se zvýšenými právy (sudo)...${NC}"
    sudo npm install -g skolcal@latest --silent > /dev/null
    echo -e "${GREEN}✓ Globální instalace se sudo proběhla úspěšně.${NC}"
fi

echo -e "\n${GREEN}${BOLD}🎉 Skolcal CLI bylo úspěšně nainstalováno!${NC}"
echo -e "👉 Zkuste spustit příkaz: ${BOLD}skolcal --help${NC}\n"
