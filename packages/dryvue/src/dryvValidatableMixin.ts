import { defineComponent } from 'vue'
import { DryvValidator } from 'dryvjs'

type Emit = (...args: any[]) => any

export interface DryvValidatableMixin<TValue> {
  modelValue: TValue | DryvValidator
  validatable: DryvValidator
}

export function dryvValidatableMixin<TValue>() {
  return defineComponent({
    props: ['modelValue'],
    data() {
      return {
        validatable: { value: undefined } as DryvValidator
      }
    },
    watch: {
      modelValue: {
        immediate: true,
        handler(modelValue: TValue) {
          this.validatable = toDryvValidatable<TValue>(modelValue, this.$emit) as any
        }
      }
    }
  })
}

function toDryvValidatable<TValue>(modelValue: TValue, emit: Emit): DryvValidator {
  return modelValue instanceof DryvValidator
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
