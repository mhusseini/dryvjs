import type { Ref } from 'vue'
import { ref, watchEffect } from 'vue'
import { DryvValidator } from 'dryvjs'

export function useDryvValueProp<TModel extends object, TValue = object>(
  emit: (event: any, ...args: any[]) => void,
  prop: () => DryvValidator | TValue,
  event: string = 'update:modelValue'
): Ref<DryvValidator> {
  const result = ref()

  watchEffect(() => {
    const modelValue = prop()
    result.value =
      modelValue instanceof DryvValidator
        ? modelValue
        : {
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
