import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, reactive, defineComponent, nextTick } from 'vue'

describe('Dryv Nuxt Plugin Integration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should configure Dryv options with callServer and reactiveWrapper', async () => {
    const dryvue = await import('@softwareproduction/dryvue') as any

    const app = createApp({ template: '<div />' })

    const options = {
      callServer: vi.fn(),
      reactiveWrapper: (obj: any) => reactive(obj)
    }

    app.use(dryvue.Dryv, options)

    expect(dryvue.defaultDryvOptions.reactiveWrapper).toBeDefined()
    expect(dryvue.defaultDryvOptions.callServer).toBeDefined()
  })

  it('should enable useDryv with configured plugin options', async () => {
    const dryvue = await import('@softwareproduction/dryvue') as any

    const app = createApp({ template: '<div />' })
    app.use(dryvue.Dryv, { reactiveWrapper: (o: any) => reactive(o) })

    const model = reactive({ name: '', email: '' })
    const ruleSet = {
      name: 'testRuleSet',
      validators: {
        name: [{ validate: ($m: any) => (!$m.name ? 'Name is required' : null) }]
      }
    }

    const result = dryvue.useDryv(model, ruleSet)
    const validationResult = await result.validate()

    expect(validationResult.success).toBe(false)
    expect(result.validatable.name.hasErrors).toBe(true)
    expect(result.validatable.name.text).toBe('Name is required')
  })

  it('should work with useDryv in a setup context', async () => {
    const dryvue = await import('@softwareproduction/dryvue') as any

    const app = createApp({ template: '<div />' })
    app.use(dryvue.Dryv)

    const model = reactive({ name: '' })
    const ruleSet = {
      name: 'testForm',
      validators: {
        name: [{ validate: ($m: any) => (!$m.name ? 'Required' : null) }]
      }
    }

    const result = dryvue.useDryv(model, ruleSet)
    const validationResult = await result.validate()

    expect(validationResult.success).toBe(false)
    expect(validationResult.hasErrors).toBe(true)
    expect(result.valid.value).toBe(false)
    expect(result.validatable.name.hasErrors).toBe(true)
    expect(result.validatable.name.text).toBe('Required')
  })

  it('should allow custom options to be passed to Dryv plugin', async () => {
    const dryvue = await import('@softwareproduction/dryvue') as any

    const customCallServer = vi.fn()

    const app = createApp({ template: '<div />' })
    app.use(dryvue.Dryv, {
      callServer: customCallServer
    })

    expect(dryvue.defaultDryvOptions.callServer).toBe(customCallServer)
  })
})
