import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repository = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
fs.mkdirSync(destination, { recursive: true });
// A failed package must never leave a dossier describing an earlier app.
fs.rmSync(path.join(destination, 'dossier.json'), { force: true });
for (const folder of ['app', 'screenshots']) {
  const target = path.join(destination, folder);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(repository, folder), target, { recursive: true });
}
const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
fs.writeFileSync(path.join(destination, 'dossier.json'), dossier);
console.log('Success: offline app, screenshots and dossier.json are ready.');
