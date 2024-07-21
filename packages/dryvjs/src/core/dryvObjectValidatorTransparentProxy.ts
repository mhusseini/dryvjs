import { DryvFieldValidator, DryvObjectValidator } from '@/core'

export function dryvObjectValidatorTransparentProxy<TModel extends object, TParameters = object>(
  target: DryvObjectValidator<TModel, TParameters>
) {
  return new Proxy<DryvObjectValidator<TModel, TParameters>>(target, {
    ownKeys(target) {
      return target.proxy ? Reflect.ownKeys(target.proxy) : []
    },
    get(target, prop, receiver) {
      const innerValue = Reflect.get(target.fields, prop, receiver)
      return innerValue instanceof DryvObjectValidator ? innerValue.transparentProxy : innerValue
    },
    set(target, prop, value, receiver) {
      const validator = target.fields[prop]
      if (!(validator instanceof DryvFieldValidator)) {
        return Reflect.set(target.fields, prop, value, receiver)
      }

      validator.value = value
      return true
    },
    has(target, key) {
      return !!target.fields[key]
    },
    getOwnPropertyDescriptor(target, key) {
      if (!target.fields) return undefined
      const value = target.fields[key]
      const decriptor = Reflect.getOwnPropertyDescriptor(target.fields, key)
      return value
        ? {
            value: value instanceof DryvObjectValidator ? value.transparentProxy : value,
            writable: value instanceof DryvObjectValidator ? false : decriptor?.writable,
            enumerable: decriptor?.enumerable,
            configurable: decriptor?.configurable
          }
        : undefined
    }
  })
}
