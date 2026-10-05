import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, reactive, nextTick } from 'vue'
import { createApp } from 'vue'
import { useDryv } from '../../useDryv'
import { Dryv } from '../../plugin'
import type { DryvValidationRuleSet } from '@softwareproduction/dryvjs'

interface FormModel {
  name: string
  email: string
}

function installPlugin() {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
}

const FormComponent = defineComponent({
  template: `
    <form @submit.prevent="validate">
      <div class="field-name">
        <input v-model="validatable.name.value" data-testid="name-input" />
        <span v-if="validatable.name.hasErrors" class="error" data-testid="name-error">
          {{ validatable.name.text }}
        </span>
      </div>
      <div class="field-email">
        <input v-model="validatable.email.value" data-testid="email-input" />
        <span v-if="validatable.email.hasErrors" class="error" data-testid="email-error">
          {{ validatable.email.text }}
        </span>
      </div>
      <button type="submit" :disabled="!valid" data-testid="submit-btn">Submit</button>
      <button type="button" @click="revert" :disabled="!dirty" data-testid="revert-btn">Revert</button>
      <span v-if="valid" data-testid="valid-indicator">Valid</span>
      <span v-if="dirty" data-testid="dirty-indicator">Dirty</span>
    </form>
  `,
  setup() {
    const data = reactive<FormModel>({ name: '', email: '' })

    const ruleSet: DryvValidationRuleSet<FormModel> = {
      name: 'testForm',
      validators: {
        name: [{ validate: ($m: FormModel) => (!$m.name ? 'Name is required' : null) }],
        email: [
          {
            validate: ($m: FormModel) =>
              !$m.email
                ? 'Email is required'
                : !$m.email.includes('@')
                  ? 'Email must contain @'
                  : null
          }
        ]
      } as any
    }

    const { validatable, validate, valid, dirty, commit, revert } = useDryv(data, ruleSet)

    return { validatable, validate, valid, dirty, commit, revert }
  }
})

describe('Form Validation UI', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should render the form with inputs', () => {
    const wrapper = mount(FormComponent)

    expect(wrapper.find('[data-testid="name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="submit-btn"]').exists()).toBe(true)
  })

  it('should produce validation errors for empty fields', async () => {
    const wrapper = mount(FormComponent)

    const result = await wrapper.vm.validate()

    expect(result.success).toBe(false)
    expect(result.hasErrors).toBe(true)
    expect(wrapper.vm.validatable.name.hasErrors).toBe(true)
    expect(wrapper.vm.validatable.name.text).toBe('Name is required')
    expect(wrapper.vm.validatable.email.hasErrors).toBe(true)
    expect(wrapper.vm.validatable.email.text).toBe('Email is required')
  })

  it('should clear name error when valid name is provided', async () => {
    const wrapper = mount(FormComponent)

    await wrapper.vm.validate()
    expect(wrapper.vm.validatable.name.hasErrors).toBe(true)

    wrapper.vm.validatable.name.value = 'John'
    await wrapper.vm.validate()

    expect(wrapper.vm.validatable.name.hasErrors).toBe(false)
    expect(wrapper.vm.validatable.name.text).toBeNull()
  })

  it('should show specific email format error', async () => {
    const wrapper = mount(FormComponent)

    wrapper.vm.validatable.name.value = 'John'
    wrapper.vm.validatable.email.value = 'invalid'
    await wrapper.vm.validate()

    expect(wrapper.vm.validatable.email.hasErrors).toBe(true)
    expect(wrapper.vm.validatable.email.text).toBe('Email must contain @')
  })

  it('should report valid when all fields pass', async () => {
    const wrapper = mount(FormComponent)

    wrapper.vm.validatable.name.value = 'John'
    wrapper.vm.validatable.email.value = 'john@example.com'
    await wrapper.vm.validate()

    expect(wrapper.vm.valid).toBe(true)
    expect(wrapper.vm.validatable.name.hasErrors).toBe(false)
    expect(wrapper.vm.validatable.email.hasErrors).toBe(false)
  })

  it('should track dirty state when input changes', async () => {
    const wrapper = mount(FormComponent)

    wrapper.vm.commit()
    expect(wrapper.vm.dirty).toBe(false)

    wrapper.vm.validatable.name.value = 'changed'
    await nextTick()

    expect(wrapper.vm.dirty).toBe(true)
  })

  it('should revert changes to committed state', async () => {
    const wrapper = mount(FormComponent)

    wrapper.vm.commit()

    wrapper.vm.validatable.name.value = 'changed'
    await nextTick()
    expect(wrapper.vm.dirty).toBe(true)

    wrapper.vm.revert()
    await nextTick()

    expect(wrapper.vm.dirty).toBe(false)
    expect(wrapper.vm.validatable.name.value).toBe('')
  })

  it('should be invalid after failing validation', async () => {
    const wrapper = mount(FormComponent)

    await wrapper.vm.validate()

    expect(wrapper.vm.valid).toBe(false)
  })

  it('should be valid after passing validation', async () => {
    const wrapper = mount(FormComponent)

    wrapper.vm.validatable.name.value = 'John'
    wrapper.vm.validatable.email.value = 'john@example.com'
    await wrapper.vm.validate()

    expect(wrapper.vm.valid).toBe(true)
  })
})
