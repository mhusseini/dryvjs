import type { DryvProxy, DryvOptions, DryvValidatableInternal, DryvValidatable } from './typings'
import { dryvProxy, isDryvProxy } from '.'
import { isDryvValidatable } from './isDryvValidatable'
import { dryvValidatableObject } from './dryvValidatableObject'
import { dryvValidatableValue } from './dryvValidatableValue'
import type { DryvValidationSession } from './typings'

function updateModel<TModel extends object>(model: TModel, newValues: TModel) {
  for (const key in newValues) {
    if (newValues.hasOwnProperty(key)) {
      model[key] = newValues[key]
    }
  }
}

export function dryvProxyHandler<TModel extends object>(
  field: keyof TModel | undefined,
  session: DryvValidationSession<TModel>,
  options: DryvOptions
): ProxyHandler<TModel> {
  const _excludedFields: { [field: string]: boolean } = {}
  let _dryv: DryvValidatableInternal<TModel> | null = null

  return {
    get(target: TModel, fieldSymbol: string | symbol, receiver: any): any {
      const fieldName = String(fieldSymbol)
      if (fieldName === '$validatable') {
        return getDryv(receiver)
      }

      if (isExcludedField(fieldName)) {
        return Reflect.get(target, fieldName, receiver)
      }

      const originalValue = Reflect.get(target, fieldName, receiver)
      const field = fieldName as keyof TModel
      let resultValue

      if (originalValue && typeof originalValue === 'object') {
        resultValue = ensureObjectProxy(originalValue, field as keyof TModel, receiver, session)
        if (resultValue !== originalValue) {
          Reflect.set(target, fieldName, resultValue)
        }
      } else if (typeof originalValue !== 'function') {
        ensureValueProxy(field as keyof TModel, receiver, session)
        resultValue = originalValue
      }

      return resultValue
    },

    set(target: TModel, fieldSymbol: string, value: any, receiver: any): boolean {
      const fieldName = String(fieldSymbol)
      if (fieldName === '$validatable') {
        throw new Error('The $validatable property is read-only.')
      }

      const field = fieldName as keyof TModel

      if (typeof value === 'function') {
        return Reflect.set(target, field, value)
      }

      if (isExcludedField(fieldName)) {
        return Reflect.set(target, field, value)
      }

      const originalValue = Reflect.get(target, field, receiver)

      if (!value && isDryvProxy(originalValue)) {
        originalValue.$validatable.parent = undefined
      }

      let targetValue
      let proxy: DryvValidatable | undefined = undefined

      if (value && typeof value === 'object') {
        targetValue = ensureObjectProxy(value, field as keyof TModel, receiver, session)
      } else {
        proxy = ensureValueProxy(field as keyof TModel, receiver, session)
        targetValue = value
      }

      const result = Reflect.set(target, field, targetValue)

      proxy?.validate().catch(console.error)

      return result
    }
  }

  function ensureObjectProxy(
    value: any,
    field: keyof TModel,
    receiver: TModel,
    session: DryvValidationSession<TModel>
  ) {
    const proxy: DryvProxy<any> = !isDryvProxy(value)
      ? dryvProxy(value, field, session, options)
      : value

    const dryv = getDryv(receiver)
    dryv.value[field] = proxy.$validatable.value
    proxy.$validatable.parent = dryv

    return proxy
  }

  function ensureValueProxy(
    field: keyof TModel,
    receiver: TModel,
    session: DryvValidationSession<TModel>
  ): DryvValidatable {
    const dryv = getDryv(receiver)
    const dryvObject = dryv.value

    if (isDryvValidatable(dryvObject[field])) {
      return dryvObject[field]
    }

    const validatable = dryvValidatableValue(
      field,
      dryv,
      session,
      options,
      () => receiver[field],
      (value) => (receiver[field] = value)
    )

    const proxy = options.objectWrapper!(validatable)

    dryvObject[field] = proxy

    return proxy
  }

  function getDryv(model: TModel) {
    if (!_dryv) {
      _dryv = dryvValidatableObject<TModel>(field, session, model, options)
    }

    return _dryv
  }

  function isExcludedField(field: string) {
    if (_excludedFields[field] === undefined) {
      _excludedFields[field] = !!options.excludedFields?.find((regexp) => regexp?.test(field))
    }

    return _excludedFields[field]
  }
}
