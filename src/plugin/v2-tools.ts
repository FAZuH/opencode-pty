import { ptySpawn } from './pty/tools/spawn.ts'
import { ptyWrite } from './pty/tools/write.ts'
import { ptyRead } from './pty/tools/read.ts'
import { ptyList } from './pty/tools/list.ts'
import { ptyKill } from './pty/tools/kill.ts'
import { initCore } from '../core.ts'
import open from 'open'

/**
 * v2 tool registrations delegate to the v1 tool definitions' execute bodies.
 * None of the PTY tool bodies use ctx.directory/ctx.worktree (or abort /
 * metadata / ask), so the missing fields in the v2 ToolContext are irrelevant
 * at runtime; the adapter fills them with undefined for the v1 signature.
 */
function toV1Context(ctx: {
  sessionID: string
  agent: string
  messageID: string
}): Record<string, unknown> {
  return {
    sessionID: ctx.sessionID,
    agent: ctx.agent,
    messageID: ctx.messageID,
    directory: undefined,
    worktree: undefined,
  }
}

type V1ToolDef = {
  description: string
  execute: (args: never, ctx: never) => Promise<unknown>
}

function delegate(def: V1ToolDef) {
  return async (input: unknown, ctx: { sessionID: string; agent: string; messageID: string }) => {
    const result = await def.execute(input as never, toV1Context(ctx) as never)
    return { content: typeof result === 'string' ? result : String(result) }
  }
}

export const ptySpawnV2 = {
  name: 'pty_spawn',
  get description() {
    return ptySpawn.description
  },
  input: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The command/executable to run' },
      args: { type: 'array', items: { type: 'string' }, description: 'Arguments to pass to the command' },
      workdir: { type: 'string', description: 'Working directory for the PTY session' },
      env: { type: 'object', additionalProperties: { type: 'string' }, description: 'Additional environment variables' },
      title: { type: 'string', description: 'Human-readable title for the session' },
      description: { type: 'string', description: 'Clear, concise description of what this PTY session is for in 5-10 words' },
      notifyOnExit: { type: 'boolean', description: 'If true, sends a notification to the session when the process exits (default: false)' },
      timeoutSeconds: { type: 'number', description: 'Optional per-session timeout in seconds. The PTY is killed automatically when this duration elapses.' },
    },
    required: ['command', 'args', 'description'],
  },
  options: { permission: 'pty_spawn' },
  execute: delegate(ptySpawn),
}

export const ptyWriteV2 = {
  name: 'pty_write',
  get description() {
    return ptyWrite.description
  },
  input: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The PTY session ID (e.g., pty_a1b2c3d4)' },
      data: { type: 'string', description: 'The input data to send to the PTY' },
    },
    required: ['id', 'data'],
  },
  options: { permission: 'pty_write' },
  execute: delegate(ptyWrite),
}

export const ptyReadV2 = {
  name: 'pty_read',
  get description() {
    return ptyRead.description
  },
  input: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The PTY session ID (e.g., pty_a1b2c3d4)' },
      offset: { type: 'number', description: 'Line number to start reading from (0-based, defaults to 0). When using pattern, this applies to filtered matches.' },
      limit: { type: 'number', description: 'Number of lines to read (defaults to 500). When using pattern, this applies to filtered matches.' },
      pattern: { type: 'string', description: 'Regex pattern to filter lines. When set, only matching lines are returned, then offset/limit apply to the matches.' },
      ignoreCase: { type: 'boolean', description: 'Case-insensitive pattern matching' },
    },
    required: ['id'],
  },
  options: { permission: 'pty_read' },
  execute: delegate(ptyRead),
}

export const ptyListV2 = {
  name: 'pty_list',
  get description() {
    return ptyList.description
  },
  input: { type: 'object', properties: {} },
  options: { permission: 'pty_list' },
  execute: delegate(ptyList),
}

export const ptyKillV2 = {
  name: 'pty_kill',
  get description() {
    return ptyKill.description
  },
  input: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The PTY session ID (e.g., pty_a1b2c3d4)' },
      cleanup: { type: 'boolean', description: 'If true, removes the session and frees the buffer (default: false)' },
    },
    required: ['id'],
  },
  options: { permission: 'pty_kill' },
  execute: delegate(ptyKill),
}

// --- v2-only: replaces v1's command-intercepted web UI trigger (v2 has no
// command.execute.before; see spec Design decision 5). ---

export const ptyWebV2 = {
  name: 'pty_web',
  get description() {
    return 'Open the PTY Sessions Web Interface in your browser, or report its URL. Use this when the user wants to view or manage PTY sessions in a browser.'
  },
  input: {
    type: 'object',
    properties: {
      open: {
        type: 'boolean',
        description:
          'If true (default), opens the web interface in the default browser. If false, only returns the URL.',
      },
    },
    required: [],
  },
  execute: async (input: unknown) => {
    const args = (input ?? {}) as { open?: boolean }
    const core = initCore()
    const server = await core.ensureServer()
    const url = server.server.url.origin
    if (args.open !== false) {
      await open(url)
    }
    return { content: `PTY Sessions Web Interface URL: ${url}` }
  },
}
