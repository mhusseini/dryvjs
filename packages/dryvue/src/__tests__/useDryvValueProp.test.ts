import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref, nextTick } from 'vue'
import { createApp } from 'vue'
import { useDryvValueProp } from '../useDryvValueProp'
import { useDryv } from '../useDryv'
import { Dryv } from '../plugin'
import { createRuleSet, type SimpleModel } from './helpers'

function installPlugin() {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
}

describe('useDryvValueProp', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should create a wrapper for a plain value', async () => {
    const emit = vi.fn()
    const value = ref<string | undefined>('hello')

    const result = useDryvValueProp(emit, () => value.value)
    await nextTick()

    expect(result.value).toBeDefined()
    expect(result.value.value).toBe('hello')
  })

  it('should emit update event when wrapper value is set (plain value)', async () => {
    const emit = vi.fn()
    const value = ref<string | undefined>('hello')

    const result = useDryvValueProp(emit, () => value.value)
    await nextTick()

    result.value.value = 'world'

    expect(emit).toHaveBeenCalledWith('update:modelValue', 'world')
  })

  it('should use a custom event name', async () => {
    const emit = vi.fn()
    const value = ref<string | undefined>('hello')

    const result = useDryvValueProp(emit, () => value.value, 'update:custom')
    await nextTick()

    result.value.value = 'changed'

    expect(emit).toHaveBeenCalledWith('update:custom', 'changed')
  })

  it('should pass through an existing DryvValidator from useDryv', async () => {
    const emit = vi.fn()
    const model = reactive<SimpleModel>({ name: 'test', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: { name: [{ validate: () => null }] } as any
    })
    const { validatable } = useDryv(model, ruleSet)
    const nameValidator = validatable.name

    const result = useDryvValueProp(emit, () => nameValidator as any)
    await nextTick()

    expect(result.value).toBeDefined()
    expect(result.value.__dryvValidator).toBe(true)
  })

  it('should reactively update when prop changes', async () => {
    const emit = vi.fn()
    const value = ref<string | undefined>('initial')

    const result = useDryvValueProp(emit, () => value.value)
    await nextTick()
    expect(result.value.value).toBe('initial')

    value.value = 'updated'
    await nextTick()
    expect(result.value.value).toBe('updated')
  })

  it('should handle undefined prop value', async () => {
    const emit = vi.fn()
    const value = ref<string | undefined>(undefined)

    const result = useDryvValueProp(emit, () => value.value)
    await nextTick()

    expect(result.value).toBeDefined()
    expect(result.value.value).toBeUndefined()
  })
})
