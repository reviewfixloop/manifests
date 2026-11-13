import fs from 'node:fs';
import path from 'node:path';

import type { ReviewerEvent } from 'reviewer-protocol';
import { createSessionMapper, parseManifest } from 'reviewer-protocol';

const ROOT = path.join(import.meta.dir, '..');

export interface Fixture {
  manifestId: string;
  /** A recorded session: `<name>.<n>.jsonl` holds the output of its n-th process. */
  name: string;
  recordings: string[];
  expectedPath: string;
}

/** The recorded sessions under fixtures/<manifest id>/, each with the events it must map to. */
export function listFixtures(): Fixture[] {
  const fixturesDir = path.join(ROOT, 'fixtures');
  return fs.readdirSync(fixturesDir).flatMap((manifestId) => {
    const dir = path.join(fixturesDir, manifestId);
    const processes = fs.readdirSync(dir).flatMap((file) => {
      const match = /^(.+)\.(\d+)\.jsonl$/.exec(file);
      return match === null ? [] : [{ name: match[1] ?? '', order: Number(match[2]), file }];
    });
    return [...new Set(processes.map((process) => process.name))].toSorted().map((name) => ({
      manifestId,
      name,
      recordings: processes
        .filter((process) => process.name === name)
        .toSorted((a, b) => a.order - b.order)
        .map((process) => path.join(dir, process.file)),
      expectedPath: path.join(dir, `${name}.events.json`),
    }));
  });
}

/** Maps a recorded session as the host does: one process mapper per recording, in order. */
export function mapFixture(fixture: Fixture): ReviewerEvent[][] {
  const manifest = parseManifest(fs.readFileSync(path.join(ROOT, 'official', `${fixture.manifestId}.jsonc`), 'utf8'));
  const { transport } = manifest;
  if (transport.type !== 'jsonl') throw new Error(`"${manifest.id}" has no output mapping to verify`);
  const session = createSessionMapper({ ...manifest, transport });
  return fixture.recordings.map((recording) => {
    const stderrPath = recording.replace(/\.jsonl$/, '.stderr.txt');
    const stderr = fs.existsSync(stderrPath) ? fs.readFileSync(stderrPath, 'utf8') : '';
    const mapper = session.forProcess(() => stderr);
    const events = fs
      .readFileSync(recording, 'utf8')
      .split('\n')
      .flatMap((line) => mapper.mapLine(line));
    const usagePath = recording.replace(/\.jsonl$/, '.usage.json');
    const usageEvents = mapper.mapUsageFile(fs.existsSync(usagePath) ? fs.readFileSync(usagePath, 'utf8') : undefined);
    // A recording whose usage file is lost, or no longer holds what the manifest reads, would
    // otherwise map to no usage and still pass; only a process that never reported a result (a
    // start-up failure) has none.
    if (transport.usageFile !== undefined && usageEvents.length > 0 && usageEvents[0]?.type !== 'usage') {
      throw new Error(
        fs.existsSync(usagePath)
          ? `${usagePath} holds none of the token counts the manifest's usageFile declares`
          : `${recording} reports a result, so its usage file ${usagePath} must be recorded`
      );
    }
    events.push(...usageEvents);
    return events;
  });
}

if (import.meta.main) {
  // `bun scripts/fixtures.ts` rewrites every expectation from the current manifests:
  // review the diff, since it is what the manifests' change does to recorded sessions.
  for (const fixture of listFixtures()) {
    fs.writeFileSync(fixture.expectedPath, `${JSON.stringify(mapFixture(fixture), undefined, 2)}\n`);
  }
}
