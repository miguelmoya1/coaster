import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const esmDir = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/esm');

mkdirSync(esmDir, { recursive: true });
writeFileSync(resolve(esmDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
