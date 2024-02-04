import type { DryvProxy } from './typings'

export function isDryvProxy<TModel extends object>(
  model: any | DryvProxy<TModel>
): model is DryvProxy<TModel> {
  return !!(model as DryvProxy<TModel>)?.$dryv
}
