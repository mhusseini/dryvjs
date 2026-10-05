import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from 'vue'
import { Dryv, DryvStaticRuleSets } from '../plugin'
import { defaultDryvOptions } from '@softwareproduction/dryvjs'
import { createRuleSet } from './helpers'

describe('Dryv Plugin', () => {
  it('should install without errors', () => {
    const app = createApp({ template: '<div />' })
    expect(() => app.use(Dryv)).not.toThrow()
  })

  it('should set reactiveWrapper on defaultDryvOptions', () => {
    const app = createApp({ template: '<div />' })
    app.use(Dryv)

    expect(defaultDryvOptions.reactiveWrapper).toBeDefined()
    expect(typeof defaultDryvOptions.reactiveWrapper).toBe('function')
  })

  it('should make objects reactive via reactiveWrapper', () => {
    const app = createApp({ template: '<div />' })
    app.use(Dryv)

    const original = { foo: 'bar' }
    const wrapped = defaultDryvOptions.reactiveWrapper!(original)
    expect(wrapped).toBeDefined()
    expect(wrapped.foo).toBe('bar')
  })
})

describe('DryvStaticRuleSets Plugin', () => {
  beforeEach(() => {
    defaultDryvOptions.ruleSetResolvers = undefined
  })

  it('should install without errors', () => {
    const app = createApp({ template: '<div />' })
    expect(() => app.use(DryvStaticRuleSets, {})).not.toThrow()
  })

  it('should register a ruleSetResolver', () => {
    const app = createApp({ template: '<div />' })
    app.use(DryvStaticRuleSets, {})

    expect(defaultDryvOptions.ruleSetResolvers).toBeDefined()
    expect(defaultDryvOptions.ruleSetResolvers!.length).toBe(1)
  })

  it('should resolve a registered rule set by name (case-insensitive)', () => {
    const ruleSet = createRuleSet({ name: 'PersonalData' })
    const app = createApp({ template: '<div />' })
    app.use(DryvStaticRuleSets, { PersonalData: ruleSet })

    const resolver = defaultDryvOptions.ruleSetResolvers![0]
    const resolved = resolver.resolve('personaldata')

    expect(resolved).toBeDefined()
    expect(resolved.name).toBe('PersonalData')
  })

  it('should return undefined for unregistered rule set names', () => {
    const app = createApp({ template: '<div />' })
    app.use(DryvStaticRuleSets, {})

    const resolver = defaultDryvOptions.ruleSetResolvers![0]
    const resolved = resolver.resolve('nonexistent')

    expect(resolved).toBeUndefined()
  })
})
