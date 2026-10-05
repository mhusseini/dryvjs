import { describe, it, expect, vi } from 'vitest'
import { createProxyLifecycle } from '@/internal/proxyLifecycle'

describe('ProxyLifecycle', () => {
  function createMockProxyResult() {
    let nextId = 0
    const handlers = new Map<number, (e: any) => void>()

    return {
      proxy: { data: 'test' },
      register: vi.fn((handler: (e: any) => void) => {
        const id = nextId++
        handlers.set(id, handler)
        return id
      }),
      unregister: vi.fn((id: number) => {
        handlers.delete(id)
      }),
      handlers
    }
  }

  it('should expose the proxy', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)

    expect(lifecycle.proxy).toBe(mockResult.proxy)
  })

  it('should register a handler', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)
    const handler = vi.fn()

    lifecycle.register(handler)

    expect(mockResult.register).toHaveBeenCalledWith(handler)
  })

  it('should unregister previous handler when registering a new one', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)

    lifecycle.register(vi.fn())
    lifecycle.register(vi.fn())

    expect(mockResult.unregister).toHaveBeenCalledTimes(1)
    expect(mockResult.register).toHaveBeenCalledTimes(2)
  })

  it('should unregister handler on destroy', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)

    lifecycle.register(vi.fn())
    lifecycle.destroy()

    expect(mockResult.unregister).toHaveBeenCalled()
  })

  it('should not throw when destroying without a registered handler', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)

    expect(() => lifecycle.destroy()).not.toThrow()
    expect(mockResult.unregister).not.toHaveBeenCalled()
  })

  it('should not unregister twice on double destroy', () => {
    const mockResult = createMockProxyResult()
    const lifecycle = createProxyLifecycle(mockResult)

    lifecycle.register(vi.fn())
    lifecycle.destroy()
    lifecycle.destroy()

    expect(mockResult.unregister).toHaveBeenCalledTimes(1)
  })
})
