import type { IValidator } from '@/types'
import { DryvObjectValidator } from '@/validators/DryvObjectValidator'

/**
 * Walks a validator tree by dot-separated path segments to locate a specific validator node.
 *
 * @typeParam TModel - The root model type.
 * @param obj - The root validator to start the walk from.
 * @param path - Dot-separated field path (e.g. `"address.city"`).
 * @returns The validator at the given path, or `null` if not found.
 */
export function getValidatorByPath<TModel extends object>(
  obj: IValidator<TModel>,
  path: string
): IValidator<TModel> | null {
  if (!path) {
    return null
  }

  let result: any = obj

  for (const part of path.split('.')) {
    result = result instanceof DryvObjectValidator ? result.fields[part] : result[part]
    if (result === null) {
      return null
    }
  }

  return result
}
