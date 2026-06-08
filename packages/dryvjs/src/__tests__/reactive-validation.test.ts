import { describe, it, expect, vi } from 'vitest'
import { createObjectValidator, createRuleSet, SimpleModel } from './helpers'

describe('Reactive Validation (proxy change triggers validation)', () => {
  it('should trigger field validation when proxy value changes in auto mode', async () => {
    const rule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: rule }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet, {
      validationTrigger: 'auto'
    })

    validator.proxy.name = 'Jane'

    // Give the async validation a tick to fire
    await new Promise((r) => setTimeout(r, 0))

    expect(rule).toHaveBeenCalled()
  })

  it('should trigger field validation after manual trigger in autoAfterManual mode', async () => {
    const rule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: rule }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet, {
      validationTrigger: 'autoAfterManual'
    })

    // First change should not trigger
    validator.proxy.name = 'Jane'
    await new Promise((r) => setTimeout(r, 0))
    expect(rule).not.toHaveBeenCalled()

    // Trigger manual validation
    await validator.validate()
    rule.mockClear()

    // Now changes should trigger validation
    validator.proxy.name = 'Bob'
    await new Promise((r) => setTimeout(r, 0))

    expect(rule).toHaveBeenCalled()
  })

  it('should not trigger field validation on proxy change in manual mode', async () => {
    const rule = vi.fn().mockReturnValue(null)

    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: rule }]
      } as any
    })

    const { validator } = createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet, {
      validationTrigger: 'manual'
    })

    validator.proxy.name = 'Jane'
    await new Promise((r) => setTimeout(r, 0))

    expect(rule).not.toHaveBeenCalled()
  })

  it('should use reactiveWrapper from options', () => {
    const reactiveWrapper = vi.fn((obj) => obj)

    const ruleSet = createRuleSet<SimpleModel>()
    createObjectValidator({ name: 'John', email: '', age: 0 }, ruleSet, {
      reactiveWrapper
    })

    expect(reactiveWrapper).toHaveBeenCalled()
  })
})
