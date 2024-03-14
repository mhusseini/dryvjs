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
  session: DryvValidationSession<TModel> | undefined,
  options: DryvOptions,
  getter: () => TValue,
  setter: (value: TValue) => void
): DryvValidatableInternal<TModel, TValue> {
  let _text: string | null = null
  const validatable: DryvValidatableInternal<TModel, TValue> = options.objectWrapper!({
    _isDryvValidatable: true,
    field,
    get text() {
      return _text
    },
    set text(value: string | null) {
      _text = value
    },
    group: null,
    type: null,
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
    get hasError(): boolean {
      return this.type === 'error'
    },
    get hasWarning(): boolean {
      return this.type === 'warning'
    },
    get isSuccess(): boolean {
      return !this.hasError && !this.hasWarning
    },
    async validate(): Promise<DryvValidationResult> {
      const _session = parent?.session ?? session
      if (!_session) {
        throw new Error('No validation session found')
      }
      return _session.validateField(validatable as any)
    },
    get path(): string {
      return (parent?.path ? parent.path + '.' : '') + (field ? String(field) : '')
    },
    clear(): void {
      const _session = parent?.session ?? session
      if (!_session) {
        throw new Error('No validation session found')
      }
      _session!.results.fields[this.path] = undefined
      if (validatable.group) {
        _session!.results.groups[validatable.group] = undefined
      }
      validatable.type = null
      validatable.text = null
      validatable.group = null
    },
    set(response: DryvServerValidationResponse | DryvServerErrors | undefined | null): boolean {
      const messages: DryvServerErrors =
        typeof response?.success === 'boolean' ? response.messages : response
      const message: DryvFieldValidationResult = messages?.[this.path]
      if (message && message.type !== 'success') {
        validatable.text = message.text
        validatable.group = message.group
        validatable.type = message.type
      } else {
        validatable.text = undefined
        validatable.group = undefined
        validatable.type = undefined
      }

      return validatable.isSuccess
    },
    updateValue(value: TValue) {
      this.value = value
    },
    toJSON(): any {
      return { ...this, parent: undefined, _isDryvValidatable: undefined, session: undefined }
    }
  })
  return validatable
}
