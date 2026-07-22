#!/usr/bin/env node
/**
 * Capacitor iOS builds run `vite build` (production mode). Vite still loads
 * `.env.local`, so VITE_BAKE_TIMER_TEST_* can leak into a device/TestFlight
 * bundle. Block that unless the caller opts in for intentional short-timer
 * testing on device.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOW_FLAG = 'ALLOW_BAKE_TIMER_TEST';
const TEST_MINUTES_KEY = 'VITE_BAKE_TIMER_TEST_MINUTES';

if (process.env[ALLOW_FLAG] === '1') {
  process.exit(0);
}

function readEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    values[key] = value;
  }
  return values;
}

// Match Vite production load order: later files win for the same key.
const fromFiles = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...readEnvFile('.env.production'),
  ...readEnvFile('.env.production.local'),
};

const raw = process.env[TEST_MINUTES_KEY] ?? fromFiles[TEST_MINUTES_KEY];
if (!raw?.trim()) {
  process.exit(0);
}

const parsed = Number(raw);
if (!Number.isFinite(parsed) || parsed <= 0) {
  process.exit(0);
}

console.error(`
Refusing iOS build: ${TEST_MINUTES_KEY}=${raw} would be baked into the production bundle
(via Vite loading .env.local). That shortens real bake timers on device / TestFlight.

Fix:
  1. Comment out ${TEST_MINUTES_KEY} (and VITE_BAKE_TIMER_TEST_STEP_ID) in .env.local, then retry.
  2. Or, for intentional short-timer device testing only:
       ${ALLOW_FLAG}=1 npm run build:ios
`);
process.exit(1);
