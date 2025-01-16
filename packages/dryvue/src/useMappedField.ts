import {
  DryvServerErrors,
  DryvServerValidationResponse,
  DryvValidationResult,
  DryvValidator
} from 'dryvjs'
import { Ref } from '@vue/reactivity'

export function useMappedField<TModel extends object, TTo>(
  model: TModel,
  field: keyof TModel,
  mappedValue: Ref<TTo | undefined>
): DryvValidator<any, TTo> {
  if (!model[field]) {
    model[field] = null!
  }

  const validatable = model[field] as DryvValidator<any, TTo>

  return {
    __dryvValidator: true,
    groupShown: false,
    get value(): TTo | undefined {
      return mappedValue.value
    },
    set value(value: TTo | undefined) {
      mappedValue.value = value
    },
    get parent(): DryvValidator | null | undefined {
      return validatable.parent
    },
    set parent(value: DryvValidator | undefined) {
      validatable.parent = value
    },
    get hasErrors(): boolean {
      return validatable.hasErrors
    },
    get hasWarnings(): boolean {
      return validatable.hasWarnings
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
    setValidationResult(response: DryvServerValidationResponse | DryvServerErrors): boolean {
      return validatable.setValidationResult(response)
    },
    updateValue(value: any): void {
      validatable.value = value
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
    },
    toJSON(): any {
      return { ...this, parent: undefined, __dryvValidator: undefined, session: undefined }
    }
  } as any
}
