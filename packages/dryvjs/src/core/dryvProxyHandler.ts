import type { DryvProxy, DryvOptions, DryvValidatableInternal, DryvValidatable } from './typings'
import { dryvProxy, isDryvProxy } from '.'
import { isDryvValidatable } from './isDryvValidatable'
import { dryvValidatableObject } from './dryvValidatableObject'
import { dryvValidatableValue } from './dryvValidatableValue'
import type { DryvValidationSession } from './typings'

export function dryvProxyHandler<TModel extends object>(
  field: keyof TModel | undefined,
  session: DryvValidationSession<TModel>,
  options: DryvOptions
): ProxyHandler<TModel> {
  return new DryvProxyHandler(field, session, options)
}

class DryvProxyHandler<TModel extends object> {
  private _excludedFields: { [field: string]: boolean } = {}
  private _validatable: DryvValidatableInternal<TModel> | null = null
  private _values: { [field: string]: any } = {}

  constructor(
    private field: keyof TModel | undefined,
    private session: DryvValidationSession<TModel>,
    private options: DryvOptions
  ) {}

  get(target: TModel, fieldSymbol: string | symbol, receiver: any): any {
    const fieldName = String(fieldSymbol)
    if (fieldName === '$validatable') {
      return this.getDryv(receiver)
    }

    if (this.isExcludedField(fieldName)) {
      return Reflect.get(target, fieldName, receiver)
    }

    if (this._values[fieldName] !== undefined) {
      return this._values[fieldName]
    }

    const originalValue = Reflect.get(target, fieldName, receiver)
    const field = fieldName as keyof TModel
    let resultValue

    if (originalValue && typeof originalValue === 'object') {
      resultValue = this.ensureObjectProxy(
        originalValue,
        field as keyof TModel,
        receiver,
        this.session
      )
      if (resultValue !== originalValue) {
        //Reflect.set(target, fieldName, resultValue, receiver)
        this._values[fieldName] = resultValue
      }
    } else if (typeof originalValue !== 'function') {
      this.ensureValueProxy(field as keyof TModel, receiver, this.session)
      resultValue = originalValue
    }

    return resultValue
  }

  set(target: TModel, fieldSymbol: string, value: any, receiver: any): boolean {
    const fieldName = String(fieldSymbol)
    if (fieldName === '$validatable') {
      throw new Error('The $validatable property is read-only.')
    }

    const field = fieldName as keyof TModel

    if (typeof value === 'function') {
      return Reflect.set(target, field, value, receiver)
    }

    if (this.isExcludedField(fieldName)) {
      return Reflect.set(target, field, value, receiver)
    }

    const originalValue = this._values[fieldName] ?? Reflect.get(target, field, receiver)

    if (!value && isDryvProxy(originalValue)) {
      originalValue.$validatable.parent = undefined
    }

    let targetValue
    let proxy: DryvValidatable | undefined = undefined

    if (value && typeof value === 'object') {
      targetValue = this.ensureObjectProxy(value, field as keyof TModel, receiver, this.session)
    } else {
      proxy = this.ensureValueProxy(field as keyof TModel, receiver, this.session)
      targetValue = value
    }

    this._values[fieldName] = targetValue
    const result = Reflect.set(target, field, value, receiver)

    proxy?.validate().catch(console.error)

    return result
  }

  private ensureObjectProxy(
    value: any,
    field: keyof TModel,
    receiver: TModel,
    session: DryvValidationSession<TModel>
  ) {
    const proxy: DryvProxy<any> = !isDryvProxy(value)
      ? dryvProxy(value, field, session, this.options)
      : value

    const dryv = this.getDryv(receiver)
    dryv.value[field] = proxy.$validatable.value
    proxy.$validatable.parent = dryv

    return proxy
  }

  private ensureValueProxy(
    field: keyof TModel,
    receiver: TModel,
    session: DryvValidationSession<TModel>
  ): DryvValidatable {
    const dryv = this.getDryv(receiver)
    const dryvObject = dryv.value

    if (isDryvValidatable(dryvObject[field])) {
      return dryvObject[field]
    }

    const validatable = dryvValidatableValue(
      field,
      dryv,
      session,
      this.options,
      () => receiver[field],
      (value) => (receiver[field] = value)
    )

    const proxy = this.options.objectWrapper!(validatable)

    dryvObject[field] = proxy

    return proxy
  }

  private getDryv(model: TModel) {
    if (!this._validatable) {
      this._validatable = dryvValidatableObject<TModel>(
        this.field,
        this.session,
        model,
        this.options
      )
    }

    return this._validatable
  }

  private isExcludedField(field: string) {
    if (this._excludedFields[field] === undefined) {
      this._excludedFields[field] = !!this.options.excludedFields?.find((regexp) =>
        regexp?.test(field)
      )
    }

    return this._excludedFields[field]
  }
}
