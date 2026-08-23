import { Plugin } from 'opencode-plugin-v2'
import { initCore } from './core.ts'
import { manager } from './plugin/pty/manager.ts'
import {
  ptySpawnV2,
  ptyWriteV2,
  ptyReadV2,
  ptyListV2,
  ptyKillV2,
  ptyWebV2,
} from './plugin/v2-tools.ts'

const ptyOpenClientCommand = 'pty-open-background-spy'
const ptyShowServerUrlCommand = 'pty-show-server-url'

export default Plugin.define({
  id: 'opencode-pty',
  setup: async (ctx) => {
    const core = initCore()

    await ctx.command.transform((commands) => {
      // Draft update() is upsert-assumed: docs anchor "#add-a-command" while
      // draft exposes only list/get/update/remove. Live-verified 2026-08-23.
      commands.update(ptyOpenClientCommand, (command) => {
        command.template =
          'This command will start the PTY Sessions Web Interface in your default browser.'
        command.description = 'Open PTY Sessions Web Interface'
      })
      commands.update(ptyShowServerUrlCommand, (command) => {
        command.template =
          'This command will show the PTY Sessions Web Interface URL.'
        command.description = 'Show PTY Sessions Web Interface URL'
      })
    })

    // v2 tools delegate to the v1 tool definitions' execute bodies (see
    // plugin/v2-tools.ts); JSON Schema inputs mirror the v1 Zod schemas.
    // Each add() is independently type-checked against ToolDraft.add(Info).
    await ctx.tool.transform((tools) => {
      tools.add(ptySpawnV2)
      tools.add(ptyWriteV2)
      tools.add(ptyReadV2)
      tools.add(ptyListV2)
      tools.add(ptyKillV2)
      tools.add(ptyWebV2)
    })

    // session.deleted survived v2 as a durable V1-compat event; envelope is
    // { type, data } and beta >=17927 narrowed data to { sessionID } only
    // (research recorded info:{...} on beta-17898 — drift, see spec).
    const events = ctx.event.subscribe()
    void (async () => {
      for await (const event of events) {
        if (event.type === 'session.deleted') {
          manager.cleanupBySession(event.data.sessionID)
        }
      }
    })()

    return () => core.dispose()
  },
})
