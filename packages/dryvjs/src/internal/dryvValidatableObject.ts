import { DryvObjectValidator, DryvValidatableObject, DryvValidator } from '@/.'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'

export function dryvValidatableObject<TModel extends object>(
  validator: DryvObjectValidator<TModel>
): DryvValidatableObject<TModel> {
  return new Proxy(
    validator,
    new DryvTransparentProxyHandler<TModel>()
  ) as unknown as DryvValidatableObject<TModel>
}

class DryvTransparentProxyHandler<TModel extends object> {
  ownKeys(target: DryvObjectValidator<TModel>) {
    return target.proxy ? Reflect.ownKeys(target.proxy) : []
  }

  get(target: DryvObjectValidator<TModel>, prop: string | symbol) {
    const propName = prop.toString()
    if (propName.startsWith('_') || propName.startsWith('$')) {
      return Reflect.get(target, prop)
    }

    if (prop === '$validator') {
      return target
    }
    const innerValue = target.fields[prop]
    return innerValue instanceof DryvCompositeValidator ? innerValue.transparentProxy : innerValue
  }

  set(target: DryvObjectValidator<TModel>, prop: string | symbol, value: any, receiver: any) {
    const propName = prop.toString()
    if (propName.startsWith('_') || propName.startsWith('$')) {
      return Reflect.set(target, prop, value, receiver)
    }

    const validator = target.fields[prop]
    if (!(validator instanceof DryvValidator)) {
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
