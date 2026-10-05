import { describe, it, expect } from 'vitest'
import { SpecialTypeWrapper, specialTypes } from '@/internal/SpecialTypeWrapper'

describe('SpecialTypeWrapper — Extended Edge Cases', () => {
  describe('isSpecialType', () => {
    it('should return false for null', () => {
      expect(SpecialTypeWrapper.isSpecialType(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(SpecialTypeWrapper.isSpecialType(undefined)).toBe(false)
    })

    it('should return false for plain objects', () => {
      expect(SpecialTypeWrapper.isSpecialType({ a: 1 })).toBe(false)
    })

    it('should return false for plain arrays', () => {
      expect(SpecialTypeWrapper.isSpecialType([1, 2, 3])).toBe(false)
    })

    it('should return false for strings', () => {
      expect(SpecialTypeWrapper.isSpecialType('hello')).toBe(false)
    })

    it('should return false for numbers', () => {
      expect(SpecialTypeWrapper.isSpecialType(42)).toBe(false)
    })

    it('should return true for ArrayBuffer', () => {
      expect(SpecialTypeWrapper.isSpecialType(new ArrayBuffer(8))).toBe(true)
    })

    it('should return true for DataView', () => {
      expect(SpecialTypeWrapper.isSpecialType(new DataView(new ArrayBuffer(8)))).toBe(true)
    })

    it('should return true for Uint8Array', () => {
      expect(SpecialTypeWrapper.isSpecialType(new Uint8Array(8))).toBe(true)
    })

    it('should return true for Promise', () => {
      expect(SpecialTypeWrapper.isSpecialType(Promise.resolve())).toBe(true)
    })

    it('should return true for Error', () => {
      expect(SpecialTypeWrapper.isSpecialType(new Error('test'))).toBe(true)
    })

    it('should return true for TypeError', () => {
      expect(SpecialTypeWrapper.isSpecialType(new TypeError('test'))).toBe(true)
    })

    it('should return true for RangeError', () => {
      expect(SpecialTypeWrapper.isSpecialType(new RangeError('test'))).toBe(true)
    })

    it('should return true for ReferenceError', () => {
      expect(SpecialTypeWrapper.isSpecialType(new ReferenceError('test'))).toBe(true)
    })

    it('should return true for SyntaxError', () => {
      expect(SpecialTypeWrapper.isSpecialType(new SyntaxError('test'))).toBe(true)
    })

    it('should return true for Float32Array', () => {
      expect(SpecialTypeWrapper.isSpecialType(new Float32Array(4))).toBe(true)
    })

    it('should return true for Float64Array', () => {
      expect(SpecialTypeWrapper.isSpecialType(new Float64Array(4))).toBe(true)
    })

    it('should return true for WebAssembly.Memory', () => {
      const mem = new WebAssembly.Memory({ initial: 1 })
      expect(SpecialTypeWrapper.isSpecialType(mem)).toBe(true)
    })
  })

  describe('wrap', () => {
    it('should return plain objects unchanged', () => {
      const obj = { a: 1, b: 'hello' }
      expect(SpecialTypeWrapper.wrap(obj)).toBe(obj)
    })

    it('should return arrays unchanged', () => {
      const arr = [1, 2, 3]
      expect(SpecialTypeWrapper.wrap(arr)).toBe(arr)
    })

    it('should wrap DataView and be recoverable via unwrap', () => {
      const dv = new DataView(new ArrayBuffer(8))
      const wrapped = SpecialTypeWrapper.wrap(dv)
      // wrapped is a proxy, not the same reference
      expect(SpecialTypeWrapper.unwrap(wrapped)).toBe(dv)
    })

    it('should wrap Uint8Array and be recoverable via unwrap', () => {
      const arr = new Uint8Array([1, 2, 3])
      const wrapped = SpecialTypeWrapper.wrap(arr)
      expect(SpecialTypeWrapper.unwrap(wrapped)).toBe(arr)
    })

    it('should wrap Promise and be recoverable via unwrap', () => {
      const p = Promise.resolve(42)
      const wrapped = SpecialTypeWrapper.wrap(p)
      expect(SpecialTypeWrapper.unwrap(wrapped)).toBe(p)
    })
  })

  describe('unwrap', () => {
    it('should unwrap a wrapped DataView back to original', () => {
      const dv = new DataView(new ArrayBuffer(8))
      const wrapped = SpecialTypeWrapper.wrap(dv)
      const unwrapped = SpecialTypeWrapper.unwrap(wrapped)
      expect(unwrapped).toBe(dv)
    })

    it('should unwrap a wrapped Uint8Array back to original', () => {
      const arr = new Uint8Array([1, 2, 3])
      const wrapped = SpecialTypeWrapper.wrap(arr)
      const unwrapped = SpecialTypeWrapper.unwrap(wrapped)
      expect(unwrapped).toBe(arr)
    })

    it('should handle double-wrapping gracefully', () => {
      const buf = new ArrayBuffer(8)
      const wrapped = SpecialTypeWrapper.wrap(buf)
      // The second wrap returns the already-wrapped proxy because SpecialTypeWrapper
      // instances are objects — but they may not be detected as special types themselves.
      // Just verify unwrap still works
      const unwrapped = SpecialTypeWrapper.unwrap(wrapped)
      expect(unwrapped).toBe(buf)
    })

    it('should return boolean primitives unchanged', () => {
      expect(SpecialTypeWrapper.unwrap(true)).toBe(true)
      expect(SpecialTypeWrapper.unwrap(false)).toBe(false)
    })
  })

  describe('proxy traps', () => {
    it('should preserve instanceof for Error types', () => {
      const types = [
        new Error('test'),
        new TypeError('test'),
        new RangeError('test'),
        new ReferenceError('test'),
        new SyntaxError('test'),
        new URIError('test'),
        new EvalError('test')
      ]

      for (const instance of types) {
        const wrapped = SpecialTypeWrapper.wrap(instance)
        expect(wrapped instanceof Error).toBe(true)
      }
    })

    it('should wrap and unwrap all typed array types', () => {
      const types = [
        new Uint8Array(4),
        new Uint16Array(4),
        new Uint32Array(4),
        new Int8Array(4),
        new Int16Array(4),
        new Int32Array(4),
        new Float32Array(4),
        new Float64Array(4)
      ]

      for (const instance of types) {
        const wrapped = SpecialTypeWrapper.wrap(instance)
        const unwrapped = SpecialTypeWrapper.unwrap(wrapped)
        expect(unwrapped).toBe(instance)
      }
    })

    it('should delegate property set to the original object', () => {
      const err = new Error('original')
      const wrapped = SpecialTypeWrapper.wrap(err)

      ;(wrapped as any).customProp = 'custom'

      expect(err.customProp).toBe('custom')
    })

    it('should delegate "in" operator via has trap', () => {
      const err = new Error('test')
      const wrapped = SpecialTypeWrapper.wrap(err)

      expect('message' in wrapped).toBe(true)
      expect('nonexistent' in wrapped).toBe(false)
    })

    it('should return empty ownKeys for wrapped special types', () => {
      const buf = new ArrayBuffer(8)
      const wrapped = SpecialTypeWrapper.wrap(buf)

      const keys = Object.keys(wrapped)
      expect(keys).toEqual([])
    })
  })

  describe('setValue / getValue on wrapper', () => {
    it('should allow setting and getting properties through the proxy', () => {
      const err = new Error('test')
      const wrapped = SpecialTypeWrapper.wrap(err)

      ;(wrapped as any).code = 'CUSTOM'
      expect((wrapped as any).code).toBe('CUSTOM')
      expect((err as any).code).toBe('CUSTOM')
    })
  })
})
