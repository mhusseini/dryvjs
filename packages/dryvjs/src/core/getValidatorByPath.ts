import { DryvValidator } from '@/core/DryvValidator'
import { DryvFieldValidator } from '@/core/DryvFieldValidator'
import { DryvObjectValidator } from '@/core/DryvObjectValidator'

export function getValidatorByPath<TModel extends object>(
  obj: DryvValidator<TModel>,
  path: string
): DryvFieldValidator<TModel> | null {
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