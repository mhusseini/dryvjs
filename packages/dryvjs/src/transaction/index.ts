import type { DryvOptions } from '@/core/typings'
import { defaultDryvOptions } from '@/core/defaultDryvOptions'

export interface DryTransaction<TModel extends object = any> {
  rollback: () => void
  commit: () => void
  model: TModel
  dirty: () => boolean
}

export function dryvTransaction<TModel extends object>(
  model: TModel,
  options?: DryvOptions
): DryTransaction<TModel> {
  options = Object.assign(defaultDryvOptions, options)
  const originalValues = { ...model }
  const originalKeys = Object.keys(model).reduce(
    (acc, key) => {
      acc[key] = true
      return acc
    },
    {} as { [key: string]: boolean }
  )
  ;(model as any).__test = 'transaction'
  const values: TModel = options.objectWrapper!({ ...model })
  const dirty = options.objectWrapper!({ value: false })
  let dirtyFields: { [field: string]: boolean } = {}

  const proxy = new Proxy(model, {
    get(target, prop, receiver) {
      return values[prop as keyof TModel] ?? Reflect.get(target, prop, receiver)
    },
    set(_, fieldName, value) {
      const field = fieldName as keyof TModel
      if (typeof originalValues[field] !== 'object' && typeof value !== 'object') {
        dirtyFields[String(fieldName)] = value !== originalValues[field]
      }
      values[field] = value
      dirty.value = Object.values(dirtyFields).find((x) => x) ?? false
      return true
    }
  })

  // noinspection JSUnusedGlobalSymbols
  return {
    commit() {
      Object.assign(model, values)
      dirtyFields = {}
      dirty.value = false
    },
    rollback() {
      Object.assign(values, model)
      Object.keys(values)
        .filter((key) => !originalKeys[key])
        .forEach((key) => ((values as any)[key] = undefined))
      dirtyFields = {}
      dirty.value = false
    },
    model: proxy,
    dirty() {
      return dirty.value
    }
  }
}
