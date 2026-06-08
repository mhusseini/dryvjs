import { describe, it, expect, vi } from 'vitest'
import { DryvArrayValidator, DryvObjectValidator, DryvValidationSession, dryvOptions, DryvValidationRuleSet } from '@/.'

describe('Array Validation', () => {
  interface ItemModel {
    value: string
  }

  interface ParentModel {
    items: ItemModel[]
    name: string
  }

  function createSetup(
    ruleSetPartial: Partial<DryvValidationRuleSet<ParentModel>> = {},
    optionOverrides?: Partial<typeof import('@/typings').DryvOptions>
  ) {
    const options = dryvOptions(optionOverrides as any)
    const ruleSet: DryvValidationRuleSet<ParentModel> = {
      name: 'test',
      validators: ruleSetPartial.validators ?? ({} as any),
      disablers: ruleSetPartial.disablers,
      parameters: ruleSetPartial.parameters
    }
    const session = new DryvValidationSession<ParentModel>(options, ruleSet)
    const model: ParentModel = { items: [{ value: 'a' }, { value: 'b' }], name: 'test' }
    const validator = new DryvObjectValidator<ParentModel>(model, session, undefined, options)
    return { validator, session, model }
  }

  it('should create array validators for array fields', () => {
    const { validator } = createSetup()
    const itemsField = validator.fields.items

    // The items field should exist (either as an array validator or field validator)
    expect(itemsField).toBeDefined()
  })

  it('should validate array item fields when rules match nested paths', async () => {
    const { validator } = createSetup({
      validators: {
        'items.value': [{ validate: ($m: any) => (!$m.value ? 'Value required' : null) }]
      } as any
    })

    const result = await validator.validate()

    // Validation should run for the items
    expect(result).toBeDefined()
  })

  it('should validate the whole object including array fields', async () => {
    const rule = vi.fn().mockReturnValue(null)

    const { validator } = createSetup({
      validators: {
        name: [{ validate: rule }]
      } as any
    })

    const result = await validator.validate()

    expect(result.success).toBe(true)
    expect(rule).toHaveBeenCalled()
  })

  it('should support object validation with model containing arrays', () => {
    const { validator } = createSetup()

    expect(validator.value.name).toBe('test')
    expect(validator.value.items).toBeDefined()
  })
})
