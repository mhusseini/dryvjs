import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, reactive, nextTick } from 'vue'
import { createApp } from 'vue'
import { useDryv } from '../../useDryv'
import { useDryvValueProp } from '../../useDryvValueProp'
import { Dryv } from '../../plugin'
import type { DryvValidatable } from '@softwareproduction/dryvjs'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvjs'

interface TestModel {
  name: string
}

function installPlugin() {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
}

const ValidatingInput = defineComponent({
  name: 'ValidatingInput',
  props: {
    modelValue: { type: [String, Object], default: undefined },
    label: { type: String, required: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const validatable = useDryvValueProp(emit, () => props.modelValue as DryvValidatable<any> | string | undefined)
    return { validatable }
  },
  template: `
    <div class="field">
      <label>{{ label }}<span v-if="validatable?.required" class="required">*</span></label>
      <input v-model="validatable.value" data-testid="input" />
      <span v-if="validatable?.hasErrors && !validatable?.groupShown" class="error" data-testid="error">
        {{ validatable.text }}
      </span>
    </div>
  `
})

describe('ValidatingInput Component', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should render with a label', () => {
    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: 'test' }
    })

    expect(wrapper.find('label').text()).toContain('Name')
  })

  it('should display the model value in the input', async () => {
    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: 'hello' }
    })
    await nextTick()

    const input = wrapper.find('[data-testid="input"]')
    expect((input.element as HTMLInputElement).value).toBe('hello')
  })

  it('should emit update:modelValue when input changes (plain string)', async () => {
    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: '' }
    })
    await nextTick()

    await wrapper.find('[data-testid="input"]').setValue('typed')

    expect(wrapper.emitted('update:modelValue')).toBeDefined()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['typed'])
  })

  it('should display error when bound to a DryvValidator with errors', async () => {
    const model = reactive<TestModel>({ name: '' })
    const ruleSet: DryvValidationRuleSet<TestModel> = {
      name: 'testRuleSet',
      validators: {
        name: [{ validate: ($m: TestModel) => (!$m.name ? 'Required field' : null) }]
      } as any
    }

    const { validatable, validate } = useDryv(model, ruleSet)
    await validate()

    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: validatable.name as any }
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="error"]').text()).toContain('Required field')
  })

  it('should show required indicator when validator has required annotation', async () => {
    const model = reactive<TestModel>({ name: '' })
    const ruleSet: DryvValidationRuleSet<TestModel> = {
      name: 'testRuleSet',
      validators: {
        name: [{ annotations: { required: true }, validate: () => null }]
      } as any
    }

    const { validatable } = useDryv(model, ruleSet)

    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: validatable.name as any }
    })
    await flushPromises()

    expect(wrapper.find('.required').exists()).toBe(true)
  })

  it('should not show error when validation passes', async () => {
    const model = reactive<TestModel>({ name: 'valid' })
    const ruleSet: DryvValidationRuleSet<TestModel> = {
      name: 'testRuleSet',
      validators: {
        name: [{ validate: () => null }]
      } as any
    }

    const { validatable, validate } = useDryv(model, ruleSet)
    await validate()

    const wrapper = mount(ValidatingInput, {
      props: { label: 'Name', modelValue: validatable.name as any }
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false)
  })
})

describe('ValidatingInput in Parent Form', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should work with v-model in a parent component', async () => {
    const ParentForm = defineComponent({
      components: { ValidatingInput },
      setup() {
        const model = reactive<TestModel>({ name: '' })
        const ruleSet: DryvValidationRuleSet<TestModel> = {
          name: 'testRuleSet',
          validators: {
            name: [{ validate: ($m: TestModel) => (!$m.name ? 'Name required' : null) }]
          } as any
        }
        const { validatable, validate, valid } = useDryv(model, ruleSet)
        return { validatable, validate, valid }
      },
      template: `
        <form @submit.prevent="validate">
          <validating-input v-model="validatable.name" label="Name" />
          <button type="submit" data-testid="submit">Submit</button>
          <span v-if="valid" data-testid="valid">OK</span>
        </form>
      `
    })

    const wrapper = mount(ParentForm)
    const result = await wrapper.vm.validate()

    expect(result.success).toBe(false)
    expect(wrapper.vm.validatable.name.hasErrors).toBe(true)
    expect(wrapper.vm.validatable.name.text).toBe('Name required')
  })
})
