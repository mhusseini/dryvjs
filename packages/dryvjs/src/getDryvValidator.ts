import { DryvObjectValidator } from '@/DryvObjectValidator'

export function getDryvValidator<TModel extends object>(obj: TModel): DryvObjectValidator<TModel> {
  return obj instanceof DryvObjectValidator ? obj : (obj as any).$validator
}