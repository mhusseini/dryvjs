import { isDryvValidatable } from '../'
import { defineComponent, reactive } from 'vue'
import type { DryvValidatable } from '@/dryv/core/typings'

export function dryvBindValueMixin<TValue>() {
  return defineComponent({
    props: ['modelValue'],
    emits: ['update:modelValue'],
    data() {
      return reactive({
        value: {} as DryvValidatable<any, TValue>
      })
    },
    watch: {
      modelValue: {
        immediate: true,
        handler(modelValue: TValue) {
          const emit = this.$emit
          this.value = isDryvValidatable(modelValue)
            ? (modelValue as any)
            : {
                get value(): TValue {
                  return modelValue
                },
                set value(newValue: TValue) {
                  emit('update:modelValue', newValue)
                }
              }
        }
      }
    }
  })
}
