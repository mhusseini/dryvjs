import type { IValidator } from '@/types'
import { DryvObjectValidator } from '@/validators/DryvObjectValidator'

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
