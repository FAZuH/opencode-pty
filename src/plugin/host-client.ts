export interface HostClient {
  session: {
    get(input: { path: { id: string } }): Promise<{ data?: unknown; error?: unknown }>
    promptAsync(input: {
      path: { id: string }
      body?: {
        parts: Array<{ type: 'text'; text: string }>
        [key: string]: unknown
      }
    }): Promise<unknown>
  }
  config: {
    get(): Promise<{ error?: unknown; data?: unknown }>
  }
  tui: {
    showToast(input: {
      body: { message: string; variant: 'info' | 'success' | 'error' }
    }): Promise<unknown>
  }
}
