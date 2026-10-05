import { describe, it, expect, beforeEach } from 'vitest'
import { reactive, ref, nextTick } from 'vue'
import { useDryv } from '../useDryv'
import { Dryv } from '../plugin'
import { createApp } from 'vue'
import { createRuleSet, type SimpleModel } from './helpers'

function installPlugin() {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
}

describe('useDryv', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should create a validation session with inline rule set', () => {
    const model = reactive<SimpleModel>({ name: '', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const result = useDryv(model, ruleSet)

    expect(result.session).toBeDefined()
    expect(result.model).toBeDefined()
    expect(result.validatable).toBeDefined()
    expect(result.validate).toBeInstanceOf(Function)
    expect(result.clear).toBeInstanceOf(Function)
    expect(result.commit).toBeInstanceOf(Function)
    expect(result.revert).toBeInstanceOf(Function)
    expect(result.reset).toBeInstanceOf(Function)
    expect(result.setValidationResult).toBeInstanceOf(Function)
  })

  it('should return valid=true when no rules fail', async () => {
    const model = reactive<SimpleModel>({ name: 'test', email: 'a@b.com' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { validate, valid } = useDryv(model, ruleSet)
    await validate()

    expect(valid.value).toBe(true)
  })

  it('should return valid=false when a rule returns an error string', async () => {
    const model = reactive<SimpleModel>({ name: '', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Name is required' }]
      } as any
    })

    const { validate, valid, validatable } = useDryv(model, ruleSet)
    await validate()

    expect(valid.value).toBe(false)
    expect(validatable.name.hasErrors).toBe(true)
    expect(validatable.name.text).toBe('Name is required')
  })

  it('should clear validation errors', async () => {
    const model = reactive<SimpleModel>({ name: '', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => 'Error' }]
      } as any
    })

    const { validate, clear, validatable } = useDryv(model, ruleSet)
    await validate()
    expect(validatable.name.hasErrors).toBe(true)

    clear()
    expect(validatable.name.text).toBeNull()
  })

  it('should track dirty state after value change', async () => {
    const model = reactive<SimpleModel>({ name: 'original', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { dirty, validatable, commit } = useDryv(model, ruleSet)

    commit()
    expect(dirty.value).toBe(false)

    validatable.name.value = 'changed'
    await nextTick()

    expect(dirty.value).toBe(true)
  })

  it('should revert to committed state', async () => {
    const model = reactive<SimpleModel>({ name: 'original', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { dirty, validatable, commit, revert } = useDryv(model, ruleSet)

    commit()
    validatable.name.value = 'changed'
    await nextTick()

    expect(dirty.value).toBe(true)

    revert()
    expect(validatable.name.value).toBe('original')
    expect(dirty.value).toBe(false)
  })

  it('should accept a ref model', () => {
    const model = ref<SimpleModel>({ name: '', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {} as any
    })

    const result = useDryv(model, ruleSet)
    expect(result.model).toBeDefined()
  })

  it('should throw when ref model has undefined initial value', () => {
    const model = ref<SimpleModel | undefined>(undefined)
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {} as any
    })

    expect(() => useDryv(model as any, ruleSet)).toThrow(
      'The initial value of the model cannot be null or undefined.'
    )
  })

  it('should throw when ruleSet name cannot be resolved', () => {
    const model = reactive<SimpleModel>({ name: '', email: '' })

    expect(() => useDryv(model, 'NonExistentRuleSet')).toThrow(
      "Could not find a validation rule set with the name 'NonExistentRuleSet'"
    )
  })

  it('should set server validation results', async () => {
    const model = reactive<SimpleModel>({ name: 'ok', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => null }]
      } as any
    })

    const { setValidationResult, validatable, validate } = useDryv(model, ruleSet)

    await validate()

    const applied = setValidationResult({
      success: false,
      messages: {
        name: { text: 'Server error', type: 'error', group: null }
      }
    })

    expect(applied).toBe(false)
    expect(validatable.name.hasErrors).toBe(true)
    expect(validatable.name.text).toBe('Server error')
  })

  it('should be thenable (works with await)', async () => {
    const model = reactive<SimpleModel>({ name: '', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {} as any
    })

    const result = await useDryv(model, ruleSet)
    expect(result.model).toBeDefined()
    expect(result.session).toBeDefined()
  })

  it('should handle warning-type validation results', async () => {
    const model = reactive<SimpleModel>({ name: 'x', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: {
        name: [{ validate: () => ({ type: 'warning', text: 'Name is short' }) }]
      } as any
    })

    const { validate, validatable } = useDryv(model, ruleSet)
    await validate()

    expect(validatable.name.hasWarnings).toBe(true)
    expect(validatable.name.text).toBe('Name is short')
  })
})
