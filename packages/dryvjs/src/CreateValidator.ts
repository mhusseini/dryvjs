import type { DryvValidationSession } from '@/DryvValidationSession'
import { DryvOptions } from '@/typings'
import { DryvValidator } from '@/DryvValidator'
import { DryvArrayValidator } from '@/DryvArrayValidator'
import { DryvFieldValidator } from '@/DryvFieldValidator'
import { DryvObjectValidator } from '@/DryvObjectValidator'
import { DryvCompositeValidator } from '@/DryvCompositeValidator'

export function createValidator<TModel extends object>(
  parent: DryvCompositeValidator,
  value: any,
  model: TModel | undefined,
  field: keyof TModel | undefined,
  session: DryvValidationSession,
  options: DryvOptions
): DryvValidator | null {
  if (Array.isArray(value)) {
    return new DryvArrayValidator(value, session, parent, options, field)
  }

  const type = typeof value
  if (type === 'function') {
    return null
  }

  if (value instanceof Object) {
    return new DryvObjectValidator<TModel>(value, session, parent, options, field)
  }

  return new DryvFieldValidator<TModel>(model!, session, parent, options, field!)
}
