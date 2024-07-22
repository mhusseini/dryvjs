import { DryvFieldValidator, DryvObjectValidator, DryvValidatableObject } from '@/core'

export function dryvValidatableObject<TModel extends object>(
  validator: DryvObjectValidator<TModel>
): DryvValidatableObject<TModel> {
  return new Proxy(
    validator,
    new DryvTransparentProxyHandler<TModel>()
  ) as DryvValidatableObject<TModel>
}

class DryvTransparentProxyHandler<TModel extends object> {
  ownKeys(target: DryvObjectValidator<TModel>) {
    return target.proxy ? Reflect.ownKeys(target.proxy) : []
  }

  get(target: DryvObjectValidator<TModel>, prop: string | symbol, receiver: any) {
    const innerValue = Reflect.get(target.fields, prop, receiver)
    return innerValue instanceof DryvObjectValidator ? innerValue.transparentProxy : innerValue
  }

  set(target: DryvObjectValidator<TModel>, prop: string | symbol, value: any, receiver: any) {
    const validator = target.fields[prop]
    if (!(validator instanceof DryvFieldValidator)) {
      return Reflect.set(target.fields, prop, value, receiver)
    }

    validator.value = value
    return true
  }

  has(target: DryvObjectValidator<TModel>, key: string | symbol) {
    return !!target.fields[key]
  }

  getOwnPropertyDescriptor(target: DryvObjectValidator<TModel>, key: string | symbol) {
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
}
