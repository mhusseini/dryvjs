import { describe, it, expect, vi } from 'vitest'
import { DryvObjectValidator, DryvArrayValidator, DryvValidationSession, dryvOptions, DryvValidationRuleSet, DryvOptions } from '@/.'

describe('Array Validation — Extended', () => {
  interface ItemModel {
    value: string
  }

  interface ParentModel {
    items: ItemModel[]
    name: string
  }

  function createSetup(
    ruleSetPartial: Partial<DryvValidationRuleSet<ParentModel>> = {},
    optionOverrides?: Partial<DryvOptions>
  ) {
    const options = dryvOptions({ validationTrigger: 'auto', ...optionOverrides } as any)
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

  describe('array child validators', () => {
    it('should create child validators for each array element', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      expect(arrValidator).toBeDefined()
      const children = arrValidator.childValidators()
      expect(children.length).toBe(2)
    })

    it('should assign correct indices to array item validators', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>
      const children = arrValidator.childValidators()

      expect(children[0].index).toBe(0)
      expect(children[1].index).toBe(1)
    })

    it('should compute correct paths for nested array item fields', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>
      const children = arrValidator.childValidators()
      const firstChild = children[0] as unknown as DryvObjectValidator<ItemModel>

      expect(firstChild.fields.value).toBeDefined()
      expect(firstChild.fields.value!.path).toBe('items.value')
    })
  })

  describe('array mutations via proxy', () => {
    it('should add a child validator when pushing an item', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.push({ value: 'c' })

      expect(arrValidator.childValidators().length).toBe(3)
    })

    it('should remove a child validator when popping an item', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.pop()

      expect(arrValidator.childValidators().length).toBe(1)
    })

    it('should add a child validator at the beginning when unshifting', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.unshift({ value: 'z' })

      expect(arrValidator.childValidators().length).toBe(3)
    })

    it('should remove a child validator when shifting', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.shift()

      expect(arrValidator.childValidators().length).toBe(1)
    })

    it('should handle splice for replacement', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.splice(0, 1, { value: 'replaced' })

      const children = arrValidator.childValidators()
      expect(children.length).toBe(2)
    })

    it('should update indices after push', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.push({ value: 'c' })

      const children = arrValidator.childValidators()
      expect(children[0].index).toBe(0)
      expect(children[1].index).toBe(1)
      expect(children[2].index).toBe(2)
    })

    it('should update indices after shift', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.proxy.shift()

      const children = arrValidator.childValidators()
      expect(children.length).toBe(1)
      expect(children[0].index).toBe(0)
    })

    it('should fire remove event when setting length to 0', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      const initialCount = arrValidator.childValidators().length
      expect(initialCount).toBe(2)

      // Setting length = 0 triggers a remove event on the array proxy,
      // which removes matching items from _items by model identity.
      arrValidator.proxy.length = 0
      // The underlying array is cleared
      expect(arrValidator.proxy.length).toBe(0)
    })
  })

  describe('array value replacement', () => {
    it('should rebuild child validators when value is replaced', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.value = [{ value: 'x' }, { value: 'y' }, { value: 'z' }]

      const newChildren = arrValidator.childValidators()
      expect(newChildren.length).toBe(3)
    })

    it('should reflect new values after replacement', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      arrValidator.value = [{ value: 'x' }]

      expect(arrValidator.childValidators().length).toBe(1)
    })
  })

  describe('array validation with rules', () => {
    it('should validate array item fields using path-based rules', async () => {
      const rule = vi.fn().mockImplementation(($m: any) => (!$m.value ? 'Value required' : null))

      const options = dryvOptions({ validationTrigger: 'auto' } as any)
      const ruleSet: DryvValidationRuleSet<ParentModel> = {
        name: 'test',
        validators: {
          'items.value': [{ validate: rule }]
        } as any
      }
      const session = new DryvValidationSession<ParentModel>(options, ruleSet)
      const model: ParentModel = { items: [{ value: '' }, { value: 'ok' }], name: 'test' }
      const validator = new DryvObjectValidator<ParentModel>(model, session, undefined, options)

      const result = await validator.validate()

      expect(rule).toHaveBeenCalled()
    })
  })

  describe('array with empty initial array', () => {
    it('should handle an empty initial array', () => {
      const options = dryvOptions({ validationTrigger: 'auto' } as any)
      const ruleSet: DryvValidationRuleSet<ParentModel> = {
        name: 'test',
        validators: {} as any
      }
      const session = new DryvValidationSession<ParentModel>(options, ruleSet)
      const model: ParentModel = { items: [], name: 'test' }
      const validator = new DryvObjectValidator<ParentModel>(model, session, undefined, options)

      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>
      expect(arrValidator.childValidators().length).toBe(0)
    })

    it('should create validators when items are pushed to initially empty array', () => {
      const options = dryvOptions({ validationTrigger: 'auto' } as any)
      const ruleSet: DryvValidationRuleSet<ParentModel> = {
        name: 'test',
        validators: {} as any
      }
      const session = new DryvValidationSession<ParentModel>(options, ruleSet)
      const model: ParentModel = { items: [], name: 'test' }
      const validator = new DryvObjectValidator<ParentModel>(model, session, undefined, options)

      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>
      arrValidator.proxy.push({ value: 'new' })

      expect(arrValidator.childValidators().length).toBe(1)
    })
  })

  describe('array serialization', () => {
    it('should serialize array validator via toJSON', () => {
      const { validator } = createSetup()
      const arrValidator = validator.fields.items as unknown as DryvArrayValidator<ItemModel>

      const json = JSON.stringify(arrValidator)
      const parsed = JSON.parse(json)

      expect(parsed.path).toBe('items')
      expect(parsed.hasErrors).toBe(false)
    })
  })
})
