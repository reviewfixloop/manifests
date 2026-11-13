import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { parseManifest, resolveLaunch } from 'reviewer-protocol';

/**
 * Runs an official manifest's harness once on a prompt, as the host would, and saves its raw
 * standard output as a recording, with what it wrote to standard error and to its usage file
 * beside it (`.stderr.txt`, `.usage.json`):
 *
 *   bun scripts/record.ts <manifest id> --cwd <dir> --prompt <text> --out <file.jsonl>
 *     [--model <m>] [--effort <e>] [--session <id>] [--scratch <dir>]
 *
 * A recording holds whatever the harness printed, so remove what is personal (paths, account
 * details, the installed skill and tool lists) before committing it as a fixture.
 */
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    cwd: { type: 'string' },
    prompt: { type: 'string' },
    out: { type: 'string' },
    model: { type: 'string' },
    effort: { type: 'string' },
    session: { type: 'string' },
    scratch: { type: 'string' },
  },
});
const [id] = positionals;
if (
  id === undefined ||
  values.cwd === undefined ||
  values.prompt === undefined ||
  // The files beside the recording take its name with another suffix.
  !values.out?.endsWith('.jsonl')
) {
  throw new Error('usage: record.ts <manifest id> --cwd <dir> --prompt <text> --out <file.jsonl>');
}

const manifest = parseManifest(fs.readFileSync(path.join(import.meta.dir, '..', 'official', `${id}.jsonc`), 'utf8'));
if (manifest.transport.type !== 'jsonl') throw new Error(`"${id}" speaks ACP; only JSONL harnesses are recorded here`);
const scratchDir = path.resolve(values.scratch ?? fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'rfl-record-')));
const plan = resolveLaunch(manifest, {
  role: 'reviewer',
  platform: process.platform === 'darwin' ? 'darwin' : 'linux',
  values: {
    prompt: values.prompt,
    scratchDir,
    writableDirs: [scratchDir],
    ...(values.model === undefined ? {} : { model: values.model }),
    ...(values.effort === undefined ? {} : { effort: values.effort }),
    ...(values.session === undefined ? {} : { sessionId: values.session }),
  },
});

const cwd = path.resolve(values.cwd);
// Some harnesses take their working directory from PWD rather than from the process.
const env: Record<string, string | undefined> = { ...process.env, PWD: cwd, ...plan.env.set };
for (const name of plan.env.unset) delete env[name];
for (const file of plan.files) fs.writeFileSync(file.path, file.content);
const stderrPath = values.out.replace(/\.jsonl$/, '.stderr.txt');
const usagePath = values.out.replace(/\.jsonl$/, '.usage.json');
// Bun.file as a sink does not truncate an existing file, and what an earlier run left behind
// would pass for this run's.
for (const stale of [values.out, stderrPath, usagePath, plan.usageFilePath]) {
  if (stale !== undefined) fs.rmSync(stale, { force: true });
}
const child = Bun.spawn([plan.command, ...plan.args], {
  cwd,
  env,
  stdin: plan.stdin === undefined ? 'ignore' : new TextEncoder().encode(plan.stdin),
  stdout: Bun.file(values.out),
  stderr: 'pipe',
});
const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
if (stderr !== '') fs.writeFileSync(stderrPath, stderr);
console.error(`exit code ${exitCode}; scratch directory ${scratchDir}`);
if (plan.usageFilePath !== undefined && fs.existsSync(plan.usageFilePath)) {
  fs.copyFileSync(plan.usageFilePath, usagePath);
}
process.exitCode = exitCode;
