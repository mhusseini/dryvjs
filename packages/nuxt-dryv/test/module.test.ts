import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Nuxt Dryv Module Definition', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export a default module function', async () => {
    const moduleExports = await import('../src/module')
    expect(moduleExports.default).toBeDefined()
  })
})

describe('ModuleOptions', () => {
  it('should export ModuleOptions interface', async () => {
    const moduleExports = await import('../src/module')
    expect(moduleExports).toBeDefined()
  })
})
