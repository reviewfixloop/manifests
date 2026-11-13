import antigravity from '../official/antigravity.jsonc' with { type: 'text' };
import claudeCode from '../official/claude-code.jsonc' with { type: 'text' };
import codex from '../official/codex.jsonc' with { type: 'text' };
import copilot from '../official/copilot.jsonc' with { type: 'text' };
import opencode from '../official/opencode.jsonc' with { type: 'text' };
import rflAgent from '../official/rfl-agent.jsonc' with { type: 'text' };

/** The text of every file in `official/`, for hosts that embed the manifests. */
export const OFFICIAL_MANIFEST_TEXTS: readonly string[] = [antigravity, claudeCode, codex, copilot, opencode, rflAgent];
