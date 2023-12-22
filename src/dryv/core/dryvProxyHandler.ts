import type { DryvProxy, DryvOptions, DryvValidatable } from './typings'
import { dryvProxy, isDryvProxy } from '.'
import { isDryvValidatable } from '@/dryv'
import { dryvValidatableObject } from './dryvValidatableObject'
import { dryvValidatableValue } from './dryvValidatableValue'

export function dryvProxyHandler<TModel extends object>(
  options: DryvOptions,
  field?: keyof TModel
): ProxyHandler<TModel> {
  const _excludedFields: { [field: string]: boolean } = {}
  let _dryv: DryvValidatable<TModel> | null = null

  return {
    get(target: TModel, fieldSymbol: string | symbol, receiver: any): any {
      const fieldName = String(fieldSymbol)
      if (fieldName === '$dryv') {
        return getDryv(receiver)
      }

      if (isExcludedField(fieldName)) {
        return Reflect.get(target, fieldName, receiver)
      }

      const originalValue = Reflect.get(target, fieldName, receiver)
      const field = fieldName as keyof TModel
      let resultValue

      if (typeof originalValue === 'object') {
        resultValue = ensureObjectProxy(originalValue, field as keyof TModel, receiver)
        if (resultValue !== originalValue) {
          Reflect.set(target, fieldName, resultValue)
        }
      } else if (typeof originalValue !== 'function') {
        ensureValueProxy(field as keyof TModel, target, receiver)
        resultValue = originalValue
      }

      return resultValue
    },

    set(target: TModel, fieldSymbol: string, value: any, receiver: any): boolean {
      const fieldName = String(fieldSymbol)
      if (fieldName === '$dryv') {
        throw new Error('The $dryv property is read-only.')
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
        originalValue.$dryv.parent = undefined
      }

      let targetValue

      if (typeof value === 'object') {
        targetValue = ensureObjectProxy(value, field as keyof TModel, receiver)
      } else {
        ensureValueProxy(field as keyof TModel, target, receiver)
        targetValue = value
      }

      return Reflect.set(target, field, targetValue)
    }
  }

  function ensureObjectProxy(value: any, field: keyof TModel, target: TModel) {
    const proxy: DryvProxy<any> = !isDryvProxy(value) ? dryvProxy(value, options, field) : value

    const dryv = getDryv(target)
    dryv.value[field] = proxy.$dryv.value
    proxy.$dryv.parent = dryv

    return proxy
  }

  function ensureValueProxy(field: keyof TModel, target: TModel, receiver: TModel) {
    const dryv = getDryv(receiver)
    const dryvObject = dryv.value

    if (isDryvValidatable(dryvObject[field])) {
      return dryvObject[field]
    }

    const validatable = dryvValidatableValue(
      field,
      dryv,
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
      _dryv = dryvValidatableObject<TModel>(field, undefined, model, options)
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
