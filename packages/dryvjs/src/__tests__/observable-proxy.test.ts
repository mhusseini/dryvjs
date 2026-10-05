import { describe, it, expect, vi } from 'vitest'
import { createObservableProxy } from '@/internal/observableProxy'
import { createObservableArrayProxy } from '@/internal/observableArrayProxy'

describe('Observable Proxy (Layer 1)', () => {
  describe('object proxy', () => {
    it('should fire event when a property is set to a new value', () => {
      const model = { name: 'John', age: 25 }
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.name = 'Jane'

      expect(handler).toHaveBeenCalledWith({
        oldValue: 'John',
        newValue: 'Jane',
        field: 'name'
      })
    })

    it('should NOT fire event when a property is set to the same value', () => {
      const model = { name: 'John' }
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.name = 'John'

      expect(handler).not.toHaveBeenCalled()
    })

    it('should NOT fire event for properties prefixed with _', () => {
      const model = { _private: 'old' } as any
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy._private = 'new'

      expect(handler).not.toHaveBeenCalled()
      expect(proxy._private).toBe('new')
    })

    it('should NOT fire event for properties prefixed with $', () => {
      const model = { $special: 'old' } as any
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.$special = 'new'

      expect(handler).not.toHaveBeenCalled()
      expect(proxy.$special).toBe('new')
    })

    it('should fire events for multiple different properties', () => {
      const model = { name: 'John', age: 25 }
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.name = 'Jane'
      proxy.age = 30

      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('should support unregistering a handler', () => {
      const model = { name: 'John' }
      const { proxy, register, unregister } = createObservableProxy(model)
      const handler = vi.fn()
      const id = register(handler)

      unregister(id)
      proxy.name = 'Jane'

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle setting property to null', () => {
      const model = { name: 'John' } as any
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.name = null

      expect(handler).toHaveBeenCalledWith({
        oldValue: 'John',
        newValue: null,
        field: 'name'
      })
    })

    it('should handle setting property to undefined', () => {
      const model = { name: 'John' } as any
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.name = undefined

      expect(handler).toHaveBeenCalledWith({
        oldValue: 'John',
        newValue: undefined,
        field: 'name'
      })
    })

    it('should fire event when changing from falsy to falsy (0 to "")', () => {
      const model = { val: 0 } as any
      const { proxy, register } = createObservableProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.val = ''

      expect(handler).toHaveBeenCalledWith({
        oldValue: 0,
        newValue: '',
        field: 'val'
      })
    })
  })

  describe('array proxy', () => {
    it('should fire append event on push', () => {
      const model = ['a', 'b']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.push('c')

      expect(handler).toHaveBeenCalledWith({
        action: 'append',
        newValue: ['c']
      })
    })

    it('should fire remove event on pop', () => {
      const model = ['a', 'b']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.pop()

      expect(handler).toHaveBeenCalledWith({
        action: 'remove',
        oldValue: ['b']
      })
    })

    it('should fire remove event on shift', () => {
      const model = ['a', 'b']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.shift()

      expect(handler).toHaveBeenCalledWith({
        action: 'remove',
        oldValue: ['a']
      })
    })

    it('should fire insert event on unshift', () => {
      const model = ['a', 'b']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.unshift('z')

      expect(handler).toHaveBeenCalledWith({
        action: 'insert',
        newValue: ['z']
      })
    })

    it('should fire replace event on splice', () => {
      const model = ['a', 'b', 'c']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.splice(1, 1, 'x')

      expect(handler).toHaveBeenCalledWith({
        action: 'replace',
        oldValue: ['b'],
        newValue: ['x']
      })
    })

    it('should fire remove event when setting length to 0', () => {
      const model = ['a', 'b', 'c']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.length = 0

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'remove' })
      )
    })

    it('should NOT fire event when popping from an empty array', () => {
      const model: string[] = []
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.pop()

      expect(handler).not.toHaveBeenCalled()
    })

    it('should NOT fire event when shifting from an empty array', () => {
      const model: string[] = []
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.shift()

      expect(handler).not.toHaveBeenCalled()
    })

    it('should push multiple items in one call', () => {
      const model = ['a']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.push('b', 'c')

      expect(handler).toHaveBeenCalledWith({
        action: 'append',
        newValue: ['b', 'c']
      })
    })

    it('should unshift multiple items in one call', () => {
      const model = ['c']
      const { proxy, register } = createObservableArrayProxy(model)
      const handler = vi.fn()
      register(handler)

      proxy.unshift('a', 'b')

      expect(handler).toHaveBeenCalledWith({
        action: 'insert',
        newValue: ['a', 'b']
      })
    })
  })
})
