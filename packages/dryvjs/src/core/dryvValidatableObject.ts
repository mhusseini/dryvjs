import type {
  DryvObject,
  DryvOptions,
  DryvValidatable,
  DryvValidatableInternal,
  DryvValidationResult,
  DryvValidationSession,
  DryvServerErrors,
  DryvServerValidationResponse
} from './typings'
import { isDryvValidatable } from './isDryvValidatable'
import { dryvValidatableValue } from './dryvValidatableValue'
import { isDryvProxy } from './isDryvProxy'

export function dryvValidatableObject<TModel extends object = any, TValue extends object = any>(
  field: keyof TModel | undefined,
  parentOrSession: DryvValidatableInternal | DryvValidationSession<TModel> | undefined,
  model: TModel,
  options: DryvOptions
): DryvValidatableInternal<TModel, DryvObject<TValue>> {
  const parentIsValidatable = isDryvValidatable(parentOrSession)
  const handler = new DryvValidatableObjectHandler(
    model,
    parentIsValidatable ? (parentOrSession as DryvValidatableInternal) : undefined,
    parentIsValidatable ? undefined : (parentOrSession as DryvValidationSession<TModel>),
    options
  )
  const _value: DryvObject<TValue> = new Proxy(
    {
      $model: model,
      toJSON(): any {
        return { ...this, $model: undefined }
      }
    } as any,
    handler
  )

  const validatable: DryvValidatableInternal<TModel, DryvObject<TValue>> = options.objectWrapper!({
    _isDryvValidatable: true,
    field,
    text: null,
    group: null,
    type: null,
    required: null,
    get value(): DryvObject<TValue> {
      return _value
    },
    get parent(): DryvValidatable | undefined {
      return handler.parent
    },
    set parent(value: DryvValidatableInternal | undefined) {
      handler.parent = value
    },
    get session(): DryvValidationSession<TModel> | undefined {
      return handler.session
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
    get path(): string {
      return (handler.parent?.path ? handler.parent.path + '.' : '') + (field ? String(field) : '')
    },
    async validate(): Promise<DryvValidationResult> {
      const session = handler.session
      if (!session) {
        throw new Error('No validation session found')
      }
      return session.validateObject(this)
    },
    clear(): void {
      validatable.type = null
      validatable.text = null
      validatable.group = null

      Object.values(_value)
        .filter((v: any) => isDryvValidatable(v))
        .forEach((v: any) => (v as DryvValidatable).clear())
    },
    set(response: DryvServerValidationResponse | DryvServerErrors): boolean {
      return Object.values(_value)
        .filter((v: any) => isDryvValidatable(v))
        .reduce((acc: boolean, v: any) => (v as DryvValidatable).set(response) && acc, true)
    },
    updateValue(value: any) {
      const model = this.value

      Object.entries(value).forEach(([key, entry]) => {
        const newValue = isDryvValidatable(entry) ? (entry as DryvValidatable).value : entry
        const oldValue = model[key as keyof TValue] as DryvObject<any>
        if (isDryvValidatable(oldValue)) {
          oldValue.updateValue(newValue)
        } else if (isDryvValidatable(oldValue?.$model.$validatable)) {
          oldValue.$model.$validatable.updateValue(newValue)
        } else {
          model[key as keyof TValue] = newValue as any
        }
      })
    },
    toJSON(): any {
      return { ...this, parent: undefined, _isDryvValidatable: undefined, session: undefined }
    }
  })

  return validatable
}

class DryvValidatableObjectHandler<TModel extends object> {
  _session?: DryvValidationSession<TModel>
  get session(): DryvValidationSession<TModel> | undefined {
    return this.parent?.session ?? this._session
  }

  constructor(
    public model: TModel,
    public parent: DryvValidatableInternal | undefined,
    session: DryvValidationSession<TModel> | undefined,
    private options: DryvOptions
  ) {
    this._session = session
  }

  set(target: TModel, field: string, value: any, receiver: any): boolean {
    return target.hasOwnProperty(field) || isDryvValidatable(value) || isDryvProxy(value)
      ? Reflect.set(target, field, value)
      : Reflect.set(
          target,
          field,
          dryvValidatableValue(
            field as keyof TModel,
            receiver,
            this.session,
            this.options,
            () => (this.model as any)[field],
            (value) => ((this.model as any)[field] = value)
          )
        )
  }
}
