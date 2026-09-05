#!/bin/bash
set -e

echo "Instaluji Skolcal CLI..."

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Chyba: npm není nainstalováno. Nainstalujte Node.js a npm a zkuste to znovu."
    exit 1
fi

# We assume they are running this curl script and want to install it globally.
# Ideally we would publish to npm, but since we are installing from git repo or a zipped bundle,
# for now we'll do an npm install from github (if public) or tell them to run npm install -g . in the repo.
# Since it's a simulated script according to README, we can just print a message that it would install it.

REPO_URL="https://github.com/Vekrotis/skolcal"

echo "Stahuji repozitář do dočasné složky..."
TMP_DIR=$(mktemp -d)
git clone --depth 1 $REPO_URL $TMP_DIR

echo "Instaluji balíček globálně..."
cd $TMP_DIR
npm install -g .

echo "Úklid..."
rm -rf $TMP_DIR

echo "Hotovo! Skolcal CLI bylo úspěšně nainstalováno."
echo "Zkuste spustit příkaz: skolcal --help"
