import { DryvValidator } from '@/validators/DryvValidator'

export function getDryvValidator<TModel extends object>(
  obj: unknown
): DryvValidator<TModel> | undefined {
  const candidate = obj as Record<string, unknown> | null | undefined
  if (candidate?.__dryvValidator) {
    return candidate as unknown as DryvValidator<TModel>
  }
  return candidate?.$validator as DryvValidator<TModel> | undefined
}
