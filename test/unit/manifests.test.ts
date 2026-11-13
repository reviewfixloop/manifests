import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

import { parseManifest } from 'reviewer-protocol';

const OFFICIAL_DIR = path.join(import.meta.dir, '..', '..', 'official');

describe('official manifests', () => {
  for (const file of fs.readdirSync(OFFICIAL_DIR)) {
    it(`${file} is valid and named after its id`, () => {
      const manifest = parseManifest(fs.readFileSync(path.join(OFFICIAL_DIR, file), 'utf8'));
      expect(file).toBe(`${manifest.id}.jsonc`);
    });
  }
});
