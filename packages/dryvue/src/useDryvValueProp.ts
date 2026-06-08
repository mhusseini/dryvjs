import type { Ref } from 'vue'
import { ref, watchEffect } from 'vue'
import { DryvValidatable, DryvValidator, getDryvValidator } from '@softwareproduction/dryvjs'

export function useDryvValueProp<TValue = object>(
  emit: (event: any, ...args: any[]) => void,
  prop: () => DryvValidatable<TValue> | TValue,
  event: string = 'update:modelValue'
): Ref<DryvValidator> {
  const result = ref()

  watchEffect(() => {
    const modelValue = prop()
    result.value = getDryvValidator(modelValue as any) ?? {
      __dryvValidator: true,
      get value() {
        return modelValue
      },
      set value(newValue) {
        emit(event as any, newValue)
      }
    }
  })

  return result
}
