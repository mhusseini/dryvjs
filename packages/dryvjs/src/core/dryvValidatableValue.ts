import type {
  DryvValidatable,
  DryvValidationResult,
  DryvValidationSession,
  DryvOptions,
  DryvValidatableInternal,
  DryvFieldValidationResult,
  DryvServerErrors,
  DryvServerValidationResponse
} from './typings'

export function dryvValidatableValue<TModel extends object = any, TValue = any>(
  field: keyof TModel | undefined,
  parent: DryvValidatableInternal | undefined,
  options: DryvOptions,
  getter: () => TValue,
  setter: (value: TValue) => void
): DryvValidatableInternal<TModel, TValue> {
  const validatable: DryvValidatableInternal<TModel, TValue> = options.objectWrapper!({
    _isDryvValidatable: true,
    field,
    text: null,
    group: null,
    status: null,
    get value(): TValue {
      return getter()
    },
    set value(value: TValue) {
      setter(value)
    },
    get parent(): DryvValidatable | undefined {
      return parent
    },
    set parent(value: DryvValidatableInternal | undefined) {
      parent = value
    },
    get session(): DryvValidationSession<TModel> | undefined {
      return parent?.session
    },
    async validate(): Promise<DryvValidationResult<TModel> | null> {
      const session = parent?.session
      if (!session) {
        throw new Error('No validation session found')
      }
      return session.validateField(this)
    },
    get path(): string {
      return (parent?.path ? parent.path + '.' : '') + (field ? String(field) : '')
    },
    clear(): void {
      validatable.status = null
      validatable.text = null
      validatable.group = null
    },
    set(response: DryvServerValidationResponse | DryvServerErrors | undefined | null): void {
      const messages: DryvServerErrors =
        typeof response?.success === 'boolean' ? response.messages : response
      const message: DryvFieldValidationResult = messages?.[this.path]
      if (message && message.status !== 'success') {
        validatable.text = message.text
        validatable.group = message.group
        validatable.status = message.status
      } else {
        validatable.text = undefined
        validatable.group = undefined
        validatable.status = undefined
      }
    },
    toJSON(): any {
      return { ...this, parent: undefined, _isDryvValidatable: undefined }
    }
  })
  return validatable
}
