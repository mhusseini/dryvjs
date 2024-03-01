import {
  DryvObject,
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidatable,
  DryvValidationResult
} from 'dryvjs'
import { Ref } from '@vue/reactivity'

export function useMappedField<TModel extends object, TTo>(
  model: DryvObject<TModel>,
  field: keyof TModel,
  mappedValue: Ref<TTo>
): DryvValidatable<any, TTo> {
  if (!model[field]) {
    model[field] = null!
  }

  const validatable = model[field] as DryvValidatable<any, TTo>

  return {
    _isDryvValidatable: true,
    groupShown: false,
    get value(): TTo {
      return mappedValue.value
    },
    set value(value: TTo) {
      mappedValue.value = value
    },
    get parent(): DryvValidatable | undefined {
      return validatable.parent
    },
    set parent(value: DryvValidatable | undefined) {
      validatable.parent = value
    },
    get hasError(): boolean {
      return validatable.hasError
    },
    get hasWarning(): boolean {
      return validatable.hasWarning
    },
    get isSuccess(): boolean {
      return validatable.isSuccess
    },
    async validate(): Promise<DryvValidationResult> {
      return validatable.validate()
    },
    get path(): string | undefined | null {
      return validatable.path
    },
    clear(): void {
      validatable.clear()
    },
    set(response: DryvServerValidationResponse | DryvServerErrors): boolean {
      return validatable.set(response)
    },
    updateValue(value: any): void {
      validatable.updateValue(value)
    },
    get required(): boolean | null | undefined {
      return validatable.required
    },
    set required(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get text(): string | null | undefined {
      return validatable.text
    },
    set text(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get group(): string | null | undefined {
      return validatable.group
    },
    set group(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get type(): string | null | undefined {
      return validatable.type
    },
    set type(_) {
      throw new Error('The method must not be called on this instance.')
    }
  }
}
