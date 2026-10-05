import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, reactive, createApp } from 'vue'
import { dryvValidatableMixin } from '../dryvValidatableMixin'
import { useDryv } from '../useDryv'
import { Dryv } from '../plugin'
import { createRuleSet, type SimpleModel } from './helpers'

function installPlugin() {
  const app = createApp({ template: '<div />' })
  app.use(Dryv)
}

describe('dryvValidatableMixin', () => {
  beforeEach(() => {
    installPlugin()
  })

  it('should create a validatable from a plain string modelValue', async () => {
    const MixinComponent = defineComponent({
      mixins: [dryvValidatableMixin<string>()],
      template: '<span>{{ validatable.value }}</span>'
    })

    const wrapper = mount(MixinComponent, {
      props: { modelValue: 'hello' }
    })

    expect(wrapper.vm.validatable).toBeDefined()
    expect(wrapper.vm.validatable.value).toBe('hello')
  })

  it('should emit update:modelValue when wrapper value is set', async () => {
    const MixinComponent = defineComponent({
      mixins: [dryvValidatableMixin<string>()],
      template: '<span>{{ validatable.value }}</span>'
    })

    const wrapper = mount(MixinComponent, {
      props: { modelValue: 'initial' }
    })

    wrapper.vm.validatable.value = 'changed'
    expect(wrapper.emitted('update:modelValue')).toBeDefined()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['changed'])
  })

  it('should pass through a DryvValidator from useDryv', async () => {
    const model = reactive<SimpleModel>({ name: 'test', email: '' })
    const ruleSet = createRuleSet<SimpleModel>({
      validators: { name: [{ validate: () => null }] } as any
    })
    const { validatable } = useDryv(model, ruleSet)

    const MixinComponent = defineComponent({
      mixins: [dryvValidatableMixin<string>()],
      template: '<span>{{ validatable.value }}</span>'
    })

    const wrapper = mount(MixinComponent, {
      props: { modelValue: validatable.name as any }
    })

    expect(wrapper.vm.validatable.__dryvValidator).toBe(true)
  })

  it('should update validatable when modelValue changes', async () => {
    const MixinComponent = defineComponent({
      mixins: [dryvValidatableMixin<string>()],
      template: '<span>{{ validatable.value }}</span>'
    })

    const wrapper = mount(MixinComponent, {
      props: { modelValue: 'first' }
    })

    expect(wrapper.vm.validatable.value).toBe('first')

    await wrapper.setProps({ modelValue: 'second' })
    expect(wrapper.vm.validatable.value).toBe('second')
  })
})
