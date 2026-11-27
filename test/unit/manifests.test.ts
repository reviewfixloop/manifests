import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseManifest } from 'reviewer-protocol';

import { build } from '../../scripts/build.ts';

const ROOT = path.join(import.meta.dir, '..', '..');
const OFFICIAL_DIR = path.join(ROOT, 'official');
const DIST_DIR = path.join(ROOT, 'dist');

describe('official manifests', () => {
  for (const file of fs.readdirSync(OFFICIAL_DIR)) {
    it(`${file} is valid and named after its id`, () => {
      const manifest = parseManifest(fs.readFileSync(path.join(OFFICIAL_DIR, file), 'utf8'));
      expect(file).toBe(`${manifest.id}.jsonc`);
    });
  }

  it('builds dist/index.js and dist/index.d.ts with sorted raw manifest texts', async () => {
    build();
    const expected = fs
      .readdirSync(OFFICIAL_DIR)
      .filter((file) => file.endsWith('.jsonc'))
      .toSorted()
      .map((file) => fs.readFileSync(path.join(OFFICIAL_DIR, file), 'utf8'));

    const built = (await import(pathToFileURL(path.join(DIST_DIR, 'index.js')).href)) as {
      OFFICIAL_MANIFEST_TEXTS: readonly string[];
    };
    expect(built.OFFICIAL_MANIFEST_TEXTS).toEqual(expected);
    expect(fs.readFileSync(path.join(DIST_DIR, 'index.d.ts'), 'utf8')).toBe(
      'export declare const OFFICIAL_MANIFEST_TEXTS: readonly string[];\n'
    );
  });
});
