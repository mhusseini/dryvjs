import { DryvValidatableArray } from '@/typings'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'
import type { DryvValidator } from '@/DryvValidator'
import { DryvArrayValidator } from '@/DryvArrayValidator'

export function dryvValidatableArray<TModel extends object>(
  validator: DryvArrayValidator<TModel>
): DryvValidatableArray<TModel> {
  return new Proxy<DryvValidator<TModel>[]>(
    validator.childValidators(),
    new DryvTransparentArrayProxyHandler(validator)
  ) as any as DryvValidatableArray<TModel>
}

class DryvTransparentArrayProxyHandler<TModel extends object = any> {
  constructor(private validator: DryvArrayValidator<TModel>) {}

  get(target: DryvValidator<TModel>[], prop: string | symbol) {
    if (!/^\d+$/.test(String(prop))) {
      const maybeFunction = this.validator.proxy[String(prop) as any] as any
      if (typeof maybeFunction === 'function') {
        return maybeFunction.bind(this.validator.proxy)
      }
    }
    const value = (target as any)[prop]
    return value instanceof DryvCompositeValidator ? value.transparentProxy : value
  }
  apply(target: DryvValidator<TModel>[], thisArg: any, argArray: any) {
    return (target as any)[thisArg].apply(target, argArray)
  }
}
