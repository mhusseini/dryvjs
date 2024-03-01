export function getMemberByPath<TModel extends object, TResult = any>(
  obj: TModel,
  path: string | symbol
): TResult | TModel {
  if (!path) {
    return obj
  }
  let result: any = obj
  for (const part of String(path).split('.')) {
    if (result == null) {
      return result
    }
    result = result[part]
  }
  return result as TResult
}
