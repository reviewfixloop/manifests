import fs from 'node:fs';
import path from 'node:path';

import { parseManifest } from 'reviewer-protocol';

const ROOT = path.join(import.meta.dir, '..');
const OFFICIAL_DIR = path.join(ROOT, 'official');
const DIST_DIR = path.join(ROOT, 'dist');

export function build(): void {
  const files = fs
    .readdirSync(OFFICIAL_DIR)
    .filter((file) => file.endsWith('.jsonc'))
    .toSorted();
  const texts = files.map((file) => {
    const text = fs.readFileSync(path.join(OFFICIAL_DIR, file), 'utf8');
    const manifest = parseManifest(text);
    if (file !== `${manifest.id}.jsonc`) {
      throw new Error(`Expected ${file} to match manifest id "${manifest.id}" (${manifest.id}.jsonc)`);
    }
    return text;
  });

  fs.mkdirSync(DIST_DIR, { recursive: true });
  const entries = texts.map((text) => `  ${JSON.stringify(text)},`).join('\n');
  fs.writeFileSync(path.join(DIST_DIR, 'index.js'), `export const OFFICIAL_MANIFEST_TEXTS = [\n${entries}\n];\n`);
  fs.writeFileSync(
    path.join(DIST_DIR, 'index.d.ts'),
    'export declare const OFFICIAL_MANIFEST_TEXTS: readonly string[];\n'
  );
}

if (import.meta.main) {
  build();
}
