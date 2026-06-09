import { DryvValidator } from '@/validators/DryvValidator'

/**
 * Extracts a `DryvValidator` from a facade proxy or validator-like object.
 * Checks the `__dryvValidator` marker flag and the `$validator` property.
 *
 * @typeParam TModel - The expected model type.
 * @param obj - The object to extract the validator from.
 * @returns The underlying validator, or `undefined` if not found.
 */
export function getDryvValidator<TModel extends object>(
  obj: unknown
): DryvValidator<TModel> | undefined {
  const candidate = obj as Record<string, unknown> | null | undefined
  if (candidate?.__dryvValidator) {
    return candidate as unknown as DryvValidator<TModel>
  }
  return candidate?.$validator as DryvValidator<TModel> | undefined
}
