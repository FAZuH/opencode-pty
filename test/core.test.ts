import { afterEach, describe, expect, it } from 'bun:test'
import { initCore } from '../src/core.ts'
import type { CoreHandle } from '../src/core.ts'
import type { HostClient } from '../src/plugin/host-client.ts'

const inertClient: HostClient = {
  session: {
    get: () => Promise.resolve({ data: undefined }),
    promptAsync: () => Promise.resolve(undefined),
  },
  config: {
    get: () => Promise.resolve({}),
  },
  tui: {
    showToast: () => Promise.resolve(undefined),
  },
}

describe('initCore', () => {
  const spawned: CoreHandle[] = []

  afterEach(async () => {
    while (spawned.length > 0) {
      const handle = spawned.pop()
      if (handle) {
        await handle.dispose()
      }
    }
  })

  function spawn(): CoreHandle {
    const handle = initCore({ client: inertClient, directory: process.cwd() })
    spawned.push(handle)
    return handle
  }

  it('returns the same handle when initialized twice', () => {
    const first = spawn()
    const second = initCore({ client: inertClient, directory: '/tmp/other-project' })
    expect(second).toBe(first)
  })

  it('lazily creates the web server on first ensureServer and reuses it', async () => {
    const core = spawn()

    expect(core.ensureServer).toBeTypeOf('function')
    const first = await core.ensureServer()
    expect(first.server.url.port).not.toBe(0)
    expect(first.server.url.protocol).toBe('http:')

    const second = await core.ensureServer()
    expect(second).toBe(first)
  })

  it('stops the started web server on dispose', async () => {
    const core = spawn()
    const server = await core.ensureServer()
    const url = `${server.server.url.origin}/index.html`

    await core.dispose()

    let connectionFailed = false
    try {
      await fetch(url)
    } catch {
      connectionFailed = true
    }
    expect(connectionFailed).toBe(true)
  })

  it('creates a fresh handle and server after dispose', async () => {
    const original = spawn()
    const originalServer = await original.ensureServer()
    await original.dispose()

    const revived = spawn()
    expect(revived).not.toBe(original)
    const revivedServer = await revived.ensureServer()
    expect(revivedServer).not.toBe(originalServer)
  })

  it('disposes safely without a started server', async () => {
    const core = spawn()
    await expect(core.dispose()).resolves.toBeUndefined()
  })

  it('survives being disposed twice', async () => {
    const core = spawn()
    await core.ensureServer()
    await core.dispose()
    await expect(core.dispose()).resolves.toBeUndefined()
  })

  it('stays usable when initialized without client or directory', async () => {
    const core = initCore()
    spawned.push(core)

    const server = await core.ensureServer()
    expect(server.server.url.protocol).toBe('http:')
  })
})
