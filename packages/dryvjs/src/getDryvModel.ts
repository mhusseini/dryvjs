import { getDryvValidator } from './getDryvValidator'

export function getDryvModel<TModel extends object>(obj: any): TModel | undefined {
  return getDryvValidator<TModel>(obj)?.model
}
