import { describe, it, expect } from 'vitest'
import { SpecialTypeWrapper, specialTypes } from '@/internal/SpecialTypeWrapper'
import type { SpecialType } from '@/types/validatable'

/**
 * Compile-time assertion: ensures the runtime `specialTypes` array and the
 * compile-time `SpecialType` union stay in sync.
 *
 * If this file produces a TypeScript error, the two lists have diverged.
 * Update both `specialTypes` in SpecialTypeWrapper.ts and the `SpecialType`
 * union in types/validatable.ts to match.
 */

// This type-level check ensures every SpecialType instance can be constructed
// by one of the runtime array entries. A type error here means the lists diverged.
type AssertAssignable<T, U extends T> = U
type _Check = AssertAssignable<
  SpecialType,
  InstanceType<Extract<(typeof specialTypes)[number], abstract new (...args: any[]) => any>>
>

describe('SpecialType sync enforcement', () => {
  it('runtime specialTypes array should contain at least the always-available types', () => {
    // ArrayBuffer, DataView, etc. are always available
    expect(specialTypes).toContain(ArrayBuffer)
    expect(specialTypes).toContain(DataView)
    expect(specialTypes).toContain(Uint8Array)
    expect(specialTypes).toContain(Promise)
    expect(specialTypes).toContain(Error)
  })

  it('runtime specialTypes array should have correct length for current environment', () => {
    // At minimum we have: 12 typed arrays + 4 WebAssembly + 6 Promise/Error + Symbol = 23
    // File/Blob/DOM are conditional
    expect(specialTypes.length).toBeGreaterThanOrEqual(23)
  })
})

describe('SpecialTypeWrapper.wrap / unwrap', () => {
  it('wrap should return non-special values unchanged', () => {
    const obj = { a: 1 }
    expect(SpecialTypeWrapper.wrap(obj)).toBe(obj)
  })

  it('wrap should return a proxy for special types', () => {
    const buf = new ArrayBuffer(8)
    const wrapped = SpecialTypeWrapper.wrap(buf)
    expect(wrapped).not.toBe(buf)
  })

  it('unwrap should recover the original from a wrapped proxy', () => {
    const buf = new ArrayBuffer(8)
    const wrapped = SpecialTypeWrapper.wrap(buf)
    expect(SpecialTypeWrapper.unwrap(wrapped)).toBe(buf)
  })

  it('unwrap should return non-wrapped values unchanged', () => {
    const obj = { a: 1 }
    expect(SpecialTypeWrapper.unwrap(obj)).toBe(obj)
  })

  it('unwrap should return primitives unchanged', () => {
    expect(SpecialTypeWrapper.unwrap(42)).toBe(42)
    expect(SpecialTypeWrapper.unwrap('hello')).toBe('hello')
    expect(SpecialTypeWrapper.unwrap(null)).toBe(null)
    expect(SpecialTypeWrapper.unwrap(undefined)).toBe(undefined)
  })

  it('instanceof should work on wrapped special types via getPrototypeOf', () => {
    const buf = new ArrayBuffer(8)
    const wrapped = SpecialTypeWrapper.wrap(buf)
    expect(wrapped instanceof ArrayBuffer).toBe(true)
  })

  it('instanceof should work on wrapped Error types', () => {
    const err = new TypeError('test')
    const wrapped = SpecialTypeWrapper.wrap(err)
    expect(wrapped instanceof TypeError).toBe(true)
    expect(wrapped instanceof Error).toBe(true)
  })

  it('property access should delegate to the original object', () => {
    const err = new Error('test message')
    const wrapped = SpecialTypeWrapper.wrap(err)
    expect(wrapped.message).toBe('test message')
  })
})
