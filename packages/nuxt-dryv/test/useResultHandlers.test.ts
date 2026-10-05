import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Result Handler Registry', () => {
  let registry: {
    handlerKey: number
    resultHandlers: Record<number, any>
  }

  let addResultHandler: (handler: any) => number
  let removeResultHandler: (key: number) => void
  let invokeResultHandlers: (
    session: any,
    model: any,
    path: string,
    rule: any,
    result: any
  ) => Promise<any>

  beforeEach(() => {
    registry = {
      handlerKey: 0,
      resultHandlers: {}
    }

    addResultHandler = (handler: any) => {
      const key = registry.handlerKey++
      registry.resultHandlers[key] = handler
      return key
    }

    removeResultHandler = (key: number) => {
      delete registry.resultHandlers[key]
    }

    invokeResultHandlers = async (session, model, path, rule, result) => {
      for (const key in registry.resultHandlers) {
        const handler = registry.resultHandlers[key]
        if (!handler) continue
        const handlerResult = await handler(session, model, path, rule, result)
        if (handlerResult !== undefined) {
          return handlerResult
        }
      }
      return result
    }
  })

  describe('addResultHandler', () => {
    it('should return a numeric key', () => {
      const key = addResultHandler(vi.fn())
      expect(typeof key).toBe('number')
    })

    it('should return incrementing keys', () => {
      const key1 = addResultHandler(vi.fn())
      const key2 = addResultHandler(vi.fn())
      expect(key2).toBe(key1 + 1)
    })

    it('should store the handler in the registry', () => {
      const handler = vi.fn()
      const key = addResultHandler(handler)
      expect(registry.resultHandlers[key]).toBe(handler)
    })
  })

  describe('removeResultHandler', () => {
    it('should remove a handler by key', () => {
      const handler = vi.fn()
      const key = addResultHandler(handler)

      removeResultHandler(key)
      expect(registry.resultHandlers[key]).toBeUndefined()
    })

    it('should not affect other handlers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const key1 = addResultHandler(handler1)
      const key2 = addResultHandler(handler2)

      removeResultHandler(key1)
      expect(registry.resultHandlers[key1]).toBeUndefined()
      expect(registry.resultHandlers[key2]).toBe(handler2)
    })
  })

  describe('invokeResultHandlers', () => {
    it('should return the original result when no handlers are registered', async () => {
      const result = { success: true }
      const output = await invokeResultHandlers({}, {}, 'name', {}, result)
      expect(output).toBe(result)
    })

    it('should call registered handlers in order', async () => {
      const calls: number[] = []
      addResultHandler(async () => {
        calls.push(1)
        return undefined
      })
      addResultHandler(async () => {
        calls.push(2)
        return undefined
      })

      await invokeResultHandlers({}, {}, 'name', {}, { success: true })
      expect(calls).toEqual([1, 2])
    })

    it('should stop at the first handler that returns a defined value', async () => {
      const handler1 = vi.fn().mockResolvedValue({ success: false, intercepted: true })
      const handler2 = vi.fn().mockResolvedValue(undefined)

      addResultHandler(handler1)
      addResultHandler(handler2)

      const output = await invokeResultHandlers({}, {}, 'name', {}, { success: true })
      expect(output).toEqual({ success: false, intercepted: true })
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should pass all arguments to handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined)
      addResultHandler(handler)

      const session = { id: 1 }
      const model = { name: 'test' }
      const rule = { type: 'required' }
      const result = { success: true }

      await invokeResultHandlers(session, model, 'name', rule, result)

      expect(handler).toHaveBeenCalledWith(session, model, 'name', rule, result)
    })

    it('should skip removed handlers', async () => {
      const handler = vi.fn().mockResolvedValue({ intercepted: true })
      const key = addResultHandler(handler)
      removeResultHandler(key)

      const result = { success: true }
      const output = await invokeResultHandlers({}, {}, 'name', {}, result)

      expect(output).toBe(result)
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
