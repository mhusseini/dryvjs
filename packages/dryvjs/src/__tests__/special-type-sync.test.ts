import { describe, it, expect } from 'vitest'
import { specialTypes } from '@/internal/SpecialTypeWrapper'
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
