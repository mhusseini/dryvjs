import type {
  DryvObject,
  DryvOptions,
  DryvValidatable,
  DryvValidationResult,
  DryvValidationSession
} from './typings'
import { isDryvValidatable } from '@/dryv'
import { dryvValidatableValue } from '@/dryv/core/dryvValidatableValue'

export function dryvValidatableObject<TModel extends object = any, TValue = any>(
  field: keyof TModel | undefined,
  parent: DryvValidatable | undefined,
  model: TModel,
  options: DryvOptions
): DryvValidatable<any, DryvObject<TModel>> {
  const _value: DryvObject<TModel> = new Proxy(
    {
      $model: model,
      toJSON(): any {
        return { ...this, $model: undefined }
      }
    } as any,
    {
      set(target: TModel, field: string, value: any, receiver: any): boolean {
        return target.hasOwnProperty(field) || isDryvValidatable(value)
          ? Reflect.set(target, field, value)
          : Reflect.set(
              target,
              field,
              dryvValidatableValue(
                field as keyof TModel,
                receiver,
                options,
                () => (model as any)[field],
                (value) => ((model as any)[field] = value)
              )
            )
      }
    }
  )

  const validatable: DryvValidatable<any, DryvObject<TModel>> = options.objectWrapper!({
    _isDryvValidatable: true,
    field,
    text: null,
    group: null,
    status: null,
    required: null,
    get value(): DryvObject<TModel> {
      return _value
    },
    get parent(): DryvValidatable | undefined {
      return parent
    },
    set parent(value: DryvValidatable | undefined) {
      parent = value
    },
    async validate(
      session: DryvValidationSession<TModel>
    ): Promise<DryvValidationResult<TModel> | null> {
      return await session.validateObject(this)
    },
    get path(): string {
      return (parent?.path ? parent.path + '.' : '') + (field ? String(field) : '')
    },
    clear(): void {
      validatable.status = null
      validatable.text = null
      validatable.group = null

      Object.values(_value)
        .filter((v: any) => isDryvValidatable(v))
        .forEach((v: any) => (v as DryvValidatable).clear())
    },
    toJSON(): any {
      return { ...this, parent: undefined, _isDryvValidatable: undefined }
    }
  })

  return validatable
}
