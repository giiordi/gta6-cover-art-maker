import { cpSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
const limits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function packageStudio() {
  for (const directory of ['app', 'screenshots']) {
    const input = resolve(source, directory);
    if (destination === input || destination.startsWith(input + sep) ||
        input.startsWith(destination + sep)) {
      throw new Error('MAKEFUN_OUTPUT_DIR must be separate from studio sources');
    }
  }
  mkdirSync(destination, { recursive: true });
  const staging = mkdtempSync(join(destination, '.studio-'));
  try {
    for (const directory of ['app', 'screenshots']) {
      cpSync(join(source, directory), join(staging, directory), { recursive: true });
    }
    writeFileSync(join(staging, 'dossier.json'), buildDossier(staging, limits));
    for (const name of readdirSync(staging)) {
      rmSync(join(destination, name), { recursive: true, force: true });
      renameSync(join(staging, name), join(destination, name));
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  console.log('Studio dossier built in %s', destination);
}

packageStudio();
