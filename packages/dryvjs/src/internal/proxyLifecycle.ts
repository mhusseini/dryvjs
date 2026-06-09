/**
 * Encapsulates the proxy-lifecycle pattern shared by DryvObjectValidator and DryvArrayValidator:
 * create a proxy, register an event handler, store an unregister callback, and provide a destroy method.
 */
export interface ProxyLifecycle<TProxy, TEvent> {
  proxy: TProxy
  register(handler: (e: TEvent) => void): void
  destroy(): void
}

/**
 * Creates a managed proxy lifecycle from a proxy factory result.
 * Handles registration, unregistration, and re-binding (calling destroy before re-registering).
 */
export function createProxyLifecycle<TProxy, TEvent>(
  proxyResult: {
    proxy: TProxy
    register: (handler: (e: TEvent) => void) => number
    unregister: (id: number) => void
  }
): ProxyLifecycle<TProxy, TEvent> {
  let eventId: number | undefined

  return {
    proxy: proxyResult.proxy,
    register(handler: (e: TEvent) => void) {
      if (eventId !== undefined) {
        proxyResult.unregister(eventId)
      }
      eventId = proxyResult.register(handler)
    },
    destroy() {
      if (eventId !== undefined) {
        proxyResult.unregister(eventId)
        eventId = undefined
      }
    }
  }
}
