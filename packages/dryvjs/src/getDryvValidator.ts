import { DryvValidator } from '@/DryvValidator'

export function getDryvValidator<TModel extends object>(
  obj: any
): DryvValidator<TModel> | undefined {
  return (obj as any)?.__dryvValidator ? (obj as DryvValidator<TModel>) : (obj as any).$validator
}
