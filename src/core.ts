import { initManager, manager } from './plugin/pty/manager.ts'
import { initPermissions } from './plugin/pty/permissions.ts'
import type { HostClient } from './plugin/host-client.ts'
import { PTYServer } from './web/server/server.ts'

export interface CoreInit {
  readonly client?: HostClient | null
  readonly directory?: string | null
}

export interface CoreHandle {
  ensureServer(): Promise<PTYServer>
  dispose(): Promise<void>
}

let active: CoreHandle | null = null

/**
 * Returns the active CoreHandle after (re)binding manager/permissions to the
 * latest init values ("latest wins" — matches v1 per-invocation semantics;
 * covered by test/core.test.ts). The init-once guard applies to the PTYServer
 * lifecycle, which is created lazily exactly once.
 */
export function initCore(init: CoreInit = {}): CoreHandle {
  initPermissions(init.client ?? null, init.directory ?? null)
  initManager(init.client ?? null)

  if (active) {
    return active
  }

  let server: PTYServer | undefined
  let creating: Promise<PTYServer> | undefined

  const ensureServer = (): Promise<PTYServer> => {
    if (server !== undefined) {
      return Promise.resolve(server)
    }
    creating ??= PTYServer.createServer()
    return creating.then(
      (started) => {
        server = started
        creating = undefined
        return started
      },
      (error) => {
        creating = undefined
        throw error
      }
    )
  }

  const dispose = async (): Promise<void> => {
    if (active === handle) {
      active = null
    }
    const pending = creating
    const current = server
    creating = undefined
    server = undefined
    const started = await Promise.resolve(pending ?? current).catch(() => undefined)
    started?.[Symbol.dispose]()
    manager.clearAllSessions()
  }

  const handle: CoreHandle = {
    ensureServer,
    dispose,
  }
  active = handle
  return handle
}
