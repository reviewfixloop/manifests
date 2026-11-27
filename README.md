# Official manifests

The [Reviewer Protocol](https://github.com/reviewfixloop/reviewer-protocol) manifests ReviewFixLoop maintains. Each vendor manifest launches the vendor's own CLI, unmodified, as the user installed and configured it; ReviewFixLoop ships no vendor executable and takes no part in how the CLI signs in. `rfl-agent` launches ReviewFixLoop's own agent, which reads the API key of the provider its model names from that provider's variable.

| Manifest                                    | Launch                                            |
| ------------------------------------------- | ------------------------------------------------- |
| [`claude-code`](official/claude-code.jsonc) | `claude --print --output-format stream-json`      |
| [`codex`](official/codex.jsonc)             | `codex exec --json`                               |
| [`antigravity`](official/antigravity.jsonc) | the Antigravity ACP server (`agy_acp_server.par`) |
| [`copilot`](official/copilot.jsonc)         | `copilot --prompt … --output-format json`         |
| [`opencode`](official/opencode.jsonc)       | `opencode acp` (OpenCode V2)                      |
| [`rfl-agent`](official/rfl-agent.jsonc)     | the agent the ReviewFixLoop CLI embeds (ACP)      |

Every manifest launches both reviewers and resolvers. The `opencode` manifest supports OpenCode V2 only.

## Package

Published on npm as `@reviewfixloop/manifests`. The package ships the raw `.jsonc` files under `official/` and exports `OFFICIAL_MANIFEST_TEXTS` (`readonly string[]`), the raw JSONC text of every file in `official/` sorted lexicographically by filename, for hosts that embed the official manifests.

```ts
import { OFFICIAL_MANIFEST_TEXTS } from '@reviewfixloop/manifests';
```

## Fixtures

`fixtures/<manifest id>/<name>.<n>.jsonl` is the recorded standard output of the n-th process of a real session, `<name>.<n>.stderr.txt` what it wrote to standard error (absent when nothing), `<name>.<n>.usage.json` the usage file it wrote (required when the manifest declares `usageFile` and the process reported a completed turn), and `<name>.events.json` the events the session must map to. The test suite maps every recording with the current manifest and compares.

- Record a session with `bun scripts/record.ts <manifest id> --cwd <dir> --prompt <text> --out <file.jsonl>` (add `--session <id>` to continue one). Remove what is personal before committing a recording: paths, account details, and the lists of installed tools and skills.
- After changing a manifest, regenerate the expectations with `bun scripts/fixtures.ts` and review the diff: it is what the change does to recorded sessions.

### What the recordings cover

A rule, a map entry, a default or a pattern is verified only when a recording reaches it. The recordings are:

- `review`: a completed turn that runs a command, and a second turn that continues the session, for `claude-code`, `codex` and `copilot`;
- `unknown-model`: a turn that fails on a model that does not exist, for `claude-code`, `codex` and `copilot`;
- `unsupported-effort`: a turn refused because the selected model does not support reasoning effort, for `copilot`. Its mapping expectation covers only the session event: the refusal is on stderr, so the runner classifies it after process exit. That classification and message were checked with the real Copilot CLI 1.0.112 through the runner host, not by the recording's mapping test;
- `prompt-too-long`: a turn that fails on an oversized prompt, for `claude-code`;
- `usage-limit`: a turn refused because the plan's weekly limit was reached, for `claude-code`.

The recordings do not cover: visible reasoning (`thought`), every other failure (the remaining status-map entries, defaults and `failures` patterns), and the ACP manifests (`antigravity` and `opencode`), which have no output mapping. `rfl-agent` also speaks ACP; the CLI's tests run it against a fake provider instead.

## Checks, publishing, and registration

`bun run lint`, `bun run typecheck`, `bun run build`, and `bun test` lint and typecheck the repository, build `dist/`, validate every manifest against the schema of the `reviewer-protocol` package, and map the recordings. On `main`, `.github/workflows/publish.yml` runs those checks, runs `semantic-release` to publish `@reviewfixloop/manifests` to npm, and registers every `official/*.jsonc` manifest with the ReviewFixLoop service using its GitHub Actions OIDC token (proving that it runs for this repository's `main` branch so the service fetches each manifest at that commit itself). Runs whose reviewers use a registered manifest count on the public leaderboard.

To connect a harness of your own, publish its manifest from your repository with `review-fix-loop manifest publish github:<owner>/<repo>/<path>@<sha>`; it is registered under your GitHub owner name and needs no change here.

## License

[Apache-2.0](LICENSE)
