import { DryvValidatable, DryvValidationResult, DryvValidationSession } from 'dryvjs'
import { Ref } from '@vue/reactivity'

export function useMappedGroup<TModel extends object, TTo>(
  session: DryvValidationSession<TModel>,
  groupName: string,
  field: Ref<TTo>
): DryvValidatable<any, TTo> {
  return {
    _isDryvValidatable: true,
    groupShown: false,
    get value(): TTo {
      return field.value
    },
    set value(value: TTo) {
      field.value = value
    },
    get parent(): DryvValidatable | undefined {
      return undefined
    },
    set parent(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get hasError(): boolean {
      return session.results.groups[groupName]?.type === 'error'
    },
    get hasWarning(): boolean {
      return session.results.groups[groupName]?.type === 'warning'
    },
    get isSuccess(): boolean {
      const type = session.results.groups[groupName]?.type
      return !type || type === 'success'
    },
    validate(): Promise<DryvValidationResult> {
      throw new Error('The method must not be called on this instance.')
    },
    get path(): string | undefined | null {
      return undefined
    },
    updateValue(): void {
      throw new Error('The method must not be called on this instance.')
    },
    clear(): void {
      throw new Error('The method must not be called on this instance.')
    },
    set(): boolean {
      throw new Error('The method must not be called on this instance.')
    },
    get text(): string | null | undefined {
      return session.results.groups[groupName]?.text
    },
    set text(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get group(): string | null | undefined {
      return groupName
    },
    set group(_) {
      throw new Error('The method must not be called on this instance.')
    },
    get type(): string | null | undefined {
      return session.results.groups[groupName]?.type
    },
    set type(_) {
      throw new Error('The method must not be called on this instance.')
    }
  }
}
