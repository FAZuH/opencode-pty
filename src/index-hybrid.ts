/**
 * Hybrid entrypoint for LOCAL/plugin-dir usage (e.g. .opencode/plugins or a
 * config entry pointing at one file): the default export carries BOTH loader
 * contracts — v1 detects {id?, server?, tui?} objects and calls server();
 * v2 validates {id, setup}. Excess properties are tolerated by each side
 * (v1 reads only id/server/tui; v2 Effect Schema union matches id+setup).
 * Live-verified on opencode2 beta-17927 (ticket 10); the live opencode 1.x
 * host check remains manual (headless serve ignores project config).
 */
import { PTYPlugin } from './index-v1.ts'
import v2Default from './index-v2.ts'

const v2 = v2Default as { id: string; setup: (ctx: unknown) => Promise<unknown> }

const hybrid = {
  id: v2.id,
  setup: v2.setup,
  server: (input: unknown, _options?: unknown) => PTYPlugin(input as never),
}

export default hybrid
