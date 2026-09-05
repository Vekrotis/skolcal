#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const cliTsPath = path.resolve(__dirname, '../cli.ts');
const args = process.argv.slice(2);

const result = spawnSync('npx', ['tsx', cliTsPath, ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status ?? 0);
