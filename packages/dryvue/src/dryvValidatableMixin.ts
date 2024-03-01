import { defineComponent } from 'vue'
import { DryvValidatable, isDryvValidatable } from 'dryvjs'

type Emit = (...args: any[]) => any

export interface DryvValidatableMixin<TValue> {
  modelValue: TValue | DryvValidatable<any, TValue>
  validatable: DryvValidatable<any, TValue>
}

export function dryvValidatableMixin<TValue>() {
  return defineComponent({
    props: ['modelValue'],
    data() {
      return {
        validatable: { value: undefined } as DryvValidatable<any, TValue>
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

function toDryvValidatable<TValue>(modelValue: TValue, emit: Emit): DryvValidatable<any, TValue> {
  return isDryvValidatable(modelValue)
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
